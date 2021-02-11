use mmrbi::*;

use std::env::Args;



fn main() {
    let mut args = std::env::args();
    let _exe = args.next();
    let cmd = args.next().unwrap_or_else(|| fatal!("expected subcommand for xtask"));
    match &*cmd {
        "b" | "build"   => build(args),
        "c" | "check"   => check(args),
        "d" | "doc"     => doc(args),
        "r" | "run"     => run(args),
        other           => fatal!("unrecognized subcommand `{}`", other),
    }
}



fn build(args: Args) {
    pre_build();

    let mut args = args.peekable();
    if args.peek().is_some() {
        let mut cmd = Command::new("cargo");
        cmd.arg("build").args(args);
        status!("Running", "{}", cmd);
        std::process::exit(cmd.status().ok().and_then(|s| s.code()).unwrap_or(1));
    } else {
       // common
       exec("cargo fetch");

       // debug
       exec("cargo check --frozen --workspace --exclude xtask");
       exec("cargo build --frozen --workspace --exclude xtask --all-targets");
       exec("cargo test  --frozen --workspace --exclude xtask --all-targets");
       if has_nightly() {
           exec("cargo +nightly doc");
       } else {
           exec("cargo doc");
       }

       // release
       exec("cargo build --frozen --workspace --exclude xtask --all-targets --release");
       exec("cargo test  --frozen --workspace --exclude xtask --all-targets --release");
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
    exec("cargo check --workspace --exclude xtask --all-targets");
}

fn run(args: Args) {
    pre_build();
    let mut cmd = Command::new("cargo");
    cmd.arg("run").args(args);
    status!("Running", "{}", cmd);
    std::process::exit(cmd.status().ok().and_then(|s| s.code()).unwrap_or(1));
}



fn pre_build() {
    if cfg!(windows) {
        // XXX: NPM installs tsc as a .cmd or .bat which Command::new() can't directly launch without resorting to shenannigans
        exec(r"cmd /C tsc --build script/tsconfig.json");
    } else {
        exec(r"tsc --build script/tsconfig.json");
    }
}



fn exec(cmd: &str) {
    let mut cmd = Command::parse(cmd).unwrap();
    status!("Running", "{}", cmd);
    cmd.status0().unwrap_or_else(|err| fatal!("{:?} failed: {}", cmd, err));
}

fn has_nightly() -> bool {
    Rustup::default().or_die().toolchains().get("nightly").is_some()
}