use super::util::*;
use crate::*;

use std::io::Write;
use std::path::*;



const BASE64_WASM32_STR : &'static str = "\"{BASE64_WASM32}\"";

pub(crate) fn pages(args: &Arguments, metadata: &Metadata) {
    header("Building HTML pages");

    for config in args.configs.iter().copied() {
        let target_html_dir = metadata.target_directory().join("cargo-html").join(config.as_str());
        std::fs::create_dir_all(&target_html_dir).unwrap_or_else(|err| fatal!("unable to create `{}`: {}", target_html_dir.display(), err));

        let target_arch_config_dir = metadata.target_directory().join("wasm32-wasi").join(config.as_str());
        for (ty, target, pkg) in metadata.selected_targets_wasi() {
            let target_arch_config_dir = match ty {
                TargetType::Bin     => target_arch_config_dir.clone(),
                TargetType::Example => target_arch_config_dir.join("examples"),
                TargetType::Cdylib  => continue, // XXX?
            };

            let mut template_js = String::from("<script>\r\n");
            if pkg.wasm_bindgen.is_some() {
                let js_dir = target_arch_config_dir.join("js");
                js::inline_wasm_bindgen_bundler_importer(&mut template_js, "__cargo_html_wasmbindgen_bundler_js", &js_dir, target).unwrap_or_else(|err| fatal!("unable to reprocess wasm-bindgen javascript: {}", err));
                template_js.push_str("\r\n");
            }
            template_js.push_str(include_str!("../../template/script.js"));
            template_js.push_str("\r\n</script>");

            let wasm = target_arch_config_dir.join(format!("{}.async.wasm", target));
            generate(&target_html_dir, target, config, include_str!("../../template/console-crate.html"), "<script src=\"script.js\"></script>", &template_js, &wasm);
            //generate(&target_html_dir, target, config, include_str!("../../template/xterm-crate.html"), "<script src=\"script.js\"></script>", &template_js, &wasm);
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
            let wasm = target_arch_config_dir.join(format!("{}.wasm", target));
            generate(&target_html_dir, target, config, include_str!("../../template/cargo-web.html"), "{PACKAGE_JS}", &package_js, &wasm);
        }

        let pkg_dir = metadata.target_directory().join("wasm32-unknown-unknown").join(config.as_str()).join("pkg");
        for (ty, target, _pkg) in metadata.selected_targets_wasm_pack() {
            match ty {
                TargetType::Bin     => continue,
                TargetType::Example => continue,
                TargetType::Cdylib  => {},
            }
            let lib_name = target.replace("-", "_");
            let package_js = pkg_dir.join(format!("{}.js", lib_name));
            let package_js = std::fs::read_to_string(&package_js).unwrap_or_else(|err| fatal!("unable to read `{}`: {}", package_js.display(), err));
            let wasm = pkg_dir.join(format!("{}_bg.wasm", lib_name));
            generate(&target_html_dir, target, config, include_str!("../../template/wasm-pack.html"), "{PACKAGE_JS}", &package_js, &wasm);
        }
    }
}

fn generate(
    target_html_dir:    &Path,
    target:             &str,
    config:             Config,
    template_html:      &str,
    js_placeholder:     &str,
    js_code:            &str,
    wasm:               &Path,
) {
    let target_html = target_html_dir.join(format!("{}.html", target));
    status!("Generating", "{}", target_html.display());

    let wasm = std::fs::read(&wasm).unwrap_or_else(|err| fatal!("unable to read `{}`: {}", wasm.display(), err));
    let wasm = base64::encode(&wasm[..]);

    let template_html = template_html
        .replace("{CONFIG}", config.as_str())
        .replace("{TARGET_NAME}", target)
        .replace(js_placeholder, js_code);

    let base64_wasm32_idx = template_html.find(BASE64_WASM32_STR).expect("template missing {BASE64_WASM32}");

    mmrbi::fs::write_if_modified_with(target_html, |o| {
        write!(o, "{}", &template_html[..base64_wasm32_idx])?;
        write!(o, "{:?}", wasm)?;
        write!(o, "{}", &template_html[(base64_wasm32_idx + BASE64_WASM32_STR.len())..])?;
        Ok(())
    }).unwrap_or_else(|err| fatal!("unable to fully write HTML file: {}", err));
}