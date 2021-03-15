use mmrbi::*;

use std::env::Args;



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
    exec("cargo install --path .");
}



fn pre_build() {
    exec(r"npm install --prefer-offline --audit=false --silent");
    exec(r"node_modules/.bin/tsc --build script/tsconfig.json");
}



fn exec(cmd: &str) {
    status!("Running", "`{}`", cmd);
    let mut cmd = if cfg!(windows) {
        Command::parse(format!("cmd /C call {}", cmd))
    } else {
        Command::parse(cmd)
    }.unwrap();
    cmd.status0().unwrap_or_else(|err| fatal!("{:?} failed: {}", cmd, err));
}

fn has_nightly() -> bool {
    Rustup::default().or_die().toolchains().get("nightly").is_some()
}
