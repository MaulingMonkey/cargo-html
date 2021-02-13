#![forbid(unsafe_code)]

use mmrbi::*;

use std::collections::BTreeSet;
use std::io::Write;
use std::path::PathBuf;



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
    let rustup = Rustup::default().or_die();
    if let Some(toolchain) = rustup.toolchains().active() {
        toolchain.targets().add("wasm32-wasi").or_die();
        toolchain.targets().add("wasm32-unknown-unknown").or_die();
    }

    let wasm_opt = {
        // https://docs.rs/wasm-pack/0.9.1/wasm_pack/cache/fn.get_wasm_pack_cache.html
        // https://docs.rs/wasm-pack/0.9.1/wasm_pack/wasm_opt/fn.find_wasm_opt.html
        // https://docs.rs/wasm-pack/0.9.1/wasm_pack/wasm_opt/fn.run.html
    
        let vers = "version_90";
        let target = if cfg!(windows) {
            "x86-windows"
        } else if cfg!(target_os = "linux") {
            "x86-linux"
        } else {
            fatal!("pre-built wasm-opt binaries (required by `cargo html`) are currently only available for windows and linux hosts");
        };

        let cache = binary_install::Cache::new("wasm-pack").unwrap_or_else(|err| fatal!("unable to get wasm-pack cache: {}", err)); // reuse wasm-pack's binary cache
        let url = format!("https://github.com/WebAssembly/binaryen/releases/download/{vers}/binaryen-{vers}-{target}.tar.gz", vers = vers, target = target);
        let download = cache.download(true, "wasm-opt", &["wasm-opt"], &url).unwrap_or_else(|err| fatal!("error downloading wasm-opt: {}", err)).unwrap();
        download.binary("wasm-opt").unwrap_or_else(|err| fatal!("error getting wasm-opt binary from download: {}", err))
    };

    let mut args = std::env::args();
    let _cargo  = args.next();
    let _html   = args.next();

    let mut workspace = false;
    let mut packages = BTreeSet::new();

    let mut bins = false;
    let mut examples = false;
    let mut all_targets = false;

    let mut manifest_path = None;
    let mut targets  = BTreeSet::<(TargetType, String)>::new();
    let mut configs  = BTreeSet::<Config>::new();
    while let Some(arg) = args.next() {
        match &*arg {
            "--bin" => {
                if let Some(bin) = args.next() {
                    if !targets.insert((TargetType::Bin, bin.clone())) {
                        warning!("bin `{}` specified multiple times", bin);
                    }
                } else {
                    fatal!("expected a bin name after `{}`", arg);
                }
            },
            "--example" => {
                if let Some(example) = args.next() {
                    if !targets.insert((TargetType::Example, example.clone())) {
                        warning!("example `{}` specified multiple times", example);
                    }
                } else {
                    fatal!("expected a example name after `{}`", arg);
                }
            },
            "-p" | "--package" => {
                if let Some(pkg) = args.next() {
                    if !packages.insert(pkg.clone()) {
                        warning!("package `{}` specified multiple times", pkg);
                    }
                } else {
                    fatal!("expected a package name after `{}`", arg);
                }
            },
            "--manifest-path" => {
                if let Some(path) = args.next() {
                    if manifest_path.is_some() {
                        warning!("--manifest-path specified multiple times");
                    }
                    manifest_path = Some(PathBuf::from(path));
                } else {
                    fatal!("expected a path after `{}`", arg);
                }
            },
            "--debug"       => { if !configs.insert(Config::Debug)   { warning!("{} specified multiple times", arg); } },
            "--release"     => { if !configs.insert(Config::Release) { warning!("{} specified multiple times", arg); } },
            "--workspace"   => { if workspace   { warning!("{} specified multiple times", arg); } else { workspace      = true; } },
            "--bins"        => { if bins        { warning!("{} specified multiple times", arg); } else { bins           = true; } },
            "--examples"    => { if examples    { warning!("{} specified multiple times", arg); } else { examples       = true; } },
            "--all-targets" => { if all_targets { warning!("{} specified multiple times", arg); } else { all_targets    = true; } },
            // TODO: --exclude
            // TODO: features?
            other           => fatal!("unexpected argument `{}`", other),
        }
    }

    let mut metadata = cargo_metadata::MetadataCommand::new();
    if let Some(manifest_path) = manifest_path.as_ref() {
        metadata.manifest_path(manifest_path);
    }
    let mut metadata : cargo_metadata::Metadata = metadata.exec().unwrap_or_else(|err| fatal!("failed to run/parse `cargo metadata`: {}", err));
    let workspace_members = std::mem::take(&mut metadata.workspace_members).into_iter().collect::<BTreeSet<_>>();
    metadata.packages.retain(|pkg| workspace_members.contains(&pkg.id));

    for pkg in packages.iter() {
        if !metadata.packages.iter().any(|p| p.name == *pkg) {
            fatal!("no such package `{}` in workspace", pkg);
        }
    }

    // defaults

    if workspace {
        for package in metadata.packages.iter().filter(|p| p.is_html()) {
            packages.insert(package.name.clone());
        }
    } else if packages.is_empty() {
        // neither --workspace nor any --package s specified
        if let Some(root) = metadata.root_package() {
            if root.is_html() {
                packages.insert(root.name.clone());
            }
        }
        if packages.is_empty() {
            // no root, or root isn't an HTML project
            // TODO: support workspace default members?
            for package in metadata.packages.iter().filter(|p| p.is_html()) {
                packages.insert(package.name.clone());
            }
        }
    }

    // Create command *before* inserting defaults for HTML page generation - our defaults should match `build`s default behavior
    let mut cargo_build_wasi = Command::parse("cargo build --target=wasm32-wasi").unwrap();
    if let Some(manifest_path) = manifest_path.as_ref() {
        cargo_build_wasi.arg("--manifest-path").arg(manifest_path);
    }

    for pkg in metadata.packages.iter() {
        if packages.contains(&pkg.name) && pkg.is_wasi() {
            cargo_build_wasi.arg("--package").arg(&pkg.name);
        }
    }

    if all_targets  { cargo_build_wasi.arg("--all-targets"); }
    if bins         { cargo_build_wasi.arg("--bins"); }
    if examples     { cargo_build_wasi.arg("--examples"); }

    bins        |= all_targets;
    examples    |= all_targets;

    for (ty, target) in targets.iter() {
        match ty {
            TargetType::Bin     => { if !bins       { cargo_build_wasi.arg("--bin")      .arg(target); } },
            TargetType::Example => { if !examples   { cargo_build_wasi.arg("--example")  .arg(target); } },
        }
    }

    // match to cmd defaults

    if targets.is_empty() && !bins && !examples {
        bins = true;
        // `cargo build` doesn't build examples by default?
    }

    if bins || examples {
        for pkg in metadata.packages.iter() {
            if !packages.contains(&pkg.name) { continue; }
            for target in pkg.targets.iter() {
                for crate_type in target.crate_types.iter() {
                    match crate_type.as_str() {
                        "bin"       if bins     => drop(targets.insert((TargetType::Bin,     target.name.clone()))),
                        "example"   if examples => drop(targets.insert((TargetType::Example, target.name.clone()))),
                        //"test"      => ...,
                        //"bench"     => ...,
                        //"lib"       => ...,
                        //"rlib"      => ...,
                        //"dylib"     => ...,
                        _other => {},
                    }
                }
            }
        }
    }

    let mut any_built = false;

    if configs.is_empty() {
        configs.insert(Config::Debug);
    }

    let target_dir = metadata.workspace_root.join("target");

    let pkg_filter = |p: &cargo_metadata::Package| packages.contains(&p.name) && p.is_wasi();
    if metadata.packages.iter().any(pkg_filter) {
        println!("\u{001B}[30;102m                        Building wasm32-wasi targets                        \u{001B}[0m");

        for config in configs.iter().copied() {
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

    let pkg_filter = |p: &cargo_metadata::Package| packages.contains(&p.name) && p.is_wasm_pack();
    if metadata.packages.iter().any(pkg_filter) {
        println!("\u{001B}[30;102m                         Building wasm-pack targets                         \u{001B}[0m");

        for config in configs.iter().copied() {
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

    for config in configs.iter().copied() {
        let target_arch_config_dir = target_dir.join("wasm32-wasi").join(config.as_str());
        for (ty, target) in targets.iter() {
            let target_arch_config_dir = match ty {
                TargetType::Bin     => target_arch_config_dir.clone(),
                TargetType::Example => target_arch_config_dir.join("examples"),
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
        for pkg in metadata.packages.iter().filter(|p| packages.contains(&p.name) && p.is_wasm_pack()) {
            let lib_name = pkg.name.replace("-", "_");
            let package_js = pkg_dir.join(format!("{}.js", lib_name));
            let package_js = std::fs::read_to_string(&package_js).unwrap_or_else(|err| fatal!("unable to read `{}`: {}", package_js.display(), err));
            let template_html = include_str!("../template/wasm-pack.html")
                .replace("{CONFIG}", config.as_str())
                .replace("{CRATE_NAME}", &pkg.name)
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

#[derive(Clone, Copy, Debug, PartialEq, Eq, PartialOrd, Ord, Hash)]
enum Config {
    Debug,
    Release,
}

impl Config {
    pub fn as_str(&self) -> &str {
        match self {
            Config::Debug   => "debug",
            Config::Release => "release",
        }
    }
}

#[derive(Clone, Copy, Debug, PartialEq, Eq, PartialOrd, Ord, Hash)]
enum TargetType {
    Bin,
    Example,
}
