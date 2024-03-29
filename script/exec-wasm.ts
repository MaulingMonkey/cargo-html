const WASM_PAGE_SIZE = (64 * 1024); // WASM pages are 64 KiB
// Ref: https://webassembly.github.io/spec/core/exec/runtime.html#memory-instances
// Ref: https://github.com/WebAssembly/spec/issues/208


type WasmPlugin = (imports: wasi.Imports) => (exports: Exports) => unknown;

declare var CARGO_HTML_SETTINGS : Settings | undefined;
declare var CARGO_HTML_PLUGINS : [WasmPlugin] | undefined;
declare function __cargo_html_wasmbindgen_bundler_js(importer: (path: string) => unknown): unknown;


function get_settings(): Settings {
    return typeof CARGO_HTML_SETTINGS !== "undefined" ? CARGO_HTML_SETTINGS : {
        env: { "CARGO_HTML": "1", "RUST": "1" },
    };
}

function get_plugins(): WasmPlugin[] {
    return (typeof CARGO_HTML_PLUGINS !== "undefined") ? CARGO_HTML_PLUGINS : [];
}

const MOUNTS : {[name: string]: io.memory.Mount[] | undefined} = {};
function mount_filesystem(name: string, mount: io.memory.Mount) {
    const mounts = MOUNTS[name] = (MOUNTS[name] || []);
    mounts.push(mount);
}

const WASMS : {[name: string]: string | undefined} = {};
function mount_wasm_base64(name: string, wasm: string) {
    WASMS[name] = wasm;
}

async function launch_wasm(name: string) {
    const wasm = WASMS[name];
    const mounts = MOUNTS[name] || [];
    if (wasm === undefined) throw `launch_wasm(${JSON.stringify(name)}): no such wasm module mounted`;

    const settings = get_settings();
    if (document.getElementById("cargo-html-console")) settings.tty = settings.tty || {};

    // Inferred settings, objects, etc.
    const determinism = settings.determinism || "nondeterministic";
    const tty = XTermTty.new(settings) || DomTty.new(settings);
    const args = settings.args || [
        `${document.location.origin}${document.location.pathname}`,
        ...(document.location.search ? decodeURI(document.location.search).substr(1).split(' ') : []) // TODO: quoted arg handling?
    ];
    const sleep = settings.sleep || "nondeterministic";


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
    const is_asyncified = !!WebAssembly.Module.exports(compiled).find(exp => exp.name.startsWith("asyncify_") && exp.kind === "function");
    const asyncifier = is_asyncified ? new Asyncifier() : undefined;
    if (!is_asyncified) console.warn("WASM module not asyncified, stdin DOM reads won't be available.");


    // Setup WASM environment
    const wasm_exports = {}; // we need to be able to resolve imports to not yet defined exports
    const memory : MemoryLE = new MemoryLE(<any>undefined);
    const imports : wasi.Imports = {
        env:                                    {},
        _cargo_html_shenannigans_do_not_use:    {},
        wasi_snapshot_preview1:                 {},
    };

    wasi.nyi      (imports);
    wasi.env      (imports, memory, args, settings.env || {});
    wasi.random   (imports, memory, settings.random || determinism);
    wasi.time     (imports, memory, { sleep: sleep == "nondeterministic" ? (asyncifier || "busy-wait") : sleep, clock: settings.clock || determinism });
    wasi.signals  (imports, memory, tty, settings);
    wasi.fdio     (imports, memory, asyncifier, tty, settings, mounts);

    if (typeof __cargo_html_wasmbindgen_bundler_js !== "undefined") {
        Object.assign(imports, __cargo_html_wasmbindgen_bundler_js(_path => wasm_exports));
    }

    const plugins = get_plugins().map(f => f(imports));


    // Instantiate and hook WASM
    const inst = await WebAssembly.instantiate(compiled, imports as any);
    const exports = <Exports><unknown>inst.exports;
    Object.assign(wasm_exports, exports);
    memory.memory = exports.memory;
    plugins.forEach(plugin => plugin(exports));


    // Launch WASM
    try {
        if      (asyncifier)                    await asyncifier.launch(exports);
        else if (exports.__cargo_html_start)    exports.__cargo_html_start();
        else if (exports._start)                exports._start();
        else if (exports.__wbindgen_start)      exports.__wbindgen_start();
        else                                    throw "WASM module has no entry point\nexpected one of __cargo_html_start, _start, or __wbindgen_start.";

        imports.wasi_snapshot_preview1.proc_exit!(0 as u32);
    } catch (e) {
        switch (e) {
            case "exit":
            case "fatal-signal":
            case "stop-signal":
                break;
            default:
                const trace_uncaught = wasi.TextStreamWriter.from_output(settings.trace_signal || settings.stderr || (tty ? "tty" : "console-error"), "exit-error", tty);
                trace_uncaught?.io(`process terminated by uncaught JavaScript exception:\n${e}`);
                throw e;
        }
    } finally {
        tty?.shutdown();
    }
}
