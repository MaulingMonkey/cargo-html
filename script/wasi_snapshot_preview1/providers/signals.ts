namespace wasi_snapshot_preview1 {
    /**
     * Provide the `proc_*` syscalls.  This has two available `style`s:
     *
     * *    `"disabled"` - don't provide the syscall at all.
     *
     *
     * *    `"enabled"` - provides a variety of behaviors:
     *      * Print exit codes and signals to the HTML console (if available)
     *      * Invoke `debugger;` for `SIGNAL_TRAP`
     *      * Throw `"exit"`, `"fatal-signal"`, or `"stop-signal"` for fatal/stop signals.
     *      * Return `ERRNO_SUCCESS` or `ERRNO_INVAL` for non-fatal or invalid signals.
     *
     *
     * A future implementation should probably provider Asyncifier support to let execution paused by `SIGNAL_STOP` etc. to resume if so desired.
     */
    export function signals(_memory: MemoryLE, domtty: DomTty | undefined, settings: Settings) {
        const trace_exit_0 = TextStreamWriter.from_output(settings.trace_exit_0 || settings.stdout || (domtty ? "dom" : "console-log"  ), "#888", domtty);
        const trace_exit_n = TextStreamWriter.from_output(settings.trace_exit_n || settings.stderr || (domtty ? "dom" : "console-error"), "#F44", domtty);
        const trace_signal = TextStreamWriter.from_output(settings.trace_signal || settings.stderr || (domtty ? "dom" : "console-error"), "#F44", domtty);

        function sig(sig: string, fatal: boolean): never {
            trace_signal?.io(`process ${fatal ? "killed" : "stopped"} by signal SIG${sig}`);
            throw fatal ? "fatal-signal" : "stop-signal";
        }

        // https://github.com/WebAssembly/WASI/blob/main/phases/snapshot/docs.md#-random_getbuf-pointeru8-buf_len-size---errno

        // https://github.com/WebAssembly/WASI/blob/main/phases/snapshot/docs.md#-proc_exitrval-exitcode
        // https://docs.rs/wasi/0.10.2+wasi-snapshot-preview1/src/wasi/lib_generated.rs.html#1901
        function proc_exit(code: number): never {
            if (code === 0) trace_exit_0?.io(`process exited with code ${code}`);
            else            trace_exit_n?.io(`process exited with code ${code}`);
            throw "exit";
        }

        // https://github.com/WebAssembly/WASI/blob/main/phases/snapshot/docs.md#-proc_raisesig-signal---result-errno
        // https://docs.rs/wasi/0.10.2+wasi-snapshot-preview1/src/wasi/lib_generated.rs.html#1904
        function proc_raise(code: Signal): Errno {
            switch (code) {
                case SIGNAL_NONE:   return ERRNO_INVAL;
                case SIGNAL_HUP:    sig("HUP",  true);
                case SIGNAL_INT:    sig("INT",  true);
                case SIGNAL_QUIT:   sig("QUIT", true);
                case SIGNAL_ILL:    sig("ILL",  true);
                case SIGNAL_TRAP:
                    const trap = settings.trap || "debugger";

                    if (trap === "fatal") sig("TRAP", true);

                    console.error("SIGNAL_TRAP");
                    var s = Date.now();
                    debugger;

                    switch (trap) {
                        case "soft-debugger":
                            return ERRNO_SUCCESS;
                        case "debugger":
                            if (Date.now()-s > 15) return ERRNO_SUCCESS; // debugger successfully paused execution
                            sig("TRAP", true);
                        case "fatal-debugger":
                            sig("TRAP", true);
                    }
                case SIGNAL_ABRT:   sig("ABRT",   true );
                case SIGNAL_BUS:    sig("BUS",    true );
                case SIGNAL_FPE:    sig("FPE",    true );
                case SIGNAL_KILL:   sig("KILL",   true );
                case SIGNAL_USR1:   sig("USR1",   true );
                case SIGNAL_SEGV:   sig("SEGV",   true );
                case SIGNAL_USR2:   sig("USR2",   true );
                case SIGNAL_PIPE:   return ERRNO_SUCCESS;
                case SIGNAL_ALRM:   sig("ALRM",   true );
                case SIGNAL_TERM:   sig("TERM",   true );
                case SIGNAL_CHLD:   sig("CHLD",   true );
                case SIGNAL_CONT:   sig("CONT",   true );
                case SIGNAL_STOP:   sig("STOP",   false);
                case SIGNAL_TSTP:   sig("TSTP",   false);
                case SIGNAL_TTIN:   sig("TTIN",   false);
                case SIGNAL_TTOU:   sig("TTOU",   false);
                case SIGNAL_URG:    return ERRNO_SUCCESS;
                case SIGNAL_XCPU:   sig("XCPU",   true);
                case SIGNAL_XFSZ:   sig("XFSZ",   true);
                case SIGNAL_VTALRM: sig("VTALRM", true);
                case SIGNAL_PROF:   sig("PROF",   true);
                case SIGNAL_WINCH:  return ERRNO_SUCCESS;
                case SIGNAL_POLL:   sig("POLL",   true);
                case SIGNAL_PWR:    sig("PWR",    true);
                case SIGNAL_SYS:    sig("SYS",    true);
            }

            return ERRNO_INVAL;
        }

        return { proc_exit, proc_raise };
    }
}
