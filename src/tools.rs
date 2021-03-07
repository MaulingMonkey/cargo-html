use mmrbi::*;

use std::io;



pub(crate) fn install_toolchains() {
    let rustup = Rustup::default().or_die();
    if let Some(toolchain) = rustup.toolchains().active() {
        toolchain.targets().add("wasm32-wasi").or_die();
        toolchain.targets().add("wasm32-unknown-unknown").or_die();
    }
}

pub(crate) fn find_install_wasm_bindgen(version: &str) -> Command {
    let target = if cfg!(windows) {
        if      cfg!(target_arch = "x86_64" ) { "x86_64-pc-windows-msvc" }
        else                                  { fatal!("pre-built Windows wasm-bindgen binaries not available for this target_arch"); }
    } else if cfg!(target_os = "linux") {
        if      cfg!(target_arch = "x86_64" ) { "x86_64-unknown-linux-musl" }
        else                                  { fatal!("pre-built Linux wasm-bindgen binaries not available for this target_arch"); }
    } else if cfg!(target_os = "macos") {
        if      cfg!(target_arch = "x86_64" ) { "x86_64-apple-darwin" }
        else                                  { fatal!("pre-built OS X wasm-bindgen binaries not available for this target_arch"); }
    } else {
        fatal!("pre-built wasm-bindgen binaries not available for this target_os");
    };

    // TODO: source installs / fallbacks

    let cache = binary_install::Cache::new("wasm-pack").unwrap_or_else(|err| fatal!("unable to get wasm-pack cache: {}", err)); // reuse wasm-pack's binary cache
    let url = format!("https://github.com/rustwasm/wasm-bindgen/releases/download/{version}/wasm-bindgen-{version}-{target}.tar.gz", version = version, target = target);
    let download = cache.download(true, "wasm-bindgen", &["wasm-bindgen", "wasm-bindgen-test-runner"], &url).unwrap_or_else(|err| fatal!("error downloading wasm-bindgen: {}", err)).unwrap();
    let path = download.binary("wasm-bindgen").unwrap_or_else(|err| fatal!("error getting wasm-bindgen binary from download: {}", err));
    Command::new(path)
}

pub(crate) fn find_install_wasm_opt() -> Command {
    // https://docs.rs/wasm-pack/0.9.1/wasm_pack/cache/fn.get_wasm_pack_cache.html
    // https://docs.rs/wasm-pack/0.9.1/wasm_pack/wasm_opt/fn.find_wasm_opt.html
    // https://docs.rs/wasm-pack/0.9.1/wasm_pack/wasm_opt/fn.run.html

    // https://doc.rust-lang.org/reference/conditional-compilation.html#target_arch
    // https://github.com/rustwasm/wasm-pack/blob/d46d1c69b788956160deed5e4e603f4f2780ffcf/src/install/mod.rs
    // https://github.com/WebAssembly/binaryen/releases/

    let vers = "version_100";
    let target = if cfg!(windows) {
        if      cfg!(target_arch = "x86_64" ) { "x86_64-windows" }
        else { fatal!("pre-built windows wasm-opt binaries not available for this target_arch"); }
    } else if cfg!(target_os = "linux") {
        if      cfg!(target_arch = "x86_64" ) { "x86_64-linux"  } // wasm-pack uses "x86-linux" but surely that's busted?  https://github.com/rustwasm/wasm-pack/blob/d46d1c69b788956160deed5e4e603f4f2780ffcf/src/install/mod.rs#L167
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
    let installed = mmrbi::wasm_pack::version();
    if installed.as_ref().map_or(false, |v| v.is_at_least(0,9,1)) { return Command::new("wasm-pack"); } // already up to date
    status!("Installing", "wasm-pack 0.9.1+");
    match installed {
        Err(err)        if err.kind() == io::ErrorKind::NotFound => info!("wasm-pack not installed"),
        Err(err)        => info!("wasm-pack --version error: {:?}", err),
        Ok(installed)   => info!("wasm-pack {} < 0.9.1", installed.version),
    }
    Command::new("cargo").arg("install").arg("--version").arg("^0.9.1").arg("wasm-pack").status0().unwrap_or_else(|err| fatal!("error installing wasm-pack: {}", err));
    Command::new("wasm-pack")
}

pub(crate) fn find_install_cargo_web() -> Command {
    let min = "0.6.26";
    mmrbi::cargo_web::install_at_least(min).unwrap_or_else(|err| fatal!("unable to install cargo-web {}: {}", min, err));
    let mut cmd = Command::new("cargo");
    cmd.arg("web");
    return cmd;
}
