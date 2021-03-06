namespace wasi {
    /**
     * \[[WASI](https://github.com/WebAssembly/WASI/blob/main/phases/snapshot/docs.md#signal)\]
     * Signal condition.
     */
    export type Signal = u8 & { _not_real: "signal"; }



    /** No signal.  Note that POSIX has special semantics for `kill(pid, 0)`, so this value is reserved. */
    export const SIGNAL_NONE   = <Signal>0;

    /** Hangup.  Action: Terminates the process. */
    export const SIGNAL_HUP    = <Signal>1;

    /** Terminate interrupt signal.  Action: Terminates the process. */
    export const SIGNAL_INT    = <Signal>2;

    /** Terminal quit signal.  Action: Terminates the process. */
    export const SIGNAL_QUIT   = <Signal>3;

    /** Illegal instruction.  Action: Terminates the process. */
    export const SIGNAL_ILL    = <Signal>4;

    /** Trace/breakpoint trap.  ~~Action: Terminates the process.~~  **`debugger;`** in `cargo-html`. */
    export const SIGNAL_TRAP   = <Signal>5;

    /** Process abort signal.  Action: Terminates the process. */
    export const SIGNAL_ABRT   = <Signal>6;

    /** Access to an undefined portion of a memory object.  Action: Terminates the process. */
    export const SIGNAL_BUS    = <Signal>7;

    /** Erroneous arithmetic operation.  Action: Terminates the process. */
    export const SIGNAL_FPE    = <Signal>8;

    /** Kill.  Action: Terminates the process. */
    export const SIGNAL_KILL   = <Signal>9;

    /** User-defined signal 1.  Action: Terminates the process. */
    export const SIGNAL_USR1   = <Signal>10;

    /** Invalid memory reference.  Action: Terminates the process. */
    export const SIGNAL_SEGV   = <Signal>11;

    /** User-defined signal 2.  Action: Terminates the process. */
    export const SIGNAL_USR2   = <Signal>12;

    /** Write on a pipe with no one to read it.  Action: Ignored. */
    export const SIGNAL_PIPE   = <Signal>13;

    /** Alarm clock.  Action: Terminates the process. */
    export const SIGNAL_ALRM   = <Signal>14;

    /** Termination signal.  Action: Terminates the process. */
    export const SIGNAL_TERM   = <Signal>15;

    /** Child process terminated, stopped, or continued.  Action: Ignored. */
    export const SIGNAL_CHLD   = <Signal>16;

    /** Continue executing, if stopped.  Action: Continues executing, if stopped. */
    export const SIGNAL_CONT   = <Signal>17;

    /** Stop executing.  Action: Stops executing. */
    export const SIGNAL_STOP   = <Signal>18;

    /** Terminal stop signal.  Action: Stops executing. */
    export const SIGNAL_TSTP   = <Signal>19;

    /** Background process attempting read.  Action: Stops executing. */
    export const SIGNAL_TTIN   = <Signal>20;

    /** Background process attempting write.  Action: Stops executing. */
    export const SIGNAL_TTOU   = <Signal>21;

    /** High bandwidth data is available at a socket.  Action: Ignored. */
    export const SIGNAL_URG    = <Signal>22;

    /** CPU time limit exceeded.  Action: Terminates the process. */
    export const SIGNAL_XCPU   = <Signal>23;

    /** File size limit exceeded.  Action: Terminates the process. */
    export const SIGNAL_XFSZ   = <Signal>24;

    /** Virtual timer expired.  Action: Terminates the process. */
    export const SIGNAL_VTALRM = <Signal>25;

    /** Profiling timer expired.  Action: Terminates the process. */
    export const SIGNAL_PROF   = <Signal>26;

    /** Window changed.  Action: Ignored. */
    export const SIGNAL_WINCH  = <Signal>27;

    /** I/O possible.  Action: Terminates the process. */
    export const SIGNAL_POLL   = <Signal>28;

    /** Power failure.  Action: Terminates the process. */
    export const SIGNAL_PWR    = <Signal>29;

    /** Bad system call.  Action: Terminates the process. */
    export const SIGNAL_SYS    = <Signal>30;
}
