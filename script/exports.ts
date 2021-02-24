interface Exports {
    memory:                 WebAssembly.Memory,
    _start:                 () => number, // XXX: right signature?

    asyncify_start_rewind:  (addr: number) => void,
    asyncify_start_unwind:  (addr: number) => void,
    asyncify_stop_rewind:   () => void,
    asyncify_stop_unwind:   () => void,
}
