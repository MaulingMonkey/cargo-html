use mmrbi::*;

use std::collections::*;
use std::path::*;



#[derive(Default, Debug)]
pub(crate) struct Arguments {
    // command
    pub subcommand:     Subcommand,
    pub help:           bool,

    // workspace / package selection
    pub manifest_path:  Option<PathBuf>,
    pub workspace:      bool,
    pub packages:       BTreeSet<String>,

    // target(s) selection
    pub bins:           bool,
    pub examples:       bool,
    pub cdylibs:        bool,
    pub targets:        BTreeSet<(TargetType, String)>,
    pub configs:        BTreeSet<Config>,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq, PartialOrd, Ord, Hash)]
pub(crate) enum Subcommand {
    Build,
    HelpGeneric, // NOTE: "help build" uses Subcommand::Build
    InstallBuildTools,
}

impl Default for Subcommand {
    fn default() -> Self { Subcommand::Build }
}

#[derive(Clone, Copy, Debug, PartialEq, Eq, PartialOrd, Ord, Hash)]
pub(crate) enum TargetType {
    Bin,
    Example,
    Cdylib,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq, PartialOrd, Ord, Hash)]
pub(crate) enum Config {
    Debug,
    Release,
}



impl Arguments {
    pub fn parse_args() -> Self {
        let mut o = Arguments::default();

        let mut args = std::env::args();
        let _cargo  = args.next();
        let _html   = args.next();

        let mut all_targets = false;
        let mut subcommand : Option<Subcommand> = None;

        while let Some(arg) = args.next() {
            match &*arg {
                "build"                 if subcommand.is_none() => subcommand = Some(Subcommand::Build),
                "install-build-tools"   if subcommand.is_none() => subcommand = Some(Subcommand::InstallBuildTools),
                "help"                  if subcommand.is_none() => o.help = true,
                "--help" => o.help = true,
                "--bin" => {
                    if let Some(bin) = args.next() {
                        if !o.targets.insert((TargetType::Bin, bin.clone())) {
                            warning!("bin `{}` specified multiple times", bin);
                        }
                    } else {
                        fatal!("expected a bin name after `{}`", arg);
                    }
                },
                "--example" => {
                    if let Some(example) = args.next() {
                        if !o.targets.insert((TargetType::Example, example.clone())) {
                            warning!("example `{}` specified multiple times", example);
                        }
                    } else {
                        fatal!("expected a example name after `{}`", arg);
                    }
                },
                "--cdylib" => {
                    if let Some(cdylib) = args.next() {
                        if !o.targets.insert((TargetType::Cdylib, cdylib.clone())) {
                            warning!("cdylib `{}` specified multiple times", cdylib);
                        }
                    } else {
                        fatal!("expected a cdylib name after `{}`", arg);
                    }
                },
                "-p" | "--package" => {
                    if let Some(pkg) = args.next() {
                        if !o.packages.insert(pkg.clone()) {
                            warning!("package `{}` specified multiple times", pkg);
                        }
                    } else {
                        fatal!("expected a package name after `{}`", arg);
                    }
                },
                "--manifest-path" => {
                    if let Some(path) = args.next() {
                        if o.manifest_path.is_some() {
                            warning!("--manifest-path specified multiple times");
                        }
                        o.manifest_path = Some(PathBuf::from(path));
                    } else {
                        fatal!("expected a path after `{}`", arg);
                    }
                },
                "--debug"       => { if !o.configs.insert(Config::Debug)   { warning!("{} specified multiple times", arg); } },
                "--release"     => { if !o.configs.insert(Config::Release) { warning!("{} specified multiple times", arg); } },
                "--workspace"   => { if o.workspace { warning!("{} specified multiple times", arg); } else { o.workspace    = true; } },
                "--bins"        => { if o.bins      { warning!("{} specified multiple times", arg); } else { o.bins         = true; } },
                "--examples"    => { if o.examples  { warning!("{} specified multiple times", arg); } else { o.examples     = true; } },
                "--cdylibs"     => { if o.cdylibs   { warning!("{} specified multiple times", arg); } else { o.cdylibs      = true; } },
                "--all-targets" => { if all_targets { warning!("{} specified multiple times", arg); } else { all_targets    = true; } },
                // TODO: --exclude
                // TODO: features?
                flag if flag.starts_with("-")   => fatal!("unexpected flag `{}`",       flag),
                command if subcommand.is_none() => fatal!("unexpected subcommand `{}`", command),
                other                           => fatal!("unexpected argument `{}`",   other),
            }
        }

        o.subcommand = subcommand.unwrap_or(if o.help { Subcommand::HelpGeneric } else { Subcommand::Build });

        if o.configs.is_empty() {
            o.configs.insert(Config::Debug);
        }

        if all_targets {
            o.bins      = true;
            o.examples  = true;
            o.cdylibs   = true;
        }

        if !o.bins && !o.examples && !o.cdylibs && o.targets.is_empty() {
            o.bins      = true;
            o.cdylibs   = true;
        }

        o
    }
}

impl Config {
    pub fn as_str(&self) -> &str {
        match self {
            Config::Debug   => "debug",
            Config::Release => "release",
        }
    }
}
