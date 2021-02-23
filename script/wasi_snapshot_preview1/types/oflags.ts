/**
 * Open flags used by `path_open`.
 *
 * ### See Also
 *
 * * [WASI standard documentation](https://github.com/WebAssembly/WASI/blob/main/phases/snapshot/docs.md#-oflags-record)
 */
type OFlags = u16 & { _not_real: "oflags" }; // LOOKUPFLAGS_* ?

/** Create file if it does not exist. */
const OFLAGS_CREAT = <OFlags>(1 << 0);

/** Fail if not a directory. */
const OFLAGS_DIRECTORY = <OFlags>(1 << 1);

/** Fail if file already exists. */
const OFLAGS_EXCL = <OFlags>(1 << 2);

/** Truncate file to size 0. */
const OFLAGS_TRUNC = <OFlags>(1 << 3);
