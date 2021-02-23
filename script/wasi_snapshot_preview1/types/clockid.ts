/**
 * Error codes returned by functions.
 * 
 * Not all of these error codes are returned by the functions provided by this API;
 * some are used in higher-level library layers,
 * and others are provided merely for alignment with POSIX.
 * 
 * ### See Also
 * 
 * * [Rust wasi crate definition](https://docs.rs/wasi/0.10.2+wasi-snapshot-preview1/src/wasi/lib_generated.rs.html#25)
 * * [WASI standard documentation](https://github.com/WebAssembly/WASI/blob/main/phases/snapshot/docs.md#-errno-variant)
 */
type ClockID = u32 & { _not_real: "clockid"; }

/**
 * The clock measuring real time.
 * Time value zero corresponds with 1970-01-01T00:00:00Z.
 */
const CLOCKID_REALTIME = <ClockID>0;

/**
 * The store-wide monotonic clock, which is defined as a clock measuring real time,
 * whose value cannot be adjusted and which cannot have negative clock jumps.
 * The epoch of this clock is undefined.
 * The absolute time value of this clock therefore has no meaning.
 */
const CLOCKID_MONOTONIC = <ClockID>1;

/**
 * The CPU-time clock associated with the current process.
 */
const CLOCKID_PROCESS_CPUTIME_ID = <ClockID>2;

/**
 * The CPU-time clock associated with the current thread.
 */
const CLOCKID_THREAD_CPUTIME_ID = <ClockID>3;
