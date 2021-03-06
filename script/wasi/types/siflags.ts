namespace wasi {
    /**
     * \[[WASI](https://github.com/WebAssembly/WASI/blob/main/phases/snapshot/docs.md#siflags)\]
     * Flags provided to `sock_send`.
     * As there are currently no flags defined, it must be set to zero.
     */
    export type SiFlags = u16 & { _not_real: "siflags" };



    /** No flags set */
    export const SIFLAGS_NONE = <SiFlags>0;
}
