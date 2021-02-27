namespace wasi {
    /** \[[WASI](https://github.com/WebAssembly/WASI/blob/main/phases/snapshot/docs.md#fd)\] A file descriptor handle. */
    export type Fd = u32 & { _not_real: "fd"; }
}
