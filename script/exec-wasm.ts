const WASM_PAGE_SIZE = (64 * 1024); // WASM pages are 64 KiB
// Ref: https://webassembly.github.io/spec/core/exec/runtime.html#memory-instances
// Ref: https://github.com/WebAssembly/spec/issues/208

type Fd = number & { _not_real: "fd"; }

function exec_base64_wasm(wasm: string) {
    var exports : Exports;
    var memory : MemoryLE;

    function main() {
        try {
            (exports.main)();
            if (unwinding) {
                unwinding = false;
                exports.asyncify_stop_unwind();
            } else {
                proc_exit(0);
            }
        } catch (e) {
            if (e !== "exit") {
                console.error(e);
                debugger;
                throw e;
            }
        }
    }

    const asyncify_page_count : number = 1;
    const asyncify_byte_count : number = asyncify_page_count * WASM_PAGE_SIZE;
    var asyncify_page_idx : number;
    var asyncify_byte_idx : number;

    var rewinding                   = false;
    var unwinding                   = false;
    var rewind_result : any         = undefined;
    var rewind_exception : unknown  = undefined;

    // https://kripken.github.io/blog/wasm/2019/07/16/asyncify.html
    function asyncify<R>(f: () => PromiseLike<R>, waiting: R): R {
        if (!rewinding) {
            f().then(
                (result) => {
                    rewinding           = true;
                    rewind_result       = result;
                    rewind_exception    = undefined;
                    // shouldn't need to modify memory - should've been populated by code before asyncify_start_unwind
                    exports.asyncify_start_rewind(asyncify_byte_idx);
                    main();
                },
                (error_reason) => {
                    rewinding           = true;
                    rewind_result       = undefined;
                    rewind_exception    = error_reason === undefined ? "undefined reason" : error_reason;
                    // shouldn't need to modify memory - should've been populated by code before asyncify_start_unwind
                    exports.asyncify_start_rewind(asyncify_byte_idx);
                    main();
                },
            );

            unwinding = true;
            const ctx = new Uint32Array(memory.memory.buffer, asyncify_byte_idx, 8);
            ctx[0] = asyncify_byte_idx + 8;
            ctx[1] = asyncify_byte_idx + asyncify_byte_count;
            exports.asyncify_start_unwind(asyncify_byte_idx);

            return waiting;
        } else { // rewinding
            rewinding = false;
            exports.asyncify_stop_rewind();
            if (rewind_exception !== undefined) {
                throw rewind_exception;
            }
            return rewind_result;
        };
    }

    // References:
    // https://docs.rs/wasi-types/0.1.5/src/wasi_types/lib.rs.html
    // https://docs.rs/wasi/0.10.2+wasi-snapshot-preview1/src/wasi/lib_generated.rs.html
    // https://github.com/WebAssembly/WASI/blob/main/phases/snapshot/docs.md

    function sleep_ms(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(() => resolve(), ms));
    }

    function sleep_ns(ns: number): Promise<void> {
        return sleep_ms(ns / 1000 / 1000);
    }

    function fd_read(fd: Fd, iovec_array_ptr: ptr, iovec_array_len: usize, nread_ptr: ptr): Errno { return asyncify(async () => {
        // https://docs.rs/wasi/0.10.2+wasi-snapshot-preview1/src/wasi/lib_generated.rs.html#1754

        var nread = 0;
        var errno = ERRNO_SUCCESS;

        for (var iovec_idx = 0; iovec_idx < iovec_array_len; ++iovec_idx) {
            var buf_ptr = memory.read_ptr(iovec_array_ptr, 8 * iovec_idx + 0);
            var buf_len = memory.read_usize(iovec_array_ptr, 8 * iovec_idx + 4);
            if (buf_len <= 0) { continue; }

            switch (fd) {
                case 0: // stdin
                    var read = await stdin.read(buf_len);
                    for (var i=0; i<read.length; ++i) {
                        var b = read[i] as u8;
                        memory.write_u8(buf_ptr, i, b);
                    }
                    nread += read.length;
                    if (read.length < buf_len) {
                        memory.write_usize(nread_ptr, 0, nread as usize);
                        return errno;
                    }
                    break;
                default:
                    errno = ERRNO_BADF;
                    break;
            }
        }

        memory.write_usize(nread_ptr, 0, nread as usize);
        return errno;
    }, ERRNO_ASYNCIFY)}

    function fd_write(fd: Fd, ciovec_array_ptr: ptr, ciovec_array_len: usize, nwritten_ptr: ptr): Errno {
        // https://docs.rs/wasi/0.10.2+wasi-snapshot-preview1/src/wasi/lib_generated.rs.html#1796
        // https://nodejs.org/api/wasi.html

        var nwritten = 0;
        var errno = ERRNO_SUCCESS;

        var text = "";
        for (var ciovec_idx = 0; ciovec_idx < ciovec_array_len; ++ciovec_idx) {
            var buf_ptr = memory.read_ptr(ciovec_array_ptr, 8 * ciovec_idx + 0);
            var buf_len = memory.read_usize(ciovec_array_ptr, 8 * ciovec_idx + 4);

            switch (fd) {
                case 1: // stdout
                case 2: // stderr
                    text += new TextDecoder().decode(memory.slice(buf_ptr, 0 as usize, buf_len));
                    nwritten += buf_len;
                    break;
                default:
                    errno = ERRNO_BADF;
                    break;
            }
        }

        con.write(text);

        memory.write_usize(nwritten_ptr, 0, nwritten as usize);
        return errno;
    }

    function poll_oneoff(in_subs: ptr, out_events: ptr, in_nsubs: usize, out_nevents_ptr: ptr): Errno { return asyncify(async () => {
        // https://github.com/WebAssembly/WASI/blob/main/phases/snapshot/docs.md#-poll_oneoffin-constpointersubscription-out-pointerevent-nsubscriptions-size---errno-size
        // https://docs.rs/wasi/0.10.2+wasi-snapshot-preview1/src/wasi/lib_generated.rs.html#1892

        let out_nevents = 0;
        memory.write_usize(out_nevents_ptr, 0, out_nevents as usize);

        if (in_nsubs == 0) { return ERRNO_SUCCESS; }
        if (in_nsubs > 1) { wasi_snapshot_preview1.nyi.nyi(); return ERRNO_2BIG; }

        for (var sub=0; sub<in_nsubs; ++sub) {
            let sub_base = (in_subs + 48 * sub) as ptr;

            let userdata        = memory.read_u64_pair(sub_base, 0);

            let u_tag           = memory.read_u8( sub_base, 8);
            type Eventtype = u8;
            const EVENTTYPE_CLOCK       = <Eventtype>0;
            const EVENTTYPE_FD_READ     = <Eventtype>1;
            const EVENTTYPE_FD_WRITE    = <Eventtype>2;
            if (u_tag !== EVENTTYPE_CLOCK) {
                return wasi_snapshot_preview1.nyi.nyi();
            }
            // 7 bytes of padding

            let u_u_clock_id    = memory.read_u32(sub_base, 16);
            type Clockid = u32;
            const CLOCKID_REALTIME              = <Clockid>0; // The clock measuring real time. Time value zero corresponds with 1970-01-01T00:00:00Z.
            const CLOCKID_MONOTONIC             = <Clockid>1; // The store-wide monotonic clock, which is defined as a clock measuring real time, whose value cannot be adjusted and which cannot have negative clock jumps. The epoch of this clock is undefined. The absolute time value of this clock therefore has no meaning.
            const CLOCKID_PROCESS_CPUTIME_ID    = <Clockid>2;
            const CLOCKID_THREAD_CPUTIME_ID     = <Clockid>3;
            // 4 bytes of padding

            let u_u_clock_timeout   = memory.read_u64_approx(sub_base, 24);
            let u_u_clock_precision = memory.read_u64_approx(sub_base, 32);

            let u_u_clock_flags     = memory.read_u16(sub_base, 40);
            const SUBCLOCKFLAGS_SUBSCRIPTION_CLOCK_ABSTIME  = <u16>0x1;
            console.assert(u_u_clock_flags === 0, "u_u_clock_flags !== 0 not yet supported");

            let abs = (u_u_clock_flags & SUBCLOCKFLAGS_SUBSCRIPTION_CLOCK_ABSTIME) !== 0;
            // 6 bytes of padding

            if (abs) {
                return wasi_snapshot_preview1.nyi.nyi();
            } else {
                switch (u_u_clock_id) {
                    case CLOCKID_REALTIME:
                    case CLOCKID_MONOTONIC:
                        await sleep_ns(u_u_clock_timeout);

                        // https://github.com/WebAssembly/WASI/blob/main/phases/snapshot/docs.md#-event-struct
                        memory.write_u64_pair( out_events, 32 * out_nevents +  0, userdata);
                        memory.write_u32(      out_events, 32 * out_nevents +  8, 0 as u32); // error
                        memory.write_u8(       out_events, 32 * out_nevents + 10, u_tag); // type
                        // fd_readwrite can be skipped for clocks

                        out_nevents += 1;
                        memory.write_usize(out_nevents_ptr, 0, out_nevents as usize);
                        break;
                    default:
                        return wasi_snapshot_preview1.nyi.nyi();
                }
            }
        }

        memory.write_usize(out_nevents_ptr, 0, in_nsubs);
        return ERRNO_SUCCESS;
    }, ERRNO_ASYNCIFY)}

    function proc_exit(code: number): never {
        // https://docs.rs/wasi/0.10.2+wasi-snapshot-preview1/src/wasi/lib_generated.rs.html#1901
        con.write_proc_exit(code);
        throw "exit";
    }

    function sched_yield(): Errno { return asyncify(async () => {
        // https://github.com/WebAssembly/WASI/blob/main/phases/snapshot/docs.md#-sched_yield---errno
        // https://docs.rs/wasi/0.10.2+wasi-snapshot-preview1/src/wasi/lib_generated.rs.html#1907
        await sleep_ms(0);
        return ERRNO_SUCCESS;
    }, ERRNO_ASYNCIFY)}

    function random_get(buf: ptr, len: usize): Errno {
        // https://github.com/WebAssembly/WASI/blob/main/phases/snapshot/docs.md#-random_getbuf-pointeru8-buf_len-size---errno
        // https://docs.rs/wasi/0.10.2+wasi-snapshot-preview1/src/wasi/lib_generated.rs.html#1914
        if ("crypto" in self) {
            self.crypto.getRandomValues(memory.slice8(buf, 0 as usize, len));
        } else {
            for (var i=0; i<len; ++i) {
                memory.write_u8(buf, i, (0xFF & Math.floor(Math.random()*0x100)) as u8);
            }
        }
        return ERRNO_SUCCESS;
    }

    const imports = {
        wasi_snapshot_preview1: Object.assign(
            {},
            wasi_snapshot_preview1.nyi,
            {
                fd_read,
                fd_write,
                poll_oneoff,
                proc_exit,
                sched_yield,
                random_get,
            }
        ),
    };

    interface Exports {
        memory:                 WebAssembly.Memory,
        main:                   () => void, // XXX: right signature?

        asyncify_start_rewind:  (addr: number) => void,
        asyncify_start_unwind:  (addr: number) => void,
        asyncify_stop_rewind:   () => void,
        asyncify_stop_unwind:   () => void,
    }

    const binary = atob(wasm);
    const typedarray = new Uint8Array(binary.length);
    for (var i=0; i<binary.length; ++i) { typedarray[i] = binary.charCodeAt(i); }

    WebAssembly.compile(typedarray).then(function (m) {
        if (false) {
            WebAssembly.Module.imports(m).forEach(function (imp) {
                console.log("import", imp);
            });
            WebAssembly.Module.exports(m).forEach(function (exp) {
                console.log("export", exp);
            });
        }
        return WebAssembly.instantiate(m, imports);
    }).then(function (m) {
        exports = <Exports><unknown>m.exports;

        memory = new MemoryLE(exports.memory);
        asyncify_page_idx = memory.memory.grow(asyncify_page_count);
        console.assert(asyncify_page_idx !== -1);
        asyncify_byte_idx = WASM_PAGE_SIZE * asyncify_page_idx;

        main();
    });
}
