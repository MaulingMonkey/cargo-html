interface Exports {
    memory:                 WebAssembly.Memory,
    __cargo_html_start?:    () => void,
    _start?:                () => void,
    __wbindgen_start?:      () => void,

    asyncify_start_rewind:  (addr: number) => void,
    asyncify_start_unwind:  (addr: number) => void,
    asyncify_stop_rewind:   () => void,
    asyncify_stop_unwind:   () => void,
}
