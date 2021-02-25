/** \[[WASI](https://github.com/WebAssembly/WASI/blob/main/phases/snapshot/docs.md#-fd-handle)\] A file descriptor handle. */
type Fd = u32 & { _not_real: "fd"; }
