#![forbid(unsafe_code)]

mod arguments;      use arguments::*;
#[path = "build/_build.rs"] mod build;
mod js;
mod metadata;       use metadata::*;
mod tools;

use mmrbi::*;

const HEADER_W : usize = 76;



fn main() {
    let args = Arguments::parse_args();
    match args.subcommand {
        _ if args.help                  => help(args),
        Subcommand::HelpGeneric         => help(args),
        Subcommand::Build               => build(args),
        Subcommand::InstallBuildTools   => install_build_tools(args),
    }
}

fn help(args: Arguments) {
    assert!(args.help || args.subcommand == Subcommand::HelpGeneric);

    print!("{}", include_str!("_usage.txt"));
}

fn install_build_tools(args: Arguments) {
    assert!(args.subcommand == Subcommand::InstallBuildTools);

    tools::install_toolchains();
    // wasm_bindgen would be nice to install, but annoyingly we need to match whatever the crate depends on! lame!
    tools::find_install_wasm_opt();
    tools::find_install_wasm_pack();
    tools::find_install_cargo_web();
}

fn build(args: Arguments) {
    assert!(args.subcommand == Subcommand::Build);
    let metadata = Metadata::from_args(&args);
    tools::install_toolchains();

    if !build::wasm::targets(&args, &metadata) { fatal!("no selected packages contain any bin/example targets for `cargo html` to build"); }
    build::wasm::asyncify(&args, &metadata);
    build::html::pages(&args, &metadata);
    println!("\u{001B}[30;102m{:^1$}\u{001B}[0m", "Build Successful", HEADER_W);
}
