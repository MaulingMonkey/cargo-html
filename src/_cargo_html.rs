#![forbid(unsafe_code)]

mod arguments;      use arguments::*;
mod metadata;       use metadata::*;
mod package_ext;    use package_ext::PackageExt;
mod tools;

use mmrbi::*;

use std::io::Write;



fn main() {
    let args = Arguments::parse_args();
    match args.subcommand {
        _ if args.help                  => help(args),
        Subcommand::HelpGeneric         => help(args),
        Subcommand::Build               => build(args),
        Subcommand::InstallBuildTools   => install_build_tools(args),
    }
}

fn help(args: Arguments) {
    assert!(args.help || args.subcommand == Subcommand::HelpGeneric);

    print!("{}", include_str!("_usage.txt"));
}

fn install_build_tools(args: Arguments) {
    assert!(args.subcommand == Subcommand::InstallBuildTools);

    tools::install_toolchains();
    let _ = tools::find_install_wasm_opt();
}

fn build(args: Arguments) {
    assert!(args.subcommand == Subcommand::Build);

    let metadata = Metadata::from_args(&args);

    // Preinstall tools

    tools::install_toolchains();
    let wasm_opt = tools::find_install_wasm_opt();

    // Build

    let mut any_built = false;

    let target_dir = metadata.target_directory();
    if metadata.selected_packages_wasi().any(|_| true) {
        println!("\u{001B}[30;102m                        Building wasm32-wasi targets                        \u{001B}[0m");

        let mut cmd = Command::parse("cargo build --target=wasm32-wasi").unwrap();
        if let Some(manifest_path) = args.manifest_path.as_ref() {
            cmd.arg("--manifest-path").arg(manifest_path);
        }
    
        for pkg in metadata.selected_packages_wasi() {
            cmd.arg("--package").arg(&pkg.name);
        }
    
        if args.bins        { cmd.arg("--bins"); }
        if args.examples    { cmd.arg("--examples"); }
        // args.cdylibs not supported by `cargo html`s wasm32-wasi builds
    
        for (ty, target) in metadata.selected_targets() {
            match ty {
                TargetType::Bin     => { if !args.bins      { cmd.arg("--bin")      .arg(target); } },
                TargetType::Example => { if !args.examples  { cmd.arg("--example")  .arg(target); } },
                TargetType::Cdylib  => {}, // cdylibs not supported by `cargo html`s wasm32-wasi builds
            }
        }

        for config in args.configs.iter().copied() {
            let mut cmd = cmd.clone();

            match config {
                Config::Debug   => {},
                Config::Release => drop(cmd.arg("--release")),
            }

            status!("Running", "{:?}", cmd);
            cmd.status0().unwrap_or_else(|err| fatal!("{} failed: {}", cmd, err));
            any_built = true;
        }
    }

    if metadata.selected_packages_wasm_pack().any(|_| true) {
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

            for pkg in metadata.selected_packages_wasm_pack() {
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
        for (ty, target) in metadata.selected_targets() {
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
        for (ty, target) in metadata.selected_targets() {
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
