const WASM_PAGE_SIZE = (64 * 1024); // WASM pages are 64 KiB
// Ref: https://webassembly.github.io/spec/core/exec/runtime.html#memory-instances
// Ref: https://github.com/WebAssembly/spec/issues/208


async function exec_base64_wasm(settings: Settings, wasm: string) {
    // Inferred settings
    const determinism = settings.determinism || "nondeterministic";
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
    const memory : MemoryLE = new MemoryLE(<any>undefined);
    const imports = { wasi_snapshot_preview1: {} };
    Object.assign(
        imports.wasi_snapshot_preview1,
        wasi_snapshot_preview1.nyi      (),
        wasi_snapshot_preview1.env      (memory, args, settings.env || {}),
        wasi_snapshot_preview1.random   (memory, settings.random || determinism),
        wasi_snapshot_preview1.time     (memory, { sleep: settings.sleep === "nondeterministic" ? (asyncifier || "busy-wait") : (settings.sleep || "busy-wait"), clock: settings.clock || determinism }),
        wasi_snapshot_preview1.signals  (memory, "enabled"),
    );
    if (asyncifier !== undefined) Object.assign(
        imports.wasi_snapshot_preview1,
        wasi_snapshot_preview1.io(memory, asyncifier, settings),
    );
    // XXX: need non-async I/O options


    // Instantiate and hook WASM
    const inst = await WebAssembly.instantiate(compiled, imports);
    const exports = <Exports><unknown>inst.exports;
    memory.memory = exports.memory;


    // Launch WASM
    if (asyncifier) {
        asyncifier.launch(exports);
    } else try {
        con.write_proc_exit(exports._start() || 0);
    } catch (e) {
        switch (e) {
            case "exit":
            case "fatal-signal":
            case "stop-signal":
                break;
            default:
                console.error(e);
                debugger;
                throw e;
        }
    }
}


function main(settings: Settings) {
    exec_base64_wasm(settings, "{BASE64_WASM32}");
}
