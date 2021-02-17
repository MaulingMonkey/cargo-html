// https://docs.rs/wasi/0.10.2+wasi-snapshot-preview1/src/wasi/lib_generated.rs.html#27
type Errno  = number & { _not_real: "errno"; }

const ERRNO_SUCCESS     = <Errno>0;
const ERRNO_2BIG        = <Errno>1;
const ERRNO_AGAIN       = <Errno>6;
const ERRNO_BADF        = <Errno>8;
const ERRNO_NOTCAPABLE  = <Errno>76;

const ERRNO_ASYNCIFY    = <Errno>9001; // XXX?
