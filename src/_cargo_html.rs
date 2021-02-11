#![forbid(unsafe_code)]

use mmrbi::*;

use std::collections::BTreeSet;
use std::io::Write;
use std::path::Path;



trait PackageExt {
    fn is_html(&self) -> bool;
    fn is_wasi(&self) -> bool;
}

impl PackageExt for cargo_metadata::Package {
    fn is_html(&self) -> bool {
        self.metadata.get("html").map_or(true, |html| html != false)
    }

    fn is_wasi(&self) -> bool {
        self.is_html() && self.targets.iter().any(|t| t.crate_types.iter().any(|ct| ct == "bin" || ct == "example"))
    }
}

fn main() {
    let mut args = std::env::args();
    let _cargo  = args.next();
    let _html   = args.next();

    let mut metadata : cargo_metadata::Metadata = cargo_metadata::MetadataCommand::new().exec().unwrap_or_else(|err| fatal!("failed to run/parse `cargo metadata`: {}", err));
    let workspace_members = std::mem::take(&mut metadata.workspace_members).into_iter().collect::<BTreeSet<_>>();
    metadata.packages.retain(|pkg| workspace_members.contains(&pkg.id));

    let mut die = false;
    let mut workspace = false;
    let mut packages = BTreeSet::new();

    let mut bins = false;
    let mut examples = false;
    let mut all_targets = false;

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
            "-p" | "--package" => {
                if let Some(pkg) = args.next() {
                    let package = metadata.packages.iter().find(|p| p.name == pkg);
                    if !packages.insert(pkg.clone()) {
                        warning!("package `{}` specified multiple times", pkg);
                    } else if package.is_none() {
                        error!("no such package `{}` in workspace", pkg);
                        die = true;
                    }
                } else {
                    fatal!("expected a package name after `{}`", arg);
                }
            },
            "--debug"       => { if !configs.insert(Config::Debug)   { warning!("{} specified multiple times", arg); } },
            "--release"     => { if !configs.insert(Config::Release) { warning!("{} specified multiple times", arg); } },
            "--workspace"   => { if workspace   { warning!("{} specified multiple times", arg); } else { workspace      = true; } },
            "--bins"        => { if bins        { warning!("{} specified multiple times", arg); } else { bins           = true; } },
            "--examples"    => { if examples    { warning!("{} specified multiple times", arg); } else { examples       = true; } },
            "--all-targets" => { if all_targets { warning!("{} specified multiple times", arg); } else { all_targets    = true; } },
            // TODO: --exclude
            // TODO: features?
            other           => fatal!("unexpected argument `{}`", other),
        }
    }

    if die {
        std::process::exit(1); // earlier errors
    }

    // defaults

    if workspace {
        for package in metadata.packages.iter().filter(|p| p.is_html()) {
            packages.insert(package.name.clone());
        }
    } else if packages.is_empty() {
        // neither --workspace nor any --package s specified
        if let Some(root) = metadata.root_package() {
            if root.is_html() {
                packages.insert(root.name.clone());
            }
        }
        if packages.is_empty() {
            // no root, or root isn't an HTML project
            // TODO: support workspace default members?
            for package in metadata.packages.iter().filter(|p| p.is_html()) {
                packages.insert(package.name.clone());
            }
        }
    }

    // Create command *before* inserting defaults for HTML page generation - our defaults should match `build`s default behavior
    let mut cmd = Command::parse("cargo build --target=wasm32-wasi").unwrap();

    for pkg in metadata.packages.iter() {
        if packages.contains(&pkg.name) && pkg.is_wasi() {
            cmd.arg("--package").arg(&pkg.name);
        }
    }

    if all_targets  { cmd.arg("--all-targets"); }
    if bins         { cmd.arg("--bins"); }
    if examples     { cmd.arg("--examples"); }

    bins        |= all_targets;
    examples    |= all_targets;

    for (ty, target) in targets.iter() {
        match ty {
            TargetType::Bin     => { if !bins       { cmd.arg("--bin")      .arg(target); } },
            TargetType::Example => { if !examples   { cmd.arg("--example")  .arg(target); } },
        }
    }

    // match to cmd defaults

    if targets.is_empty() && !bins && !examples {
        bins = true;
        // `cargo build` doesn't build examples by default?
    }

    if bins || examples {
        for pkg in metadata.packages.iter() {
            if !packages.contains(&pkg.name) { continue; }
            for target in pkg.targets.iter() {
                for crate_type in target.crate_types.iter() {
                    match crate_type.as_str() {
                        "bin"       if bins     => drop(targets.insert((TargetType::Bin,     target.name.clone()))),
                        "example"   if examples => drop(targets.insert((TargetType::Example, target.name.clone()))),
                        //"test"      => ...,
                        //"bench"     => ...,
                        //"lib"       => ...,
                        //"rlib"      => ...,
                        //"dylib"     => ...,
                        _other => {},
                    }
                }
            }
        }
    }

    if targets.is_empty() {
        fatal!("no selected packages contain any bin/example targets for `cargo html` to build");
    }

    if configs.is_empty() {
        configs.insert(Config::Debug);
    }

    println!("\u{001B}[30;102m                        Building wasm32-wasi targets                        \u{001B}[0m");

    for config in configs.iter().copied() {
        let mut cmd = cmd.clone();

        match config {
            Config::Debug   => {},
            Config::Release => drop(cmd.arg("--release")),
        }

        status!("Running", "{:?}", cmd);
        cmd.status0().unwrap_or_else(|err| fatal!("{:?} failed: {}", cmd, err));
    }

    println!("\u{001B}[30;102m                            Bundling HTML pages                             \u{001B}[0m");

    let script_placeholder  = "\"{BASE64_WASM32}\"";

    for config in configs.iter().copied() {
        let target_dir = Path::new("target").join("wasm32-wasi").join(config.as_str());
        for (ty, target) in targets.iter() {
            let target_dir = match ty {
                TargetType::Bin     => target_dir.clone(),
                TargetType::Example => target_dir.join("examples"),
            };
            let template_js   = concat!("<script>\n", include_str!("../template/script.js"), "\n</script>");
            let template_html = include_str!("../template/console-crate.html").replace("{CONFIG}", config.as_str()).replace("{CRATE_NAME}", &target).replace("<script src=\"script.js\"></script>", template_js);
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
