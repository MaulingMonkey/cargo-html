#![forbid(unsafe_code)]

mod arguments;  use arguments::*;
mod tools;

use mmrbi::*;

use std::collections::BTreeSet;
use std::io::Write;



trait PackageExt {
    fn is_html(&self) -> bool;
    fn is_wasi(&self) -> bool;
    fn is_wasm_pack(&self) -> bool;
}

impl PackageExt for cargo_metadata::Package {
    fn is_html(&self) -> bool {
        self.metadata.get("html").map_or(true, |html| html != false)
    }

    fn is_wasi(&self) -> bool {
        self.is_html() && self.targets.iter().any(|t| t.crate_types.iter().any(|ct| ct == "bin" || ct == "example"))
    }

    fn is_wasm_pack(&self) -> bool {
        self.is_html() && self.targets.iter().any(|t| t.crate_types.iter().any(|ct| ct == "cdylib")) && self.dependencies.iter().any(|d| d.name == "wasm-bindgen")
    }
}

fn main() {
    let mut args = Arguments::parse_args();

    match args.subcommand {
        Subcommand::HelpGeneric => {
            print!("{}", include_str!("_usage.txt"));
            return;
        },
        _ if args.help => {
            print!("{}", include_str!("_usage.txt"));
            return;
        },
        Subcommand::Build => {},
    }

    let mut metadata = cargo_metadata::MetadataCommand::new();
    if let Some(manifest_path) = args.manifest_path.as_ref() {
        metadata.manifest_path(manifest_path);
    }
    let mut metadata : cargo_metadata::Metadata = metadata.exec().unwrap_or_else(|err| fatal!("failed to run/parse `cargo metadata`: {}", err));
    let workspace_members = std::mem::take(&mut metadata.workspace_members).into_iter().collect::<BTreeSet<_>>();
    metadata.packages.retain(|pkg| workspace_members.contains(&pkg.id));

    for pkg in args.packages.iter() {
        if !metadata.packages.iter().any(|p| p.name == *pkg) {
            fatal!("no such package `{}` in workspace", pkg);
        }
    }

    // defaults

    if args.workspace {
        for package in metadata.packages.iter().filter(|p| p.is_html()) {
            args.packages.insert(package.name.clone());
        }
    } else if args.packages.is_empty() {
        // neither --workspace nor any --package s specified
        if let Some(root) = metadata.root_package() {
            if root.is_html() {
                args.packages.insert(root.name.clone());
            }
        }
        if args.packages.is_empty() {
            // no root, or root isn't an HTML project
            // TODO: support workspace default members?
            for package in metadata.packages.iter().filter(|p| p.is_html()) {
                args.packages.insert(package.name.clone());
            }
        }
    }

    // Create command *before* inserting defaults for HTML page generation - our defaults should match `build`s default behavior
    let mut cargo_build_wasi = Command::parse("cargo build --target=wasm32-wasi").unwrap();
    if let Some(manifest_path) = args.manifest_path.as_ref() {
        cargo_build_wasi.arg("--manifest-path").arg(manifest_path);
    }

    for pkg in metadata.packages.iter() {
        if args.packages.contains(&pkg.name) && pkg.is_wasi() {
            cargo_build_wasi.arg("--package").arg(&pkg.name);
        }
    }

    if args.bins        { cargo_build_wasi.arg("--bins"); }
    if args.examples    { cargo_build_wasi.arg("--examples"); }
    // args.cdylibs not supported by `cargo html`s wasm32-wasi builds

    for (ty, target) in args.targets.iter() {
        match ty {
            TargetType::Bin     => { if !args.bins      { cargo_build_wasi.arg("--bin")      .arg(target); } },
            TargetType::Example => { if !args.examples  { cargo_build_wasi.arg("--example")  .arg(target); } },
            TargetType::Cdylib  => {}, // cdylibs not supported by `cargo html`s wasm32-wasi builds
        }
    }

    // match to cmd defaults

    for pkg in metadata.packages.iter() {
        if !args.packages.contains(&pkg.name) { continue; }
        for target in pkg.targets.iter() {
            for crate_type in target.crate_types.iter() {
                match crate_type.as_str() {
                    "bin"       if args.bins     => drop(args.targets.insert((TargetType::Bin,     target.name.clone()))),
                    "example"   if args.examples => drop(args.targets.insert((TargetType::Example, target.name.clone()))),
                    "cdylib"    if args.cdylibs  => drop(args.targets.insert((TargetType::Cdylib,  target.name.clone()))),
                    //"test"      => ...,
                    //"bench"     => ...,
                    //"lib"       => ...,
                    //"rlib"      => ...,
                    //"dylib"     => ...,
                    _other      => {},
                }
            }
        }
    }

    let mut any_built = false;

    // Preinstall tools

    tools::install_toolchains();
    let wasm_opt = tools::find_install_wasm_opt();

    // Build

    let target_dir = metadata.workspace_root.join("target");

    let pkg_filter = |p: &cargo_metadata::Package| args.packages.contains(&p.name) && p.is_wasi();
    if metadata.packages.iter().any(pkg_filter) {
        println!("\u{001B}[30;102m                        Building wasm32-wasi targets                        \u{001B}[0m");

        for config in args.configs.iter().copied() {
            let mut cmd = cargo_build_wasi.clone();

            match config {
                Config::Debug   => {},
                Config::Release => drop(cmd.arg("--release")),
            }

            status!("Running", "{:?}", cmd);
            cmd.status0().unwrap_or_else(|err| fatal!("{} failed: {}", cmd, err));
            any_built = true;
        }
    }

    let pkg_filter = |p: &cargo_metadata::Package| args.packages.contains(&p.name) && p.is_wasm_pack();
    if metadata.packages.iter().any(pkg_filter) {
        println!("\u{001B}[30;102m                         Building wasm-pack targets                         \u{001B}[0m");

        for config in args.configs.iter().copied() {
            let mut cmd = Command::new("wasm-pack");
            cmd.arg("build");
            cmd.arg("--no-typescript"); // *.d.ts defs are pointless for bundled HTML files
            cmd.arg("--target").arg("no-modules");
            cmd.arg("--out-dir").arg(target_dir.join("wasm32-unknown-unknown").join(config.as_str()).join("pkg"));
            match config {
                Config::Debug   => drop(cmd.arg("--dev")),
                Config::Release => drop(cmd.arg("--release")),
            }

            for pkg in metadata.packages.iter() {
                if !pkg.is_wasm_pack() { continue; }

                let mut dir = pkg.manifest_path.clone();
                dir.pop();

                let mut cmd = cmd.clone();
                cmd.current_dir(dir);
                status!("Running", "{} for `{}`", cmd, pkg.name);
                cmd.status0().unwrap_or_else(|err| fatal!("{} failed: {}", cmd, err));
                any_built = true;
            }
        }
    }

    if !any_built {
        fatal!("no selected packages contain any bin/example targets for `cargo html` to build");
    }

    println!("\u{001B}[30;102m                            Bundling HTML pages                             \u{001B}[0m");

    let script_placeholder  = "\"{BASE64_WASM32}\"";

    for config in args.configs.iter().copied() {
        let target_arch_config_dir = target_dir.join("wasm32-wasi").join(config.as_str());
        for (ty, target) in args.targets.iter() {
            let target_arch_config_dir = match ty {
                TargetType::Bin     => target_arch_config_dir.clone(),
                TargetType::Example => target_arch_config_dir.join("examples"),
                TargetType::Cdylib  => continue, // XXX?
            };
            let template_js   = concat!("<script>\n", include_str!("../template/script.js"), "\n</script>");
            let template_html = include_str!("../template/console-crate.html")
                .replace("{CONFIG}", config.as_str())
                .replace("{CRATE_NAME}", &target)
                .replace("<script src=\"script.js\"></script>", template_js);
            let base64_wasm32_idx = template_html.find(script_placeholder).expect("template missing {BASE64_WASM32}");

            let target_wasm_sync = target_arch_config_dir.join(format!("{}.wasm", target));
            let target_wasm = target_arch_config_dir.join(format!("{}.async.wasm", target));
            let mut asyncify = Command::new(&wasm_opt);
            asyncify.arg("--asyncify").arg(&target_wasm_sync).arg("--output").arg(&target_wasm);
            status!("Running", "{}", asyncify);
            asyncify.status0().or_die();

            let target_wasm = std::fs::read(&target_wasm).unwrap_or_else(|err| fatal!("unable to read `{}`: {}", target_wasm.display(), err));
            let target_wasm = base64::encode(&target_wasm[..]);

            let target_html = target_arch_config_dir.join(format!("{}.html", target));
            status!("Generating", "{}", target_html.display());
            mmrbi::fs::write_if_modified_with(target_html, |o| {
                write!(o, "{}", &template_html[..base64_wasm32_idx])?;
                write!(o, "{:?}", target_wasm)?;
                write!(o, "{}", &template_html[(base64_wasm32_idx + script_placeholder.len())..])?;
                Ok(())
            }).unwrap_or_else(|err| fatal!("unable to fully write HTML file: {}", err));
        }

        let target_arch_config_dir  = target_dir.join("wasm32-unknown-unknown").join(config.as_str());
        let pkg_dir                 = target_arch_config_dir.join("pkg");
        for (ty, target) in args.targets.iter() {
            let target_arch_config_dir = match ty {
                TargetType::Bin     => continue,
                TargetType::Example => continue,
                TargetType::Cdylib  => &target_arch_config_dir,
            };
            let lib_name = target.replace("-", "_");
            let package_js = pkg_dir.join(format!("{}.js", lib_name));
            let package_js = std::fs::read_to_string(&package_js).unwrap_or_else(|err| fatal!("unable to read `{}`: {}", package_js.display(), err));
            let template_html = include_str!("../template/wasm-pack.html")
                .replace("{CONFIG}", config.as_str())
                .replace("{CRATE_NAME}", target)
                .replace("{PACKAGE_JS}", &package_js);
            let base64_wasm32_idx = template_html.find(script_placeholder).expect("template missing {BASE64_WASM32}");

            let wasm = pkg_dir.join(format!("{}_bg.wasm", lib_name));
            //let wasm = target_arch_config_dir.join(format!("{}.wasm", lib_name));
            let wasm = std::fs::read(&wasm).unwrap_or_else(|err| fatal!("unable to read `{}`: {}", wasm.display(), err));
            let wasm = base64::encode(&wasm[..]);

            let target_html = target_arch_config_dir.join(format!("{}.html", lib_name));
            status!("Generating", "{}", target_html.display());
            mmrbi::fs::write_if_modified_with(target_html, |o| {
                write!(o, "{}", &template_html[..base64_wasm32_idx])?;
                write!(o, "{:?}", wasm)?;
                write!(o, "{}", &template_html[(base64_wasm32_idx + script_placeholder.len())..])?;
                Ok(())
            }).unwrap_or_else(|err| fatal!("unable to fully write HTML file: {}", err));
        }
    }
}
