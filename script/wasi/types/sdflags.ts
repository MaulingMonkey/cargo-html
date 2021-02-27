/**
 * \[[WASI](https://github.com/WebAssembly/WASI/blob/main/phases/snapshot/docs.md#sdflags)\]
 * Which channels on a socket to shut down.
 */
type SdFlags = u16 & { _not_real: "sdflags" };



/** No flags set */
const SDFLAGS_NONE = <SdFlags>0;

/** Disables further receive operations. */
const SDFLAGS_RD = <SdFlags>(1 << 0);

/** Disables further send operations. */
const SDFLAGS_WR = <SdFlags>(1 << 1);
