#![forbid(unsafe_code)]

mod arguments;      use arguments::*;
#[path = "build/_build.rs"] mod build;
mod js;
mod metadata;       use metadata::*;
mod tools;

use mmrbi::*;

use std::io::Write;

const HEADER_W : usize = 76;



macro_rules! header {
    ( $($tt:tt)* ) => {
        println!("\u{001B}[30;102m{:^1$}\u{001B}[0m", format!($($tt)*), HEADER_W);
    };
}

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
    // wasm_bindgen would be nice to install, but annoyingly we need to match whatever the crate depends on! lame!
    tools::find_install_wasm_opt();
    tools::find_install_wasm_pack();
    tools::find_install_cargo_web();
}

fn build(args: Arguments) {
    assert!(args.subcommand == Subcommand::Build);

    let metadata = Metadata::from_args(&args);

    // Preinstall tools

    tools::install_toolchains();
    let wasm_opt    = tools::find_install_wasm_opt();

    // Build

    let wasm_built
        = build::wasm::wasi_targets(&args, &metadata)
        | build::wasm::cargo_web_targets(&args, &metadata)
        | build::wasm::wasm_pack_targets(&args, &metadata)
        ;

    if !wasm_built { fatal!("no selected packages contain any bin/example targets for `cargo html` to build"); }

    header!("Building HTML pages");

    let script_placeholder = "\"{BASE64_WASM32}\"";

    for config in args.configs.iter().copied() {
        let target_arch_config_dir = metadata.target_directory().join("wasm32-wasi").join(config.as_str());
        for (ty, target, pkg) in metadata.selected_targets_wasi() {
            let target_arch_config_dir = match ty {
                TargetType::Bin     => target_arch_config_dir.clone(),
                TargetType::Example => target_arch_config_dir.join("examples"),
                TargetType::Cdylib  => continue, // XXX?
            };
            let js_dir = target_arch_config_dir.join("js");

            let mut template_js = String::from("<script>\r\n");
            if pkg.wasm_bindgen.is_some() {
                js::inline_wasm_bindgen_bundler_importer(&mut template_js, "__cargo_html_wasmbindgen_bundler_js", &js_dir, target).unwrap_or_else(|err| fatal!("unable to reprocess wasm-bindgen javascript: {}", err));
                template_js.push_str("\r\n");
            }
            template_js.push_str(include_str!("../template/script.js"));
            template_js.push_str("\r\n</script>");

            let template_html = include_str!("../template/console-crate.html")
                .replace("{CONFIG}", config.as_str())
                .replace("{TARGET_NAME}", &target)
                .replace("<script src=\"script.js\"></script>", &template_js);
            let base64_wasm32_idx = template_html.find(script_placeholder).expect("template missing {BASE64_WASM32}");

            let target_wasm_sync = if pkg.wasm_bindgen.is_some() {
                js_dir.join(format!("{}_bg.wasm", target))
            } else {
                target_arch_config_dir.join(format!("{}.wasm", target))
            };
            let target_wasm = target_arch_config_dir.join(format!("{}.async.wasm", target));
            let mut asyncify = wasm_opt.clone();
            match config {
                Config::Debug => {
                    asyncify.arg("--debuginfo");
                },
                Config::Release => {
                    asyncify.arg("--debuginfo");
                    asyncify.arg("-O4");
                }
            }
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

        let target_arch_config_dir  = metadata.target_directory().join("wasm32-unknown-unknown").join(config.as_str());
        for (ty, target, _pkg) in metadata.selected_targets_cargo_web() {
            let target_arch_config_dir = match ty {
                TargetType::Bin     => target_arch_config_dir.clone(),
                TargetType::Example => target_arch_config_dir.join("examples"),
                TargetType::Cdylib  => continue,
            };
            let package_js = target_arch_config_dir.join(format!("{}.js", target));
            let package_js = std::fs::read_to_string(&package_js).unwrap_or_else(|err| fatal!("unable to read `{}`: {}", package_js.display(), err));
            let template_html = include_str!("../template/cargo-web.html")
                .replace("{CONFIG}", config.as_str())
                .replace("{TARGET_NAME}", target)
                .replace("{PACKAGE_JS}", &package_js);
            let base64_wasm32_idx = template_html.find(script_placeholder).expect("template missing {BASE64_WASM32}");

            let wasm = target_arch_config_dir.join(format!("{}.wasm", target));
            let wasm = std::fs::read(&wasm).unwrap_or_else(|err| fatal!("unable to read `{}`: {}", wasm.display(), err));
            let wasm = base64::encode(&wasm[..]);

            let target_html = target_arch_config_dir.join(format!("{}.html", target));
            status!("Generating", "{}", target_html.display());
            mmrbi::fs::write_if_modified_with(target_html, |o| {
                write!(o, "{}", &template_html[..base64_wasm32_idx])?;
                write!(o, "{:?}", wasm)?;
                write!(o, "{}", &template_html[(base64_wasm32_idx + script_placeholder.len())..])?;
                Ok(())
            }).unwrap_or_else(|err| fatal!("unable to fully write HTML file: {}", err));
        }

        let target_arch_config_dir  = metadata.target_directory().join("wasm32-unknown-unknown").join(config.as_str());
        let pkg_dir                 = target_arch_config_dir.join("pkg");
        for (ty, target, _pkg) in metadata.selected_targets_wasm_pack() {
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
                .replace("{TARGET_NAME}", target)
                .replace("{PACKAGE_JS}", &package_js);
            let base64_wasm32_idx = template_html.find(script_placeholder).expect("template missing {BASE64_WASM32}");

            let wasm = pkg_dir.join(format!("{}_bg.wasm", lib_name));
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
