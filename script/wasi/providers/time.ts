namespace wasi {
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
     * *    `"disabled"`            - Don't allow clocks to be queried (will return `ERRNO_NOTCAPABLE`.)
     * *    `"debugger"`            - Like `"disabled"`, but also `debugger;` when syscalls are made.
     * *    `"zero"`                - Pretend it's Jan 1st, 1970, and that all execution is instantanious.
     * *    `"nondeterministic"`    - Allow the real world to leak in, code to self-measure, and [timing attacks](https://en.wikipedia.org/wiki/Timing_attack).
     */
    export function time(i: Imports, memory: MemoryLE, {sleep, clock}: { sleep: "disabled" | "skip" | "busy-wait" | Asyncifier, clock: "disabled" | "debugger" | "zero" | "nondeterministic" }) {
        var mono_total  = 0;
        var prev_mono   = 0;
        try { prev_mono = Date.now(); } catch (e) {}

        console.log("sleep", sleep);
        console.log("clock", clock);

        switch (clock) {
            case "disabled":
            case "debugger":
                var first_break = false;
                i.wasi_snapshot_preview1.clock_res_get  = function clock_res_get_disabled(_id: ClockID, out_resolution: ptr): Errno {
                    if (!first_break) {
                        console.error("clock_res_get: clock access has been disabled");
                        first_break = true;
                    }
                    if (clock === "debugger") debugger;
                    return ERRNO_INVAL;
                };
                i.wasi_snapshot_preview1.clock_time_get = function clock_time_get_disabled(_id: ClockID, precision: TimeStamp, out_time: ptr): Errno {
                    if (!first_break) {
                        console.error("clock_time_get: clock access has been disabled");
                        first_break = true;
                    }
                    if (clock === "debugger") debugger;
                    return ERRNO_INVAL;
                };
                break;
            case "zero":
                i.wasi_snapshot_preview1.clock_res_get  = function clock_res_get_disabled(id: ClockID, out_resolution: ptr): Errno {
                    validate_clockid(id);
                    memory.write_u64(out_resolution, 0, 0xFFFFFFFFFFFFFFFFn as TimeStamp);
                    return ERRNO_SUCCESS;
                };
                i.wasi_snapshot_preview1.clock_time_get = function clock_time_get_disabled(id: ClockID, precision: TimeStamp, out_time: ptr): Errno {
                    validate_clockid(id);
                    memory.write_u64(out_time, 0, 0n as TimeStamp);
                    return ERRNO_SUCCESS;
                };
                break;
            case "nondeterministic":
                i.wasi_snapshot_preview1.clock_res_get  = function clock_res_get_disabled(id: ClockID, out_resolution: ptr): Errno {
                    switch (id) {
                        case CLOCKID_MONOTONIC:
                        case CLOCKID_REALTIME:
                            memory.write_u64(out_resolution, 0, 1000000n as TimeStamp); // assume 1ms precision (spectre mitigations)
                            return ERRNO_SUCCESS;
                        case CLOCKID_PROCESS_CPUTIME_ID:
                        case CLOCKID_THREAD_CPUTIME_ID:
                        default:
                            return ERRNO_INVAL;
                    }
                };
                i.wasi_snapshot_preview1.clock_time_get = function clock_time_get_disabled(id: ClockID, _precision: TimeStamp, out_time: ptr): Errno {
                    var now;
                    try { now = Date.now(); } catch (e) { return ERRNO_INVAL; } // not supported on this thread?
                    switch (id) {
                        case CLOCKID_MONOTONIC:
                            now = Date.now(); // supposedly monotonically increasing, but let's enforce that anyways:
                            if (now > prev_mono) mono_total += now - prev_mono;
                            prev_mono = now;
                            memory.write_u64(out_time, 0, 1000000n * BigInt(mono_total) as TimeStamp);
                            return ERRNO_SUCCESS;
                        case CLOCKID_REALTIME:
                            // `Date.now()` may be monotonically increasing, but `getTime()` shouldn't be:
                            // https://stackoverflow.com/questions/6233927/microsecond-timing-in-javascript
                            //
                            // Additionally, `getTime()` is in UTC, matching what CLOCKID_REALTIME expects.
                            // The only mismatch here is that `getTime` returns *milli*seconds, and WASI expects *nano*seconds.
                            now = new Date().getTime();
                            memory.write_u64(out_time, 0, 1000000n * BigInt(now) as TimeStamp);
                            return ERRNO_SUCCESS;
                        case CLOCKID_PROCESS_CPUTIME_ID:
                        case CLOCKID_THREAD_CPUTIME_ID:
                        default:
                            return ERRNO_INVAL;
                    }
                };
                break;
        }

        // https://github.com/WebAssembly/WASI/blob/main/phases/snapshot/docs.md#sched_yield
        // https://docs.rs/wasi/0.10.2+wasi-snapshot-preview1/src/wasi/lib_generated.rs.html#1907
        switch (sleep) {
            case "disabled":
                i.wasi_snapshot_preview1.sched_yield = function sched_yield_disabled(): Errno {
                    console.error("sched_yield: sleeping has been disabled");
                    debugger;
                    return ERRNO_NOTCAPABLE;
                };
                break;
            case "skip":
            case "busy-wait":
                i.wasi_snapshot_preview1.sched_yield = function sched_yield_skip(): Errno { return ERRNO_SUCCESS; }
                break;
            default:
                i.wasi_snapshot_preview1.sched_yield = function sched_yield_async(): Errno { return sleep.asyncify(async () => {
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

        switch (sleep) {
            case "disabled":
                i.wasi_snapshot_preview1.poll_oneoff = function poll_oneoff_disabled(in_subs: ptr, out_events: ptr, in_nsubs: usize, out_nevents_ptr: ptr): Errno {
                    console.error("poll_oneoff: sleeping has been disabled");
                    debugger;
                    return ERRNO_NOTCAPABLE;
                };
                break;
            case "skip":
                i.wasi_snapshot_preview1.poll_oneoff = function poll_oneoff_skip(in_subs: ptr, out_events: ptr, in_nsubs: usize, out_nevents_ptr: ptr): Errno {
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
                i.wasi_snapshot_preview1.poll_oneoff = function poll_oneoff_busy_wait(in_subs: ptr, out_events: ptr, in_nsubs: usize, out_nevents_ptr: ptr): Errno {
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
                i.wasi_snapshot_preview1.poll_oneoff = function poll_oneoff_async(in_subs: ptr, out_events: ptr, in_nsubs: usize, out_nevents_ptr: ptr): Errno {
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
    }
}
