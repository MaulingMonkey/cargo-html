use super::util::*;
use crate::*;

use std::fs::File;
use std::io::{self, BufWriter, Write};
use std::path::*;
use std::time::SystemTime;



const HTML_SCRIPTS_PLACEHOLDER : &'static str = "<!-- SCRIPTS -->";

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

            let mut template_js = String::new();
            if pkg.wasm_bindgen.is_some() {
                let js_dir = target_arch_config_dir.join("js");
                js::inline_wasm_bindgen_bundler_importer(&mut template_js, "__cargo_html_wasmbindgen_bundler_js", &js_dir, target).unwrap_or_else(|err| fatal!("unable to reprocess wasm-bindgen javascript: {}", err));
                template_js.push_str("\r\n");
            }
            template_js.push_str(include_str!("../../template/script.js"));

            let wasm = if pkg.asyncify {
                target_arch_config_dir.join(format!("{}.async.wasm", target))
            } else if pkg.wasm_bindgen.is_some() {
                target_arch_config_dir.join("js").join(format!("{}_bg.wasm", target))
            } else {
                target_arch_config_dir.join(format!("{}.wasm", target))
            };
            generate(pkg, &target_html_dir, target, config, "console", &template_js, &wasm);
        }

        let target_arch_config_dir  = metadata.target_directory().join("wasm32-unknown-unknown").join(config.as_str());
        for (ty, target, pkg) in metadata.selected_targets_cargo_web() {
            let target_arch_config_dir = match ty {
                TargetType::Bin     => target_arch_config_dir.clone(),
                TargetType::Example => target_arch_config_dir.join("examples"),
                TargetType::Cdylib  => continue,
            };
            let package_js = target_arch_config_dir.join(format!("{}.js", target));
            let package_js = std::fs::read_to_string(&package_js).unwrap_or_else(|err| fatal!("unable to read `{}`: {}", package_js.display(), err));
            let package_js = include_str!("../../template/js/cargo-web.js").replace("{PACKAGE_JS}", &package_js);
            let wasm = target_arch_config_dir.join(format!("{}.wasm", target));
            generate(pkg, &target_html_dir, target, config, "basic", &package_js, &wasm);
        }

        let pkg_dir = metadata.target_directory().join("wasm32-unknown-unknown").join(config.as_str()).join("pkg");
        for (ty, target, pkg) in metadata.selected_targets_wasm_pack() {
            match ty {
                TargetType::Bin     => continue,
                TargetType::Example => continue,
                TargetType::Cdylib  => {},
            }
            let lib_name = target.replace("-", "_");
            let package_js = pkg_dir.join(format!("{}.js", lib_name));
            let package_js = std::fs::read_to_string(&package_js).unwrap_or_else(|err| fatal!("unable to read `{}`: {}", package_js.display(), err));
            let package_js = include_str!("../../template/js/wasm-pack.js").replace("{PACKAGE_JS}", &package_js);
            let wasm = pkg_dir.join(format!("{}_bg.wasm", lib_name));
            generate(pkg, &target_html_dir, target, config, "basic", &package_js, &wasm);
        }
    }
}

