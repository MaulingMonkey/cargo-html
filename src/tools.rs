use mmrbi::*;



pub(crate) fn install_toolchains() {
    let rustup = Rustup::default().or_die();
    if let Some(toolchain) = rustup.toolchains().active() {
        toolchain.targets().add("wasm32-wasi").or_die();
        toolchain.targets().add("wasm32-unknown-unknown").or_die();
    }
}

pub(crate) fn find_install_wasm_opt() -> Command {
    // https://docs.rs/wasm-pack/0.9.1/wasm_pack/cache/fn.get_wasm_pack_cache.html
    // https://docs.rs/wasm-pack/0.9.1/wasm_pack/wasm_opt/fn.find_wasm_opt.html
    // https://docs.rs/wasm-pack/0.9.1/wasm_pack/wasm_opt/fn.run.html

    // https://doc.rust-lang.org/reference/conditional-compilation.html#target_arch
    // https://github.com/rustwasm/wasm-pack/blob/d46d1c69b788956160deed5e4e603f4f2780ffcf/src/install/mod.rs
    // https://github.com/WebAssembly/binaryen/releases/

    let vers = "version_90";
    let target = if cfg!(windows) {
        if      cfg!(target_arch = "x86_64" ) { "x86-windows" }
        else if cfg!(target_arch = "x86"    ) { "x86-windows" } // we *could* use "x86_64-windows" but wasm-pack doesn't and we don't need to either.  https://github.com/rustwasm/wasm-pack/blob/d46d1c69b788956160deed5e4e603f4f2780ffcf/src/install/mod.rs#L179
        else { fatal!("pre-built windows wasm-opt binaries not available for this target_arch"); }
    } else if cfg!(target_os = "linux") {
        if      cfg!(target_arch = "x86_64" ) { "x86_64-linux"  } // wasm-pack uses "x86-linux" but surely that's busted?  https://github.com/rustwasm/wasm-pack/blob/d46d1c69b788956160deed5e4e603f4f2780ffcf/src/install/mod.rs#L167
        else if cfg!(target_arch = "x86"    ) { "x86-linux"     }
        else if cfg!(target_arch = "aarch64") { "aarch64-linux" }
        else if cfg!(target_arch = "arm"    ) { "armhf-linux"   }
        else { fatal!("pre-built linux wasm-opt binaries not available for this target_arch"); }
    } else if cfg!(target_os = "macos") {
        if      cfg!(target_arch = "x86_64" ) { "x86_64-apple-darwin" }
        else { fatal!("pre-built OS X wasm-opt binaries not available for this target_arch"); }
    } else {
        fatal!("pre-built wasm-opt binaries not available for this target_os");
    };

    let cache = binary_install::Cache::new("wasm-pack").unwrap_or_else(|err| fatal!("unable to get wasm-pack cache: {}", err)); // reuse wasm-pack's binary cache
    let url = format!("https://github.com/WebAssembly/binaryen/releases/download/{vers}/binaryen-{vers}-{target}.tar.gz", vers = vers, target = target);
    let download = cache.download(true, "wasm-opt", &["wasm-opt"], &url).unwrap_or_else(|err| fatal!("error downloading wasm-opt: {}", err)).unwrap();
    let path = download.binary("wasm-opt").unwrap_or_else(|err| fatal!("error getting wasm-opt binary from download: {}", err));
    Command::new(path)
}

pub(crate) fn find_install_wasm_pack() -> Command {
    let min = "0.9.1";
    mmrbi::wasm_pack::install_at_least(min).unwrap_or_else(|err| fatal!("unable to install wasm-pack {}: {}", min, err));
    Command::new("wasm-pack")
}

pub(crate) fn find_install_cargo_web() -> Command {
    let min = "0.6.26";
    mmrbi::cargo_web::install_at_least(min).unwrap_or_else(|err| fatal!("unable to install cargo-web {}: {}", min, err));
    let mut cmd = Command::new("cargo");
    cmd.arg("web");
    return cmd;
}
