use std::io::{self, BufRead};
use std::path::*;



/// Reprocess `wasm-bindgen --target bundler ...`'s generated `{target}_bg.js`
///
/// ### Rewrites
/// ```js
/// import * as wasm from './hello-world_bg.wasm';
/// // ...
/// export const __wbindgen_throw = function(arg0, arg1) {
///     throw new Error(getStringFromWasm0(arg0, arg1));
/// };
/// ```
///
/// ### As
/// ```js
/// function wbg(__cargo_html_import) {
///     const __cargo_html_exports = {};
///     const wasm = __cargo_html_import('./hello-world_bg.wasm');
///     // ...
///     __cargo_html_exports.__wbindgen_throw = function(arg0, arg1) {
///         throw new Error(getStringFromWasm0(arg0, arg1));
///     };
///     return { "./hello-world_bg.js": __cargo_html_exports };
/// }
/// ```
pub fn inline_wasm_bindgen_bundler_importer(o: impl std::fmt::Write, function_name: &str, dir: &Path, target: &str) -> io::Result<()> {
    match inline_wasm_bindgen_bundler_importer_impl(o, function_name, dir, target) {
        Ok(()) => Ok(()),
        Err(FmtOrIoError::Fmt(err)) => Err(io::Error::new(io::ErrorKind::Other, format!("error formatting output: {}", err))),
        Err(FmtOrIoError::Io(err))  => Err(err),
    }
}

fn inline_wasm_bindgen_bundler_importer_impl(mut o: impl std::fmt::Write, function_name: &str, dir: &Path, target: &str) -> Result<(), FmtOrIoError> {
    let bg_js = dir.join(format!("{}_bg.js", target));
    let mut bg_js = std::io::BufReader::new(std::fs::File::open(&bg_js)?);

    let mut line = String::new();
    writeln!(o, "function {}(__cargo_html_import) {{", function_name)?;
    writeln!(o, "    const __cargo_html_exports = {{}};")?;
    while { line.clear(); bg_js.read_line(&mut line)? != 0 } {
        let line = line.trim_end();
        if let Some(export) = line.strip_prefix("export const ") {
            // rewrite:     export const __wbindgen_throw = function(arg0, arg1) {
            // as:          __cargo_html_exports.__wbindgen_throw = function(arg0, arg1) {
            writeln!(o,"    __cargo_html_exports.{}", export.trim_start())?;
        } else if let Some(name_args_etc) = line.strip_prefix("export function ") {
            // rewrite:     export function __wbg_alert_e3732caa7aba2934() { ...
            // as:          __cargo_html_exports.__wbg_alert_e3732caa7aba2934 = function __wbg_alert_e3732caa7aba2934() { ...
            if let Some(paren) = name_args_etc.find('(') {
                let name = &name_args_etc[..paren];
                writeln!(o, "    __cargo_html_exports.{name} = function {name_args_etc}", name=name, name_args_etc=name_args_etc)?;
            } else {
                // warning?
                writeln!(o,"    {}", line)?;
            }
        } else if let Some(import_module) = line.strip_prefix("import * as wasm from ").and_then(|line| line.strip_suffix(";")) {
            // rewrite:     import * as wasm from './hello-world_bg.wasm';
            // as:          const wasm = __cargo_html_import('./hello-world_bg.wasm');
            writeln!(o,"    const wasm = __cargo_html_import({});", import_module)?;
        } else {
            writeln!(o,"    {}", line)?;
        }
    }
    writeln!(o, "    return {{ {:?}: __cargo_html_exports }};", format!("./{}_bg.js", target))?;
    writeln!(o, "}}")?;

    Ok(())
}

enum FmtOrIoError {
    Fmt(std::fmt::Error),
    Io (std::io ::Error),
}

impl From<std::fmt::Error> for FmtOrIoError { fn from(err: std::fmt::Error) -> Self { FmtOrIoError::Fmt(err) } }
impl From<std::io ::Error> for FmtOrIoError { fn from(err: std::io ::Error) -> Self { FmtOrIoError::Io(err)  } }
