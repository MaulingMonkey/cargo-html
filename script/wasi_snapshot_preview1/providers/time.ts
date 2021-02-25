namespace wasi_snapshot_preview1 {
    type Eventtype = u8;
    const EVENTTYPE_CLOCK       = <Eventtype>0;
    const EVENTTYPE_FD_READ     = <Eventtype>1;
    const EVENTTYPE_FD_WRITE    = <Eventtype>2;

    function sleep_ms_async(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(() => resolve(), ms));
    }

    function sleep_ns_async(ns: number): Promise<void> {
        return sleep_ms_async(ns / 1000 / 1000);
    }

    function sleep_ms_busy(ms: number) {
        var prev = undefined;
        while (ms > 0) {
            const now = Date.now();
            const dt = (prev === undefined) ? 0 : Math.max(0, now - prev);
            ms -= dt;
            prev = now;
        }
    }

    function sleep_ns_busy(ns: number) {
        return sleep_ms_busy(ns / 1000 / 1000);
    }

    interface SleepRequest  { type: "sleep", userdata: [u32, u32], nanoseconds: number }
    interface SleepResult   { type: "sleep", userdata: [u32, u32], error: Errno }

    /**
     * Provide time related syscall implementations.
     *
     * ### `sleep` styles
     *
     * *    `"disabled"`    - Log, `debugger;` and return `ERRNO_NOTCAPABLE` if a thread tries to sleep.
     * *    `"skip"`        - Sleep for three days in microsecnds!  A thread trying to sleep is simply ignored.
     * *    `"busy-wait"`   - Wait in a busy loop.  The DOM won't be able to update, so this is discouraged.
     * *    `Asyncifier`    - Turn thread sleeps into yield points for asyncronous promises.
     *
     * ### `clock` styles - **NOT YET IMPLEMENTED**
     *
     * *    `"disabled"`            - Don't allow clocks to be queried.
     * *    `"zero"`                - Pretend it's Jan 1st, 1970, and that all execution is instantanious.
     * *    `"nondeterministic"`    - Allow the real world to leak in, code to self-measure, and [timing attacks](https://en.wikipedia.org/wiki/Timing_attack).
     */
    export function time(memory: MemoryLE, {sleep, clock}: { sleep: "disabled" | "skip" | "busy-wait" | Asyncifier, clock: "disabled" | "zero" | "nondeterministic" }) {
        var real_start = 0;
        try { real_start = Date.now(); } catch (e) {}

        // https://github.com/WebAssembly/WASI/blob/main/phases/snapshot/docs.md#sched_yield
        // https://docs.rs/wasi/0.10.2+wasi-snapshot-preview1/src/wasi/lib_generated.rs.html#1907
        var sched_yield : () => Errno;
        switch (sleep) {
            case "disabled":
                sched_yield = function sched_yield_disabled(): Errno {
                    console.error("sched_yield: sleeping has been disabled");
                    debugger;
                    return ERRNO_NOTCAPABLE;
                };
                break;
            case "skip":
            case "busy-wait":
                sched_yield = function sched_yield_skip(): Errno { return ERRNO_SUCCESS; }
                break;
            default:
                sched_yield = function sched_yield_async(): Errno { return sleep.asyncify(async () => {
                    await sleep_ms_async(0);
                    return ERRNO_SUCCESS;
                }, ERRNO_ASYNCIFY)}
                break;
        }

        function parse_poll_oneoff(in_subs: ptr, out_events: ptr, in_nsubs: usize, out_nevents_ptr: ptr): SleepRequest[] {
            const parsed : SleepRequest[] = [];

            let out_nevents = 0;
            memory.write_usize(out_nevents_ptr, 0, out_nevents as usize);

            for (var sub=0; sub<in_nsubs; ++sub) {
                let sub_base = (in_subs + 48 * sub) as ptr;

                let userdata        = memory.read_u64_pair(sub_base, 0);

                let u_tag           = memory.read_u8( sub_base, 8);
                type Eventtype = u8;
                const EVENTTYPE_CLOCK       = <Eventtype>0;
                const EVENTTYPE_FD_READ     = <Eventtype>1;
                const EVENTTYPE_FD_WRITE    = <Eventtype>2;
                if (u_tag !== EVENTTYPE_CLOCK) throw "only u_tag == EVENTTYPE_CLOCK currently supported";
                // 7 bytes of padding

                let u_u_clock_id        = memory.read_u32(sub_base, 16) as ClockID;
                // 4 bytes of padding
                let u_u_clock_timeout   = memory.read_u64_approx(sub_base, 24);
                let u_u_clock_precision = memory.read_u64_approx(sub_base, 32);

                let u_u_clock_flags     = memory.read_u16(sub_base, 40);
                const SUBCLOCKFLAGS_SUBSCRIPTION_CLOCK_ABSTIME  = <u16>0x1;
                console.assert(u_u_clock_flags === 0, "u_u_clock_flags !== 0 not yet supported");

                let abs = (u_u_clock_flags & SUBCLOCKFLAGS_SUBSCRIPTION_CLOCK_ABSTIME) !== 0;
                // 6 bytes of padding

                if (abs) throw "only relative sleeps currently supported";
                switch (u_u_clock_id) {
                    case CLOCKID_REALTIME:
                    case CLOCKID_MONOTONIC:
                        parsed.push({ type: "sleep", userdata, nanoseconds: u_u_clock_timeout });
                        break;
                    default:
                        throw "only CLOCKID_REALTIME | CLOCKID_MONOTONIC currently supported";
                }
            }

            return parsed;
        }

        function write_poll_oneoff(in_subs: ptr, out_events: ptr, in_nsubs: usize, out_nevents_ptr: ptr, resolved: SleepResult[]): Errno {
            console.assert(resolved.length === in_nsubs);
            for (var sub=0; sub<in_nsubs; ++sub) {
                const r = resolved[sub];
                switch (r.type) {
                    case "sleep":
                        // https://github.com/WebAssembly/WASI/blob/main/phases/snapshot/docs.md#event
                        memory.write_u64_pair( out_events, 32 * sub +  0, r.userdata);
                        memory.write_u16(      out_events, 32 * sub +  8, r.error);
                        memory.write_u8(       out_events, 32 * sub + 10, EVENTTYPE_CLOCK); // type
                        // fd_readwrite can be skipped for clocks
                        break;
                    default:
                        const n : never = r.type;
                        break;
                }
            }
            memory.write_usize(out_nevents_ptr, 0, resolved.length as usize);
            return ERRNO_SUCCESS;
        }

        var poll_oneoff : (in_subs: ptr, out_events: ptr, in_nsubs: usize, out_nevents_ptr: ptr) => Errno;
        switch (sleep) {
            case "disabled":
                poll_oneoff = function poll_oneoff_disabled(in_subs: ptr, out_events: ptr, in_nsubs: usize, out_nevents_ptr: ptr): Errno {
                    console.error("poll_oneoff: sleeping has been disabled");
                    debugger;
                    return ERRNO_NOTCAPABLE;
                };
                break;
            case "skip":
                poll_oneoff = function poll_oneoff_skip(in_subs: ptr, out_events: ptr, in_nsubs: usize, out_nevents_ptr: ptr): Errno {
                    try {
                        if (in_nsubs == 0) return ERRNO_SUCCESS;
                        const parsed = parse_poll_oneoff(in_subs, out_events, in_nsubs, out_nevents_ptr);
                        const ns_to_sleep = Math.min(...parsed.map(p => p.nanoseconds));
                        // don't actually sleep
                        const results : SleepResult[] = parsed.map(p => { return { type: "sleep", userdata: p.userdata, error: (ns_to_sleep >= p.nanoseconds) ? ERRNO_SUCCESS : ERRNO_AGAIN }; });
                        return write_poll_oneoff(in_subs, out_events, in_nsubs, out_nevents_ptr, results);
                    } catch(e) {
                        debugger;
                        return ERRNO_NOTCAPABLE; // XXX: is this the sanest ret?
                    }
                };
                break;
            case "busy-wait":
                poll_oneoff = function poll_oneoff_busy_wait(in_subs: ptr, out_events: ptr, in_nsubs: usize, out_nevents_ptr: ptr): Errno {
                    try {
                        if (in_nsubs == 0) return ERRNO_SUCCESS;
                        const parsed = parse_poll_oneoff(in_subs, out_events, in_nsubs, out_nevents_ptr);
                        const ns_to_sleep = Math.min(...parsed.map(p => p.nanoseconds));
                        sleep_ns_busy(ns_to_sleep);
                        const results : SleepResult[] = parsed.map(p => { return { type: "sleep", userdata: p.userdata, error: (ns_to_sleep >= p.nanoseconds) ? ERRNO_SUCCESS : ERRNO_AGAIN }; });
                        return write_poll_oneoff(in_subs, out_events, in_nsubs, out_nevents_ptr, results);
                    } catch(e) {
                        debugger;
                        return ERRNO_NOTCAPABLE; // XXX: is this the sanest ret?
                    }
                };
                break;
            default:
                poll_oneoff = function poll_oneoff_async(in_subs: ptr, out_events: ptr, in_nsubs: usize, out_nevents_ptr: ptr): Errno {
                    return sleep.asyncify(async () => {
                        try {
                            if (in_nsubs == 0) return ERRNO_SUCCESS;
                            const parsed = parse_poll_oneoff(in_subs, out_events, in_nsubs, out_nevents_ptr);
                            const ns_to_sleep = Math.min(...parsed.map(p => p.nanoseconds));
                            await sleep_ns_async(ns_to_sleep);
                            const results : SleepResult[] = parsed.map(p => { return { type: "sleep", userdata: p.userdata, error: (ns_to_sleep >= p.nanoseconds) ? ERRNO_SUCCESS : ERRNO_AGAIN }; });
                            return write_poll_oneoff(in_subs, out_events, in_nsubs, out_nevents_ptr, results);
                        } catch(e) {
                            debugger;
                            return ERRNO_NOTCAPABLE; // XXX: is this the sanest ret?
                        }
                    }, ERRNO_ASYNCIFY);
                };
                break;
        }

        return { sched_yield, poll_oneoff };
    }
}
