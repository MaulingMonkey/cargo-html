/**
 * \[[WASI](https://github.com/WebAssembly/WASI/blob/main/phases/snapshot/docs.md#clockid)\]
 * Identifiers for clocks.
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
