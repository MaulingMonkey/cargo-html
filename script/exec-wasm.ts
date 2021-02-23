const WASM_PAGE_SIZE = (64 * 1024); // WASM pages are 64 KiB
// Ref: https://webassembly.github.io/spec/core/exec/runtime.html#memory-instances
// Ref: https://github.com/WebAssembly/spec/issues/208

type Fd = u32 & { _not_real: "fd"; }

function exec_base64_wasm(wasm: string) {
    var exports : Exports;
    const memory : MemoryLE = new MemoryLE(<any>undefined);
    const asyncifier = new Asyncifier();

    const imports = {
        wasi_snapshot_preview1: Object.assign(
            {},
            wasi_snapshot_preview1.nyi      (),
            wasi_snapshot_preview1.env      (memory, ["index.html", "--test"], { "KEY": "VALUE", "CARGO_HTML": "YES" }),
            wasi_snapshot_preview1.random   (memory, "nondeterministic"),
            wasi_snapshot_preview1.time     (memory, { sleep: asyncifier, clock: "nondeterministic" }),
            wasi_snapshot_preview1.signals  (memory, "enabled"),
            wasi_snapshot_preview1.io       (memory, asyncifier, {}),
        ),
    };

    const binary = atob(wasm);
    const typedarray = new Uint8Array(binary.length);
    for (var i=0; i<binary.length; ++i) { typedarray[i] = binary.charCodeAt(i); }

    WebAssembly.compile(typedarray).then(function (m) {
        if (false) {
            WebAssembly.Module.imports(m).forEach(function (imp) {
                console.log("import", imp);
            });
            WebAssembly.Module.exports(m).forEach(function (exp) {
                console.log("export", exp);
            });
        }
        return WebAssembly.instantiate(m, imports);
    }).then(function (m) {
        exports = <Exports><unknown>m.exports;

        memory.memory = exports.memory;

        asyncifier.launch(exports);
    });
}
