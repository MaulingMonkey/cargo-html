namespace wasi {
    /**
     * \[[WASI](https://github.com/WebAssembly/WASI/blob/main/phases/snapshot/docs.md#lookupflags)\]
     * Flags determining the method of how paths are resolved.
     */
    export type LookupFlags = u32 & { _not_real: "lookupflags" };



    export const LOOKUPFLAGS_NONE = <LookupFlags>0;

    /** As long as the resolved path corresponds to a symbolic link, it is expanded. */
    export const LOOKUPFLAGS_SYMLINK_FOLLOW = <LookupFlags>1;
}
