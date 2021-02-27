namespace wasi {
    /**
     * \[[WASI](https://github.com/WebAssembly/WASI/blob/main/phases/snapshot/docs.md#roflags)\]
     * Flags returned by `sock_recv`.
     */
    export type RoFlags = u16 & { _not_real: "roflags" };



    /** Returned by `sock_recv`: Message data has been truncated. */
    export const ROFLAGS_RECV_DATA_TRUNCATED = <RoFlags>(1 << 0);
}
