use mmrbi::*;

use std::cell::Cell;



pub fn header(title: &'static str) { TL.with(|tl| {
    tl.header.set(title);
    tl.any_this_header.set(false);
})}

pub fn run(mut cmd: Command) {
    force_header();
    status!("Running", "{:?}", cmd);
    cmd.status0().unwrap_or_else(|err| fatal!("{} failed: {}", cmd, err));
}

pub fn force_header() -> bool { TL.with(|tl| {
    if !tl.any_this_header.get() {
        println!("\u{001B}[30;102m{:^1$}\u{001B}[0m", tl.header.get(), crate::HEADER_W);
        tl.any_this_header.set(true);
        true
    } else {
        false
    }
})}

pub fn any_this_header() -> bool { TL.with(|tl| tl.any_this_header.get()) }



struct TL {
    header:             Cell<&'static str>,
    any_this_header:    Cell<bool>,
}

thread_local! { static TL : TL = TL {
    header:             Cell::new(""),
    any_this_header:    Cell::new(false),
};}
