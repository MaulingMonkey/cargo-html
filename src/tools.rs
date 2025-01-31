use mmrbi::*;

use std::io;
use std::path::*;
use std::sync::OnceLock;



pub(crate) fn rustc_target_list() -> impl Iterator<Item = &'static str> {
    static TARGETS : OnceLock<&'static str> = OnceLock::new();

    let targets = TARGETS.get_or_init(||{
        let mut rustc = Command::new("rustc");
        rustc.arg("--print").arg("target-list");
        let output = rustc.output0().unwrap_or_else(|err| fatal!("error querying `rustc --print target-list`: {err}", err = err));
        let stdout = String::from_utf8_lossy(&output.stdout);
        Box::leak(Box::<str>::from(stdout))
    });

    targets.split("\n").map(|t| t.trim())
}

pub(crate) fn wasm32_wasip1_target() -> Option<&'static str> {
    static WASM32_WASIP1_TARGET : OnceLock<Option<&'static str>> = OnceLock::new();
    *WASM32_WASIP1_TARGET.get_or_init(|| ["wasm32-wasip1", "wasm32-wasi"].iter().copied().filter(|&expected| rustc_target_list().any(|t| t == expected)).next())
}

pub(crate) fn install_toolchains() {
    let rustup = Rustup::default().or_die();
    if let Some(toolchain) = rustup.toolchains().active() {
        if let Some(wasm32_wasip1_target) = wasm32_wasip1_target() {
            toolchain.targets().add(wasm32_wasip1_target).or_die();
        }
        toolchain.targets().add("wasm32-unknown-unknown").or_die();
    }
}

pub(crate) fn find_install_wasm_bindgen(version: &str) -> Command {
    let prebuilt_target = if cfg!(windows) {
        if      cfg!(target_arch = "x86_64" ) { Some("x86_64-pc-windows-msvc") }
        else                                  { None }
    } else if cfg!(target_os = "linux") {
        if      cfg!(target_arch = "x86_64" ) { Some("x86_64-unknown-linux-musl") }
        else                                  { None }
    } else if cfg!(target_os = "macos") {
        if      cfg!(target_arch = "x86_64" ) { Some("x86_64-apple-darwin") }
        else                                  { None }
    } else {
        None
    };

    let cache = binary_install::Cache::new("wasm-pack").unwrap_or_else(|err| fatal!("unable to get wasm-pack cache: {}", err)); // reuse wasm-pack's binary cache
    match prebuilt_target {
        Some(target) => {
            let url = format!("https://github.com/rustwasm/wasm-bindgen/releases/download/{version}/wasm-bindgen-{version}-{target}.tar.gz", version = version, target = target);
            let download = cache.download(true, "wasm-bindgen", &["wasm-bindgen", "wasm-bindgen-test-runner"], &url).unwrap_or_else(|err| fatal!("error downloading wasm-bindgen: {}", err)).unwrap();
            let path = download.binary("wasm-bindgen").unwrap_or_else(|err| fatal!("error getting wasm-bindgen binary from download: {}", err));
            Command::new(path)
        },
        None => {
            let actual = cache.join(Path::new(&format!("wasm-bindgen-cargo-install-{}", version)));
            if !actual.exists() {
                // status!("Installing", "wasm-bindgen {}", version); // already logged by `cargo install ...`
                let temp = cache.join(Path::new(&format!("wasm-bindgen-cargo-install-{}-temp", version)));
                Command::new("cargo").arg("install")
                    .arg("--version").arg(version)
                    .arg("--root").arg(&temp)
                    .arg("--bins")
                    .arg("--locked")
                    .arg("--offline")
                    .arg("wasm-bindgen-cli")
                    .status0().unwrap_or_else(|err| fatal!("error installing wasm-bindgen: {}", err));
                let exe = if cfg!(windows) { ".exe" } else { "" };
                for bin in "wasm-bindgen wasm-bindgen-test-runner".split(' ') {
                    let exe = format!("{}{}", bin, exe);
                    std::fs::rename(temp.join("bin").join(&exe), temp.join(&exe)).unwrap_or_else(|err| fatal!("error renaming `bin/{exe}` => `{exe}`: {err}", exe = exe, err = err));
                }
                std::fs::rename(&temp, &actual).unwrap_or_else(|err| fatal!("error renaming `wasm-bindgen-cargo-install-{version}-temp` => `wasm-bindgen-cargo-install-{version}`: {err}", version = version, err = err));
            }
            Command::new(actual.join(if cfg!(windows) { "wasm-bindgen.exe" } else { "wasm-bindgen" }))
        },
    }
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
