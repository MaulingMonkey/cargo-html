use mmrbi::*;

use std::env::Args;
use std::process::Stdio;



fn main() {
    let mut args = std::env::args();
    let _exe = args.next();
    let cmd = args.next().unwrap_or_else(|| fatal!("expected subcommand for xtask"));
    match &*cmd {
        "b" | "build"   => build(args),
        "c" | "check"   => check(args),
        "clean"         => clean(args),
        "d" | "doc"     => doc(args),
        "r" | "run"     => run(args),
        "i" | "install" => install(args),
        other           => fatal!("unrecognized subcommand `{}`", other),
    }
}



fn build(args: Args) {
    pre_build();

    let mut args = args.peekable();
    if args.peek().is_some() {
        let mut cmd = Command::new("cargo");
        cmd.arg("build");
        cmd.args(args);
        status!("Running", "{}", cmd);
        std::process::exit(cmd.status().ok().and_then(|s| s.code()).unwrap_or(1));
    } else {
       // common
       exec("cargo fetch");
       exec("cargo fetch --manifest-path examples/Cargo.toml");

       // debug
       exec("cargo build --frozen --workspace --all-targets");
       exec("cargo test  --frozen --workspace --all-targets");
       exec("cargo run -p cargo-html -- html --manifest-path examples/Cargo.toml");

       // release
       exec("cargo build --frozen --workspace --all-targets --release");
       exec("cargo test  --frozen --workspace --all-targets --release");
    }
}

fn doc(args: Args) {
    pre_build();
    let mut cmd = Command::new("cargo");
    if has_nightly() { cmd.arg("+nightly"); }
    cmd.arg("doc");
    cmd.args(args);
    status!("Running", "{}", cmd);
    cmd.status0().unwrap_or_else(|err| fatal!("{:?} failed: {}", cmd, err));
}

fn check(_args: Args) {
    pre_build();
    exec("cargo check --workspace --all-targets");
}

fn clean(_args: Args) {
    exec("cargo clean");
    exec("cargo clean --manifest-path examples/Cargo.toml");
    // we can't clean ourselves while running, so spawn an extra term
    exec("cmd /C start \"cargo clean xtask\" /MIN cmd /C \"ping localhost -n 2 >NUL 2>NUL && cargo clean --manifest-path xtask/Cargo.toml\"");
}

fn run(args: Args) {
    pre_build();
    let mut cmd = Command::new("cargo");
    cmd.arg("run").args(args);
    status!("Running", "{}", cmd);
    std::process::exit(cmd.status().ok().and_then(|s| s.code()).unwrap_or(1));
}

fn install(_args: Args) {
    pre_build();
    exec("cargo install --locked --path .");
}



fn pre_build() {
    if cfg!(windows) && !silent_exec_ok("cmake --version") {
        // add default install locations of cmake.exe to %PATH%

        let mut path = env::var_os("PATH").unwrap_or_else(|err| { warning!("{err} - will not extend to include cmake"); Default::default() });

        let pf64 = env::var_path("ProgramW6432").or_else(|_| env::var_path("ProgramFiles"));
        let pf32 = env::var_path("ProgramFiles(x86)");
        for pf in [pf64, pf32] {
            match pf {
                Err(err) => warning!("{err}"),
                Ok(pf) => {
                    if !path.is_empty() { path.push(";") }
                    path.push(pf);
                    path.push(r"\CMake\bin");
                }
            }
        }

        std::env::set_var("PATH", path);
    }

    let mut missing_deps = false;
    for (test_command,      dependency, windows_install_instructions) in [
        ("npm --version",   "npm",      "download and install as part of node.js from https://nodejs.org/"),
        ("cmake --version", "cmake",    "download and install from https://cmake.org/"),
    ].iter().copied() {
        let mut cmd = parse(test_command);
        cmd.stdout(|| Stdio::null()).stderr(|| Stdio::null());
        if cmd.status0().is_err() {
            if !missing_deps {
                error!("missing build dependencies:");
                missing_deps = true;
            }
            error!("  • {dependency: <10} {windows_install_instructions}");
        }
    };
    if missing_deps { std::process::exit(1) }

    exec(r"npm install --prefer-offline --audit=false --silent");
    exec(r"node_modules/.bin/tsc --build script/tsconfig.json");
}



fn parse(cmd: &str) -> Command {
    if cfg!(windows) {
        Command::parse(format!("cmd /C call {}", cmd))
    } else {
        Command::parse(cmd)
    }.unwrap()
}

fn exec(cmd: &str) {
    status!("Running", "`{}`", cmd);
    parse(cmd).status0().unwrap_or_else(|err| fatal!("`{}` failed: {}", cmd, err));
}

fn silent_exec_ok(cmd: &str) -> bool {
    parse(cmd).stdout(Stdio::null).stderr(Stdio::null).status0().is_ok()
}

fn has_nightly() -> bool {
    Rustup::default().or_die().toolchains().get("nightly").is_some()
}
