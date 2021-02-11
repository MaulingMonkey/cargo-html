# `cargo html`

create self-contained HTML programs

[![GitHub](https://img.shields.io/github/stars/MaulingMonkey/cargo-html.svg?label=GitHub&style=social)](https://github.com/MaulingMonkey/cargo-html)
[![crates.io](https://img.shields.io/crates/v/cargo-html.svg)](https://crates.io/crates/cargo-html)
[![rust: stable](https://img.shields.io/badge/rust-stable-yellow.svg)](https://gist.github.com/MaulingMonkey/c81a9f18811079f19326dac4daa5a359#minimum-supported-rust-versions-msrv)
[![License](https://img.shields.io/crates/l/cargo_html.svg)](https://github.com/MaulingMonkey/cargo-html)
[![Build Status](https://github.com/MaulingMonkey/cargo-html/workflows/Rust/badge.svg)](https://github.com/MaulingMonkey/cargo-html/actions?query=workflow%3Arust)


Want to run basic console programs in the browser?<br>
Too lazy to configure CORS properly to fetch/share WASM?<br>
Hate firing up a webserver when you'd rather just double click an HTML file?<br>
Easily confused by advanced concepts such as "I have multiple files"?<br>

`cargo html` solves all of this, by generating .html files which embed and encode their javascript, WASM, and WASI implementations directly into said HTML.  No CORS, no `--allow-file-access-from-files` flags, no [sidecar files](https://en.wikipedia.org/wiki/Sidecar_file), 100% self contained.



<h2 name="quickstart">Quickstart</h2>

```sh
# install
cargo install cargo-html

# create a project
cargo new hello-world
cd hello-world

# build a project
cargo html

# view/run said project in the browser
start "" target/wasm32-wasi/debug/hello-world.html
```


<h2 name="examples">Examples</h2>

### rust-mini-games

* as mentioned on HN: https://news.ycombinator.com/item?id=26089539
* upstream: https://github.com/Syn-Nine/rust-mini-games
* patches:  https://github.com/MaulingMonkey/rust-mini-games

| Game | Issues |
| ---- | ------ |
| [asylum](https://maulingmonkey.com/rust-mini-games/asylum.html)
| [guess](https://maulingmonkey.com/rust-mini-games/guess.html)
| [knights](https://maulingmonkey.com/rust-mini-games/knights.html) | [#6](https://github.com/MaulingMonkey/cargo-html/issues/6) File I/O not implemented (panic on exit)
| [lord](https://maulingmonkey.com/rust-mini-games/lord.html)       | [#7](https://github.com/MaulingMonkey/cargo-html/issues/7) Colors not supported (some terminal escape garbage)
| [rps](https://maulingmonkey.com/rust-mini-games/rps.html)
| [tictactoe](https://maulingmonkey.com/rust-mini-games/tictactoe.html)

To reproduce the `gh-pages` of my fork of that repository from scratch:
```sh
# init
cargo install cargo-html
git clone --branch cargo-html-demo https://github.com/MaulingMonkey/rust-mini-games
cd rust-mini-games

# build
cargo html --release
robocopy /S target/wasm32-wasi/release . *.html

# create branch
git checkout -b gh-pages
git add -A .
git commit -m "Updated examples"
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
