# cargo-html - create HTML files embedding WASM from rust programs

[![GitHub](https://img.shields.io/github/stars/MaulingMonkey/cargo-html.svg?label=GitHub&style=social)](https://github.com/MaulingMonkey/cargo-html)
[![crates.io](https://img.shields.io/crates/v/cargo-html.svg)](https://crates.io/crates/cargo-html)
[![%23![forbid(unsafe_code)]](https://img.shields.io/github/search/MaulingMonkey/cargo-html/unsafe%2bextension%3Ars?color=green&label=%23![forbid(unsafe_code)])](https://github.com/MaulingMonkey/cargo-html/search?q=forbid%28unsafe_code%29+extension%3Ars)
[![rust: stable](https://img.shields.io/badge/rust-stable-yellow.svg)](https://gist.github.com/MaulingMonkey/c81a9f18811079f19326dac4daa5a359#minimum-supported-rust-versions-msrv)
[![License](https://img.shields.io/crates/l/cargo_html.svg)](https://github.com/MaulingMonkey/cargo-html)
[![Build Status](https://github.com/MaulingMonkey/cargo-html/workflows/Rust/badge.svg)](https://github.com/MaulingMonkey/cargo-html/actions?query=workflow%3Arust)



<h2 name="quickstart">Quickstart</h2>

```sh
cargo install cargo-html

cargo new hello-world
cd hello-world
cargo html --bin hello-world
start "" target/wasm32-wasi/debug/hello-world.html
```



<h2 name="license">License</h2>

Licensed under either of

* Apache License, Version 2.0 ([LICENSE-APACHE](LICENSE-APACHE) or http://www.apache.org/licenses/LICENSE-2.0)
* MIT license ([LICENSE-MIT](LICENSE-MIT) or http://opensource.org/licenses/MIT)

at your option.



<h2 name="contribution">Contribution</h2>

Unless you explicitly state otherwise, any contribution intentionally submitted
for inclusion in the work by you, as defined in the Apache-2.0 license, shall be
dual licensed as above, without any additional terms or conditions.
