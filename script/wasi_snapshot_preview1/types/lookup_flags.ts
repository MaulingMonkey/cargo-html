/**
 * Flags determining the method of how paths are resolved.
 *
 * ### See Also
 *
 * * [WASI standard documentation](https://github.com/WebAssembly/WASI/blob/main/phases/snapshot/docs.md#-lookupflags-record)
 */
type LookupFlags = u32 & { _not_real: "lookupflags" }; // LOOKUPFLAGS_* ?

/**
 * As long as the resolved path corresponds to a symbolic link, it is expanded.
 */
const LOOKUPFLAGS_SYMLINK_FOLLOW = <LookupFlags>1;
