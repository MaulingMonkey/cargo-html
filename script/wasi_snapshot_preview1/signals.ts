namespace wasi_snapshot_preview1 {
    export function signals(_memory: MemoryLE, style: "disabled" | "enabled") {
        // https://github.com/WebAssembly/WASI/blob/main/phases/snapshot/docs.md#-random_getbuf-pointeru8-buf_len-size---errno

        // https://github.com/WebAssembly/WASI/blob/main/phases/snapshot/docs.md#-proc_exitrval-exitcode
        // https://docs.rs/wasi/0.10.2+wasi-snapshot-preview1/src/wasi/lib_generated.rs.html#1901
        function proc_exit(code: number): never {
            con.write_proc_exit(code);
            throw "exit";
        }

        // https://github.com/WebAssembly/WASI/blob/main/phases/snapshot/docs.md#-proc_raisesig-signal---result-errno
        // https://docs.rs/wasi/0.10.2+wasi-snapshot-preview1/src/wasi/lib_generated.rs.html#1904
        function proc_raise(sig: Signal): Errno {
            switch (sig) {
                case SIGNAL_NONE:   return ERRNO_INVAL;
                case SIGNAL_HUP:    con.write_proc_signal("HUP",  true); throw "fatal-signal";
                case SIGNAL_INT:    con.write_proc_signal("INT",  true); throw "fatal-signal";
                case SIGNAL_QUIT:   con.write_proc_signal("QUIT", true); throw "fatal-signal";
                case SIGNAL_ILL:    con.write_proc_signal("ILL",  true); throw "fatal-signal";
                case SIGNAL_TRAP:
                    console.error("SIGNAL_TRAP");
                    var s = Date.now();
                    debugger;
                    if (Date.now()-s > 15) return ERRNO_SUCCESS; // debugger successfully paused execution
                    // debugger failed to pause execution, so treat this as a fatal error
                    con.write_proc_signal("TRAP", true);
                    throw "fatal-signal"; // TODO: asyncify to allow resuming?
                case SIGNAL_ABRT:   con.write_proc_signal("ABRT",   true ); throw "fatal-signal";
                case SIGNAL_BUS:    con.write_proc_signal("BUS",    true ); throw "fatal-signal";
                case SIGNAL_FPE:    con.write_proc_signal("FPE",    true ); throw "fatal-signal";
                case SIGNAL_KILL:   con.write_proc_signal("KILL",   true ); throw "fatal-signal";
                case SIGNAL_USR1:   con.write_proc_signal("USR1",   true ); throw "fatal-signal";
                case SIGNAL_SEGV:   con.write_proc_signal("SEGV",   true ); throw "fatal-signal";
                case SIGNAL_USR2:   con.write_proc_signal("USR2",   true ); throw "fatal-signal";
                case SIGNAL_PIPE:   return ERRNO_SUCCESS;
                case SIGNAL_ALRM:   con.write_proc_signal("ALRM",   true ); throw "fatal-signal";
                case SIGNAL_TERM:   con.write_proc_signal("TERM",   true ); throw "fatal-signal";
                case SIGNAL_CHLD:   con.write_proc_signal("CHLD",   true ); throw "fatal-signal";
                case SIGNAL_CONT:   con.write_proc_signal("CONT",   true ); throw "fatal-signal";
                case SIGNAL_STOP:   con.write_proc_signal("STOP",   false); throw "stop-signal"; // TODO: asyncify to allow resuming?
                case SIGNAL_TSTP:   con.write_proc_signal("TSTP",   false); throw "stop-signal"; // TODO: asyncify to allow resuming?
                case SIGNAL_TTIN:   con.write_proc_signal("TTIN",   false); throw "stop-signal"; // TODO: asyncify to allow resuming?
                case SIGNAL_TTOU:   con.write_proc_signal("TTOU",   false); throw "stop-signal"; // TODO: asyncify to allow resuming?
                case SIGNAL_URG:    return ERRNO_SUCCESS;
                case SIGNAL_XCPU:   con.write_proc_signal("XCPU",   true); throw "fatal-signal";
                case SIGNAL_XFSZ:   con.write_proc_signal("XFSZ",   true); throw "fatal-signal";
                case SIGNAL_VTALRM: con.write_proc_signal("VTALRM", true); throw "fatal-signal";
                case SIGNAL_PROF:   con.write_proc_signal("PROF",   true); throw "fatal-signal";
                case SIGNAL_WINCH:  return ERRNO_SUCCESS;
                case SIGNAL_POLL:   con.write_proc_signal("POLL",   true); throw "fatal-signal";
                case SIGNAL_PWR:    con.write_proc_signal("PWR",    true); throw "fatal-signal";
                case SIGNAL_SYS:    con.write_proc_signal("SYS",    true); throw "fatal-signal";
            }

            return ERRNO_INVAL;
        }

        switch (style) {
            case "disabled":    return {};
            case "enabled":     return { proc_exit, proc_raise };
        }
    }
}
