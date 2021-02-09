#![forbid(unsafe_code)]

use mmrbi::*;

use std::collections::BTreeSet;
use std::io::Write;
use std::path::Path;



fn main() {
    let mut args = std::env::args();
    let _cargo  = args.next();
    let _html   = args.next();

    let mut targets  = BTreeSet::<(TargetType, String)>::new();
    let mut configs  = BTreeSet::<Config>::new();
    while let Some(arg) = args.next() {
        match &*arg {
            "--bin" => {
                if let Some(bin) = args.next() {
                    if !targets.insert((TargetType::Bin, bin.clone())) {
                        warning!("bin `{}` specified multiple times", bin);
                    }
                } else {
                    fatal!("expected a bin name after `{}`", arg);
                }
            },
            "--example" => {
                if let Some(example) = args.next() {
                    if !targets.insert((TargetType::Example, example.clone())) {
                        warning!("example `{}` specified multiple times", example);
                    }
                } else {
                    fatal!("expected a example name after `{}`", arg);
                }
            },
            "--debug"   => { if !configs.insert(Config::Debug)   { warning!("{} specified multiple times", arg); } },
            "--release" => { if !configs.insert(Config::Release) { warning!("{} specified multiple times", arg); } },
            other       => fatal!("unexpected argument `{}`", other),
        }
    }

    // defaults

    if targets.is_empty() {
        fatal!("currently you must specify at least one `--bin` or `--example`");
    }

    if configs.is_empty() {
        configs.insert(Config::Debug);
    }

    println!("\u{001B}[30;102m                        Building wasm32-wasi targets                        \u{001B}[0m");

    for config in configs.iter().copied() {
        let mut cmd = Command::parse("cargo build --target=wasm32-wasi --workspace").unwrap();
        match config {
            Config::Debug   => {},
            Config::Release => drop(cmd.arg("--release")),
        }

        for (ty, target) in targets.iter() {
            match ty {
                TargetType::Bin     => drop(cmd.arg("--bin")),
                TargetType::Example => drop(cmd.arg("--example")),
            }
            cmd.arg(target);
        }

        status!("Running", "{:?}", cmd);
        cmd.status0().unwrap_or_else(|err| fatal!("{:?} failed: {}", cmd, err));
    }

    println!("\u{001B}[30;102m                            Bundling HTML pages                             \u{001B}[0m");

    let script_placeholder  = "{BASE64_WASM32}";

    for config in configs.iter().copied() {
        let target_dir = Path::new("target").join("wasm32-wasi").join(config.as_str());
        for (_ty, target) in targets.iter() {
            let template_html = include_str!("../template/console-crate.html").replace("{CONFIG}", config.as_str()).replace("{CRATE_NAME}", &target);
            let script_placeholder_idx = template_html.find(script_placeholder).expect("template missing {BASE64_WASM32}");

            let target_wasm = target_dir.join(format!("{}.wasm", target));
            let target_wasm = std::fs::read(&target_wasm).unwrap_or_else(|err| fatal!("unable to read `{}`: {}", target_wasm.display(), err));
            let target_wasm = base64::encode(&target_wasm[..]);

            let target_html = target_dir.join(format!("{}.html", target));
            status!("Generating", "{}", target_html.display());
            mmrbi::fs::write_if_modified_with(target_html, |o| {
                write!(o, "{}", &template_html[..script_placeholder_idx])?;
                write!(o, "{:?}", target_wasm)?;
                write!(o, "{}", &template_html[(script_placeholder_idx + script_placeholder.len())..])?;
                Ok(())
            }).unwrap_or_else(|err| fatal!("unable to fully write HTML file: {}", err));
        }
    }
}

#[derive(Clone, Copy, Debug, PartialEq, Eq, PartialOrd, Ord, Hash)]
enum Config {
    Debug,
    Release,
}

impl Config {
    pub fn as_str(&self) -> &str {
        match self {
            Config::Debug   => "debug",
            Config::Release => "release",
        }
    }
}

#[derive(Clone, Copy, Debug, PartialEq, Eq, PartialOrd, Ord, Hash)]
enum TargetType {
    Bin,
    Example,
}
