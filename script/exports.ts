interface Exports {
    memory:                 WebAssembly.Memory,
    _start:                 () => void,
    __wbindgen_start?:      () => void, // https://github.com/MaulingMonkey/cargo-html/issues/19

    asyncify_start_rewind:  (addr: number) => void,
    asyncify_start_unwind:  (addr: number) => void,
    asyncify_stop_rewind:   () => void,
    asyncify_stop_unwind:   () => void,
}
