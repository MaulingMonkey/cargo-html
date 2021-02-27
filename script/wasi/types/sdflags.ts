namespace wasi {
    /**
     * \[[WASI](https://github.com/WebAssembly/WASI/blob/main/phases/snapshot/docs.md#sdflags)\]
     * Which channels on a socket to shut down.
     */
    export type SdFlags = u16 & { _not_real: "sdflags" };



    /** No flags set */
    export const SDFLAGS_NONE = <SdFlags>0;

    /** Disables further receive operations. */
    export const SDFLAGS_RD = <SdFlags>(1 << 0);

    /** Disables further send operations. */
    export const SDFLAGS_WR = <SdFlags>(1 << 1);
}
