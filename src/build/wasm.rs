use super::util::*;
use crate::*;

use std::time::SystemTime;



pub(crate) fn targets(args: &Arguments, metadata: &Metadata) -> bool {
    wasip1_targets(args, metadata) |
    unk2_targets(args, metadata) |
    cargo_web_targets(args, metadata) |
    wasm_pack_targets(args, metadata)
}

fn wasip1_targets(args: &Arguments, metadata: &Metadata) -> bool {
    let wasm32_wasip1 = crate::tools::wasm32_wasip1_target().unwrap_or("wasm32-wasip1");
    header(format!("Building {wasm32_wasip1} targets"));

    let mut cmd = Command::new("cargo");
    cmd.arg("build");
    cmd.arg(format!("--target={wasm32_wasip1}"));
    if let Some(manifest_path) = args.manifest_path.as_ref() {
        cmd.arg("--manifest-path").arg(manifest_path);
    }

    let mut any_packages = false;
    for pkg in metadata.selected_packages_wasi() {
        cmd.arg("--package").arg(&pkg.name);
        any_packages = true;
    }
    if !any_packages { return false; }

    if args.bins        { cmd.arg("--bins"); }
    if args.examples    { cmd.arg("--examples"); }
    // args.cdylibs not supported by `cargo html`s wasm32-wasip1 builds

    for (ty, target, _pkg) in metadata.selected_targets_wasi() {
        match ty {
            TargetType::Bin     => { if !args.bins      { cmd.arg("--bin")      .arg(target); } },
            TargetType::Example => { if !args.examples  { cmd.arg("--example")  .arg(target); } },
            TargetType::Cdylib  => {}, // cdylibs not supported by `cargo html`s wasm32-wasip1 builds
        }
    }

    for config in args.configs.iter().copied() {
        let mut cmd = cmd.clone();

        match config {
            Config::Debug   => {},
            Config::Release => drop(cmd.arg("--release")),
        }

        run(cmd);
    }

    any_this_header()
}

fn unk2_targets(args: &Arguments, metadata: &Metadata) -> bool {
    header("Building wasm32-unknown-unknown targets");

    let mut cmd = Command::parse("cargo build --target=wasm32-unknown-unknown").unwrap();
    if let Some(manifest_path) = args.manifest_path.as_ref() {
        cmd.arg("--manifest-path").arg(manifest_path);
    }

    let mut any_packages = false;
    for pkg in metadata.selected_packages_unk2() {
        cmd.arg("--package").arg(&pkg.name);
        any_packages = true;
    }
    if !any_packages { return false; }

    if args.bins        { cmd.arg("--bins"); }
    if args.examples    { cmd.arg("--examples"); }
    // args.cdylibs not supported by `cargo html`s generic wasm32-unknown-unknown builds

    for (ty, target, _pkg) in metadata.selected_targets_unk2() {
        match ty {
            TargetType::Bin     => { if !args.bins      { cmd.arg("--bin")      .arg(target); } },
            TargetType::Example => { if !args.examples  { cmd.arg("--example")  .arg(target); } },
            TargetType::Cdylib  => {}, // cdylibs not supported by `cargo html`s generic wasm32-unknown-unknown builds
        }
    }

    for config in args.configs.iter().copied() {
        let mut cmd = cmd.clone();

        match config {
            Config::Debug   => {},
            Config::Release => drop(cmd.arg("--release")),
        }

        run(cmd);
    }

    for config in args.configs.iter().copied() {
        let target_arch_config = metadata.target_directory().join("wasm32-unknown-unknown").join(config.as_str());
        let js_dir = target_arch_config.join("js");

        for (ty, target, pkg) in metadata.selected_targets_unk2() {
            let target_arch_config = match ty {
                TargetType::Bin     => target_arch_config.clone(),
                TargetType::Example => target_arch_config.join("examples"),
                TargetType::Cdylib  => continue, // XXX?
            };

            let wasm_bindgen_version = match pkg.wasm_bindgen.as_ref() {
                None => continue, // no wasm bindgen dependency
                Some(v) => v.to_string(),
            };

            let mut cmd = tools::find_install_wasm_bindgen(&wasm_bindgen_version);
            if config == Config::Debug { cmd.arg("--debug"); }
            cmd.arg("--target").arg("bundler");
            cmd.arg("--no-typescript");
            cmd.arg("--out-dir").arg(&js_dir);
            cmd.arg(target_arch_config.join(format!("{}.wasm", target)));
            run(cmd);
        }
    }

    any_this_header()
}

fn cargo_web_targets(args: &Arguments, metadata: &Metadata) -> bool {
    header("Building cargo-web targets");

    let mut force_1_47_0 = false;

    for config in args.configs.iter().copied() {
        for pkg in metadata.selected_packages_cargo_web() {
            if force_header() {
                let rustc_ver = mmrbi::rustc::version().unwrap_or_else(|err| fatal!("unable to determine rustc version: {}", err));
                if rustc_ver.is_at_least(1, 48, 0) {
                    warning!("stdweb breaks due to undefined behavior on rustc 1.48.0+, will attempt to force 1.47.0: https://github.com/koute/stdweb/issues/411");
                    force_1_47_0 = true;
                }
            }

            let mut cmd = tools::find_install_cargo_web();
            if force_1_47_0 {
                cmd = Command::new("cargo");
                cmd.arg("+1.47.0");
                cmd.arg("web");
            }
            cmd.current_dir(&pkg.directory);
            cmd.arg("build");
            cmd.arg("--target").arg("wasm32-unknown-unknown");
            cmd.arg("--runtime").arg("standalone");
            match config {
                Config::Debug   => {},
                Config::Release => drop(cmd.arg("--release")),
            }
            run(cmd);
        }
    }

    any_this_header()
}