enum TemplateHtml {
    BuiltIn(&'static str),
    File(PathBuf),
}

fn generate(
    package:            &Package,
    target_html_dir:    &Path,
    target:             &str,
    config:             Config,
    template_html:      &str,
    js_code:            &str,
    wasm:               &Path,
) {
    force_header();
    let target_html = target_html_dir.join(format!("{}.html", target));

    let template_html = match package.template.as_ref().map(|s| s.as_str()).unwrap_or(template_html) {
        "basic"     => TemplateHtml::BuiltIn(include_str!("../../template/html/basic.html")),
        "console"   => TemplateHtml::BuiltIn(include_str!("../../template/html/console.html")),
        "xterm"     => TemplateHtml::BuiltIn(include_str!("../../template/html/xterm.html")),
        file_html   => {
            let lower = file_html.to_ascii_lowercase();
            if !(lower.ends_with(".html") || lower.ends_with(".htm")) {
                fatal!("package `{}` specified an invalid HTML template, {:?}.  Expected \"basic\", \"console\", \"xterm\", or \"some/file.html\".", package.name, file_html);
            }
            TemplateHtml::File(package.directory.join(file_html))
        }
    };

    let mut gen_reasons = Vec::new();
    match file_mod_time(&target_html) {
        None => gen_reasons.push("not yet generated"),
        Some(target_html_mod) => {
            if target_html_mod <= exe_mod_time() { gen_reasons.push("cargo-html updated"); }
            if target_html_mod <= file_mod_time(wasm).unwrap_or(SystemTime::now()) {
                let is_async = wasm.to_string_lossy().to_ascii_lowercase().ends_with(".async.wasm");
                gen_reasons.push(if is_async { "asyncified wasm updated" } else { "source wasm updated" });
            }
            if target_html_mod <= file_mod_time(&package.manifest_path).unwrap_or_else(|| SystemTime::now()) { gen_reasons.push("package manifest updated"); }
            if let TemplateHtml::File(file) = &template_html {
                if target_html_mod <= file_mod_time(&file).unwrap_or(SystemTime::now()) {
                    gen_reasons.push("template updated");
                }
            }
        }
    }

    if gen_reasons.is_empty() {
        status!("Up-to-date", "{}", target_html.display());
        return;
    } else {
        status!("Generating", "{}", target_html.display());
        for reason in gen_reasons.iter().copied() { println!("    \u{001B}[36;1mreason\u{001B}[0m: {}", reason); }
    }

    let wasm = std::fs::read(&wasm).unwrap_or_else(|err| fatal!("unable to read `{}`: {}", wasm.display(), err));
    let wasm = base64::encode(&wasm[..]);

    let template_html_buf;
    let template_html = match template_html {
        TemplateHtml::BuiltIn(s) => s,
        TemplateHtml::File(path) => {
            template_html_buf = std::fs::read_to_string(&path).unwrap_or_else(|err| fatal!("unable to read template `{}` for package `{}`: {}", path.display(), package.name, err));
            template_html_buf.as_str()
        }
    };

    let template_html = template_html
        .replace("{CONFIG}", config.as_str())
        .replace("{TARGET_NAME}", target)
        .replace("<!-- STYLES -->", concat!("<style>\n", include_str!("../../template/css/style.css"), "\n</style>"))
        ;
    let scripts_placeholder_idx = template_html.find(HTML_SCRIPTS_PLACEHOLDER).expect("template missing `<!-- SCRIPTS -->` placeholder");

    fs_write(target_html, |o| {
        let target_wasm = format!("{}.wasm", target);

        write!(o, "{}", &template_html[..scripts_placeholder_idx])?;
        writeln!(o, "<script>")?;
        writeln!(o, "        const CARGO_HTML_SETTINGS = {};", serde_json::to_string(&package.settings.wasi).unwrap())?;
        writeln!(o, "        CARGO_HTML_SETTINGS.env = CARGO_HTML_SETTINGS.env || {{}};")?;
        writeln!(o, "        {}", js_code)?;
        writeln!(o, "        mount_wasm_base64({:?}, {:?});", target_wasm, wasm)?;
        // TODO: mount filesystem
        writeln!(o, "        launch_wasm({:?});", target_wasm)?;
        writeln!(o, "    </script>")?;
        write!(o, "    {}", &template_html[(scripts_placeholder_idx + HTML_SCRIPTS_PLACEHOLDER.len())..])?;
        Ok(())
    }).unwrap_or_else(|err| fatal!("unable to fully write HTML file: {}", err));
}

fn fs_write(path: impl AsRef<Path>, io: impl FnOnce(&mut BufWriter<File>) -> io::Result<()>) -> io::Result<()> {
    let mut o = BufWriter::new(File::create(path)?);
    io(&mut o)
}
