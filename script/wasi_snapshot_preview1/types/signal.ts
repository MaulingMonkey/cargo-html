/**
 * Error codes returned by functions.
 * 
 * Not all of these error codes are returned by the functions provided by this API;
 * some are used in higher-level library layers,
 * and others are provided merely for alignment with POSIX.
 * 
 * ### See Also
 * 
 * * [Rust wasi crate definition](https://docs.rs/wasi/0.10.2+wasi-snapshot-preview1/src/wasi/lib_generated.rs.html#641)
 * * [WASI standard documentation](https://github.com/WebAssembly/WASI/blob/main/phases/snapshot/docs.md#-signal-variant)
 */
type Signal = u8 & { _not_real: "signal"; }



/** No signal.  Note that POSIX has special semantics for `kill(pid, 0)`, so this value is reserved. */
const SIGNAL_NONE   = <Signal>0;

/** Hangup.  Action: Terminates the process. */
const SIGNAL_HUP    = <Signal>1;

/** Terminate interrupt signal.  Action: Terminates the process. */
const SIGNAL_INT    = <Signal>2;

/** Terminal quit signal.  Action: Terminates the process. */
const SIGNAL_QUIT   = <Signal>3;

/** Illegal instruction.  Action: Terminates the process. */
const SIGNAL_ILL    = <Signal>4;

/** Trace/breakpoint trap.  ~~Action: Terminates the process.~~  **`debugger;`** in `cargo-html`. */
const SIGNAL_TRAP   = <Signal>5;

/** Process abort signal.  Action: Terminates the process. */
const SIGNAL_ABRT   = <Signal>6;

/** Access to an undefined portion of a memory object.  Action: Terminates the process. */
const SIGNAL_BUS    = <Signal>7;

/** Erroneous arithmetic operation.  Action: Terminates the process. */
const SIGNAL_FPE    = <Signal>8;

/** Kill.  Action: Terminates the process. */
const SIGNAL_KILL   = <Signal>9;

/** User-defined signal 1.  Action: Terminates the process. */
const SIGNAL_USR1   = <Signal>10;

/** Invalid memory reference.  Action: Terminates the process. */
const SIGNAL_SEGV   = <Signal>11;

/** User-defined signal 2.  Action: Terminates the process. */
const SIGNAL_USR2   = <Signal>12;

/** Write on a pipe with no one to read it.  Action: Ignored. */
const SIGNAL_PIPE   = <Signal>13;

/** Alarm clock.  Action: Terminates the process. */
const SIGNAL_ALRM   = <Signal>14;

/** Termination signal.  Action: Terminates the process. */
const SIGNAL_TERM   = <Signal>15;

/** Child process terminated, stopped, or continued.  Action: Ignored. */
const SIGNAL_CHLD   = <Signal>16;

/** Continue executing, if stopped.  Action: Continues executing, if stopped. */
const SIGNAL_CONT   = <Signal>17;

/** Stop executing.  Action: Stops executing. */
const SIGNAL_STOP   = <Signal>18;

/** Terminal stop signal.  Action: Stops executing. */
const SIGNAL_TSTP   = <Signal>19;

/** Background process attempting read.  Action: Stops executing. */
const SIGNAL_TTIN   = <Signal>20;

/** Background process attempting write.  Action: Stops executing. */
const SIGNAL_TTOU   = <Signal>21;

/** High bandwidth data is available at a socket.  Action: Ignored. */
const SIGNAL_URG    = <Signal>22;

/** CPU time limit exceeded.  Action: Terminates the process. */
const SIGNAL_XCPU   = <Signal>23;

/** File size limit exceeded.  Action: Terminates the process. */
const SIGNAL_XFSZ   = <Signal>24;

/** Virtual timer expired.  Action: Terminates the process. */
const SIGNAL_VTALRM = <Signal>25;

/** Profiling timer expired.  Action: Terminates the process. */
const SIGNAL_PROF   = <Signal>26;

/** Window changed.  Action: Ignored. */
const SIGNAL_WINCH  = <Signal>27;

/** I/O possible.  Action: Terminates the process. */
const SIGNAL_POLL   = <Signal>28;

/** Power failure.  Action: Terminates the process. */
const SIGNAL_PWR    = <Signal>29;

/** Bad system call.  Action: Terminates the process. */
const SIGNAL_SYS    = <Signal>30;
