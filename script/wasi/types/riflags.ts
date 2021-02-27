/**
 * \[[WASI](https://github.com/WebAssembly/WASI/blob/main/phases/snapshot/docs.md#riflags)\]
 * Flags provided to `sock_recv`.
 */
type RiFlags = u16 & { _not_real: "riflags" };



/** Returns the message without removing it from the socket's receive queue. */
const RIFLAGS_RECV_PEEK     = <RiFlags>(1 << 0);

/** On byte-stream sockets, block until the full amount of data can be returned. */
const RIFLAGS_RECV_WAITALL  = <RiFlags>(1 << 1);
