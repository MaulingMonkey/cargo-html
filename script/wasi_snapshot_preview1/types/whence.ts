/**
 * \[[WASI](https://github.com/WebAssembly/WASI/blob/main/phases/snapshot/docs.md#whence)\]
 * The position relative to which to set the offset of the file descriptor.
 */
type Whence = u8 & { _not_real: "whence" };



/** Seek relative to start-of-file. */
const WHENCE_SET        = <Whence>0;

/** Seek relative to current position. */
const WHENCE_CUR        = <Whence>1;

/** Seek relative to end-of-file. */
const WHENCE_END        = <Whence>2;
