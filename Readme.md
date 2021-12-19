# `cargo html`

create self-contained HTML programs

[![GitHub](https://img.shields.io/github/stars/MaulingMonkey/cargo-html.svg?label=GitHub&style=social)](https://github.com/MaulingMonkey/cargo-html)
[![crates.io](https://img.shields.io/crates/v/cargo-html.svg)](https://crates.io/crates/cargo-html)
[![rust: stable](https://img.shields.io/badge/rust-stable-yellow.svg)](https://gist.github.com/MaulingMonkey/c81a9f18811079f19326dac4daa5a359#minimum-supported-rust-versions-msrv)
[![License](https://img.shields.io/crates/l/cargo_html.svg)](https://github.com/MaulingMonkey/cargo-html)
<br>
[![Build Status](https://github.com/MaulingMonkey/cargo-html/workflows/Rust/badge.svg)](https://github.com/MaulingMonkey/cargo-html/actions?query=workflow%3Arust)
[![bugs / missing functionality](https://img.shields.io/github/issues-raw/MaulingMonkey/cargo-html/bug%20/%20missing%20functionality?label=bugs%20%2F%20missing%20functionality)](https://github.com/MaulingMonkey/cargo-html/issues?q=is%3Aopen+is%3Aissue+label%3A%22bug+%2F+missing+functionality%22)
[![polish](https://img.shields.io/github/issues-raw/MaulingMonkey/cargo-html/polish?color=blue&label=polish)](https://github.com/MaulingMonkey/cargo-html/issues?q=is%3Aopen+is%3Aissue+label%3Apolish)
[![enhancement](https://img.shields.io/github/issues-raw/MaulingMonkey/cargo-html/enhancement?color=blue&label=enhancements)](https://github.com/MaulingMonkey/cargo-html/issues?q=is%3Aopen+is%3Aissue+label%3Aenhancement)

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
start "" target/cargo-html/debug/hello-world.html
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
robocopy /S target/cargo-html/release . *.html

# create branch
git checkout -b gh-pages
git add -A .
git commit -m "Updated examples"
```



<h2 name="portability-generated-html">Portability: Generated HTML</h2>

Requires:
* [wasm](https://caniuse.com/wasm)
* [async-functions](https://caniuse.com/async-functions)
* [bigint](https://caniuse.com/bigint)
* [promises](https://caniuse.com/promises)
* [textencoder](https://caniuse.com/textencoder)
* General awesomeness.

| Browser               | Supported Version |
| -----------------     | ----------------- |
| Chrome                | ✅ 67+
| Chrome for Android    | ✅ 88+
| Firefox               | ✅ 68+
| Firefox for Android   | ✔️ 85+
| Opera                 | ✔️ 54+
| Opera Mobile          | ✔️ 59+
| Opera Mini            | ❌ None (missing WASM, Async Functions, TextEncoder, BigInt)
| Safari                | ✔️ 14+
| iOS Safari            | ✔️ 14.4+ (webserver required, can't load local files)
| iOS Files             | ❌ None? (JavaScript disabled? [#43](https://github.com/MaulingMonkey/cargo-html/issues/43))
| Edge                  | ✅ 88+
| IE                    | ❌ None (missing WASM, Async Functions, TextEncoder, BigInt)
| Android Browser       | ✔️ 81+
| UC Browser for Android| ❌ None (missing WASM, BigInt)
| Samsung Internet      | ✅ 9.2+
| QQ Browser            | ❌ None (missing BigInt)
| Baidu Browser         | ❌ None (missing WASM, Async Functions, BigInt)
| KaiOS Browser         | ❌ None (missing WASM, Async Functions, BigInt)

| ?     | Legend    |
| ----- | --------- |
| ✅    | Tested
| ✔️    | Should work, but untested, so probably broken - file issues!
| ❌    | Broken (Browsers could probably be fixed via polyfills and different codegen?)



<h2 name="portability-command-line">Portability: Command Line</h2>

Build Requirements (default features):
* [`rustup`] (+ [`cargo`], [`rustc`], as installed via rustup)
* [`cc`]-compatible C++ build toolchain, [`cmake`]

[`cargo`]:          https://github.com/rust-lang/cargo
[`cc`]:             https://docs.rs/cc/1.0.67/cc/
[`cmake`]:          https://cmake.org/
[`rustc`]:          https://github.com/rust-lang/rust
[`rustup`]:         https://rustup.rs/

| Build OS      | x86_64    | x86       | AArch64   | ARM       | Other |
| ------------- | --------- | --------- | --------- | --------- | ----- |
| Windows       | ✅       | ✅        | ✔️        | ✔️       | ✔️
| Linux         | ✅       | ✔️        | ✔️        | ✔️       | ✔️
| OS X          | ✔️       | ✔️        | ✔️        | ✔️       | ✔️

| ?     | Legend    |
| ----- | --------- |
| ✅    | Tested
| ✔️    | Should work (famous last words)



<h2 name="metadata">Metadata</h2>

<h4>Make <code>cargo html</code> ignore a package:</h4>

```toml
[package]
metadata.html           = false
```

<h4>Configure build behavior</h4>

```toml
[package.metadata.html]
cargo-web               = false             # default: true for bins/examples depending on stdweb
wasm-pack               = false             # default: true for cdylibs depending on wasm-bindgen
asyncify                = false             # default: true for WASI targets (bins/examples *not* depending on stdweb)
template                = "template.html"   # default: "basic", "console", "xterm", or other built-in target
```

<h4>WASI environment variables</h4>

```toml
[package.metadata.html.wasi.env]
CARGO_HTML      = "1"
RUST_BACKTRACE  = "1"
```

<h4>WASI filesystem mounts</h4>

```toml
[[package.metadata.html.mount]]
source          = "Cargo.toml"
mount           = "/Cargo.toml"

[[package.metadata.html.mount]]
source          = "../../.vscode/"
mount           = "/.vscode/"
```

<h4>Configure WASI behavior</h4>

```toml
[package.metadata.html.wasi]
tty.mode    = "raw", or "line-buffered"
tty.escape  = "none", or "ansi"

trap        = "fatal", "soft-debugger", "debugger", or "fatal-debugger"

determinism = "nondeterministic", or "disabled"
clock       = "nondeterministic", "disabled", or "zero"
sleep       = "nondeterministic", "disabled", "skip", or "busy-wait"
random      = "nondeterministic", "disabled", or "insecure-nondeterministic"

stdin           = "tty", "badfd", or "prompt"
stdout          = "tty", "badfd", "null", "console-log", or "console-error"
stderr          = "tty", "badfd", "null", "console-log", or "console-error"
trace_exit_0    = "tty", "badfd", "null", "console-log", or "console-error"
trace_exit_n    = "tty", "badfd", "null", "console-log", or "console-error"
trace_signal    = "tty", "badfd", "null", "console-log", or "console-error"
trace_io_error  = "tty", "badfd", "null", "console-log", or "console-error"
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