fn wasm_pack_targets(args: &Arguments, metadata: &Metadata) -> bool {
    header("Building wasm-pack targets");

    for config in args.configs.iter().copied() {
        for (ty, _target, pkg) in metadata.selected_targets_wasm_pack() {
            match ty {
                TargetType::Bin => continue,
                TargetType::Example => continue,
                TargetType::Cdylib => {},
            }
            let mut cmd = tools::find_install_wasm_pack();
            cmd.current_dir(&pkg.directory);
            cmd.arg("build");
            cmd.arg("--no-typescript"); // *.d.ts defs are pointless for bundled HTML files
            cmd.arg("--target").arg("no-modules");
            cmd.arg("--out-dir").arg(metadata.target_directory().join("wasm32-unknown-unknown").join(config.as_str()).join("pkg"));
            match config {
                Config::Debug   => drop(cmd.arg("--dev")),
                Config::Release => drop(cmd.arg("--release")),
            }
            run(cmd);
        }
    }

    any_this_header()
}

pub(crate) fn asyncify(args: &Arguments, metadata: &Metadata) {
    let wasm32_wasip1_target = crate::tools::wasm32_wasip1_target().unwrap_or("wasm32-wasip1");
    impl_asyncify(format!("Asyncify {wasm32_wasip1_target} targets"),   &wasm32_wasip1_target,      |pkg| pkg.is_wasi,      args, metadata);
    impl_asyncify("Asyncify wasm32-unknown-unknown targets",            "wasm32-unknown-unknown",   |pkg| pkg.is_wasm_unk2, args, metadata);
}

fn impl_asyncify(head: impl Into<String>, arch: &str, pkg_filter: fn(&Package) -> bool, args: &Arguments, metadata: &Metadata) {
    header(head);

    for config in args.configs.iter().copied() {
        let target_arch_config = metadata.target_directory().join(arch).join(config.as_str());
        for (ty, target, pkg) in metadata.selected_targets() {
            if !pkg.asyncify { continue }
            if !pkg_filter(pkg) { continue }
            let target_arch_config = match ty {
                TargetType::Bin     => target_arch_config.clone(),
                TargetType::Example => target_arch_config.join("examples"),
                TargetType::Cdylib  => continue, // XXX?
            };

            let bg_wasm = if pkg.wasm_bindgen.is_some() {
                target_arch_config.join("js").join(format!("{}_bg.wasm", target))
            } else {
                target_arch_config.join(format!("{}.wasm", target))
            };

            let async_wasm = target_arch_config.join(format!("{}.async.wasm", target));

            let mut gen_reasons = Vec::new();
            match file_mod_time(&async_wasm) {
                None => gen_reasons.push("not yet generated"),
                Some(dst_mod_time) => {
                    if dst_mod_time <= exe_mod_time() { gen_reasons.push("cargo-html updated"); }
                    if dst_mod_time <= file_mod_time(&bg_wasm).unwrap_or_else(|| SystemTime::now()) { gen_reasons.push("source wasm updated"); }
                    if dst_mod_time <= file_mod_time(&pkg.manifest_path).unwrap_or_else(|| SystemTime::now()) { gen_reasons.push("package manifest updated"); }
                },
            }

            force_header();
            if gen_reasons.is_empty() {
                status!("Up-to-date", "{}", async_wasm.display());
                continue;
            }

            #[cfg(feature = "binaryen")] {
                status!("Running", "binaryen asyncify/optimizations on `{}`", bg_wasm.display());
                for reason in gen_reasons.iter().copied() { println!("    \u{001B}[36;1mreason\u{001B}[0m: {}", reason); }
                let data = std::fs::read(&bg_wasm).unwrap_or_else(|err| fatal!("unable to read `{}`: {}", bg_wasm.display(), err));
                let mut m = binaryen::Module::read(&data[..]).unwrap_or_else(|_err| fatal!("unable to parse `{}`", bg_wasm.display()));
                m.run_optimization_passes(&["asyncify"], &binaryen::CodegenConfig {
                    debug_info: true,
                    optimization_level: match config {
                        Config::Debug   => 0,
                        Config::Release => 4,
                    },
                    .. Default::default()
                }).unwrap_or_else(|_err| fatal!("error optimizing module"));
                let data = m.write();
                std::fs::write(&async_wasm, &data[..]).unwrap_or_else(|err| fatal!("unable to write `{}`: {}", async_wasm.display(), err));
                if true { continue }
            }

            let mut cmd = tools::find_install_wasm_opt();
            match config {
                Config::Debug   => {},
                Config::Release => drop(cmd.arg("-O4")),
            }
            cmd.arg("--debuginfo");
            cmd.arg("--asyncify").arg(&bg_wasm);
            cmd.arg("--output").arg(&async_wasm);

            status!("Running", "{:?}", cmd);
            for reason in gen_reasons.iter().copied() { println!("    \u{001B}[36;1mreason\u{001B}[0m: {}", reason); }
            cmd.status0().unwrap_or_else(|err| fatal!("{} failed: {}", cmd, err));
        }
    }
}
