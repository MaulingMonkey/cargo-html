namespace wasi {
    /**
     * \[[WASI](https://github.com/WebAssembly/WASI/blob/main/phases/snapshot/docs.md#fstflags)\]
     * Which file time attributes to adjust.
     */
    export type FstFlags = u32 & { _not_real: "fstflags" };



    /** Adjust the last data access timestamp to the value stored in filestat::atim. */
    export const FSTFLAGS_ATIM = <FstFlags>(1 << 0);

    /** Adjust the last data access timestamp to the time of clock clockid::realtime. */
    export const FSTFLAGS_ATIM_NOW = <FstFlags>(1 << 1);

    /** Adjust the last data modification timestamp to the value stored in filestat::mtim. */
    export const FSTFLAGS_MTIM = <FstFlags>(1 << 2);

    /** Adjust the last data modification timestamp to the time of clock clockid::realtime. */
    export const FSTFLAGS_MTIM_NOW = <FstFlags>(1 << 3);
}
