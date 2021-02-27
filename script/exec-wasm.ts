const WASM_PAGE_SIZE = (64 * 1024); // WASM pages are 64 KiB
// Ref: https://webassembly.github.io/spec/core/exec/runtime.html#memory-instances
// Ref: https://github.com/WebAssembly/spec/issues/208


declare function __cargo_html_wasmbindgen_bundler_js(importer: (path: string) => unknown): unknown;

async function exec_base64_wasm(settings: Settings, wasm: string) {
    // Inferred settings, objects, etc.
    const determinism = settings.determinism || "nondeterministic";
    const domtty = DomTty.new(settings);
    const args = settings.args || [
        `${document.location.origin}${document.location.pathname}`,
        ...(document.location.search ? decodeURI(document.location.search).substr(1).split(' ') : []) // TODO: quoted arg handling?
    ];


    // Compile WASM
    const binary = atob(wasm);
    const typedarray = new Uint8Array(binary.length);
    for (var i=0; i<binary.length; ++i) { typedarray[i] = binary.charCodeAt(i); }
    const compiled = await WebAssembly.compile(typedarray);
    if (false) { // debug spam
        WebAssembly.Module.imports(compiled).forEach(function (imp) { console.log("import", imp); });
        WebAssembly.Module.exports(compiled).forEach(function (exp) { console.log("export", exp); });
    }


    // Reflect WASM
    const is_asyncified = !!!WebAssembly.Module.exports(compiled).find(exp => exp.name.startsWith("asyncify_") && exp.name === "function");
    const asyncifier = is_asyncified ? new Asyncifier() : undefined;
    if (!is_asyncified) console.warn("WASM module contains no asyncify_* symbols, async I/O won't be available.");


    // Setup WASM environment
    const wasm_exports = {}; // we need to be able to resolve imports to not yet defined exports
    const memory : MemoryLE = new MemoryLE(<any>undefined);
    const imports : Imports = {
        env:                    {},
        wasi_snapshot_preview1: {},
    };

    wasi_snapshot_preview1.nyi      (imports);
    wasi_snapshot_preview1.env      (imports, memory, args, settings.env || {});
    wasi_snapshot_preview1.random   (imports, memory, settings.random || determinism);
    wasi_snapshot_preview1.time     (imports, memory, { sleep: settings.sleep === "nondeterministic" ? (asyncifier || "busy-wait") : (settings.sleep || "busy-wait"), clock: settings.clock || determinism });
    wasi_snapshot_preview1.signals  (imports, memory, domtty, settings);
    if (asyncifier !== undefined)   wasi_snapshot_preview1.io(imports, memory, asyncifier, domtty, settings);
    // XXX: need non-async I/O options

    if (typeof __cargo_html_wasmbindgen_bundler_js !== "undefined") {
        Object.assign(imports, __cargo_html_wasmbindgen_bundler_js(_path => wasm_exports));
    }


    // Instantiate and hook WASM
    const inst = await WebAssembly.instantiate(compiled, imports as any);
    const exports = <Exports><unknown>inst.exports;
    Object.assign(wasm_exports, exports);
    memory.memory = exports.memory;


    // Launch WASM
    try {
        if (asyncifier) {
            await asyncifier.launch(exports);
        //} else if (exports.__wbindgen_start) { // https://github.com/MaulingMonkey/cargo-html/issues/19
        //    exports.__wbindgen_start();
        } else {
            exports._start();
        }
        imports.wasi_snapshot_preview1.proc_exit!(0 as u32);
    } catch (e) {
        switch (e) {
            case "exit":
            case "fatal-signal":
            case "stop-signal":
                break;
            default:
                const trace_uncaught = wasi_snapshot_preview1.TextStreamWriter.from_output(settings.trace_signal || settings.stderr || (domtty ? "dom" : "console-error"), "#F44", domtty);
                trace_uncaught?.io(`process terminated by uncaught JavaScript exception:\n${e}`);
                throw e;
        }
    } finally {
        domtty?.shutdown();
    }
}


function main(settings: Settings) {
    exec_base64_wasm(settings, "{BASE64_WASM32}");
}
