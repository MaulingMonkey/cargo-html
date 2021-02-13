function exec_base64_wasm(wasm: string) {
    var exports : Exports;
    var memory : WebAssembly.Memory;

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
    const asyncify_byte_count : number = asyncify_page_count * PAGE_SIZE;
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
            const ctx = new Uint32Array(memory.buffer, asyncify_byte_idx, 8);
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

    type Fd     = number & { _not_real: "fd"; }
    type Errno  = number & { _not_real: "errno"; }
    type ptr    = number & { _not_real: "ptr"; }
    type u8     = number & { _not_real: "u8"; }
    type u16    = number & { _not_real: "u16"; }
    type u32    = number & { _not_real: "u32"; }
    type u64    = number & { _not_real: "u64"; } // XXX: number only has 52 bits of precision
    type usize  = number & { _not_real: "usize"; }

    // References:
    // https://docs.rs/wasi-types/0.1.5/src/wasi_types/lib.rs.html
    // https://docs.rs/wasi/0.10.2+wasi-snapshot-preview1/src/wasi/lib_generated.rs.html
    // https://github.com/WebAssembly/WASI/blob/main/phases/snapshot/docs.md

    // https://docs.rs/wasi/0.10.2+wasi-snapshot-preview1/src/wasi/lib_generated.rs.html#27
    const ERRNO_SUCCESS     = <Errno>0;
    const ERRNO_2BIG        = <Errno>1;
    const ERRNO_AGAIN       = <Errno>6;
    const ERRNO_BADF        = <Errno>8;
    const ERRNO_NOTCAPABLE  = <Errno>76;

    const ERRNO_ASYNCIFY    = <Errno>9001; // XXX?

    function read_u8(   ptr: ptr, offset: number): u8       { return new DataView(memory.buffer).getUint8( ptr + offset      ) as u8; }
    function read_u16(  ptr: ptr, offset: number): u16      { return new DataView(memory.buffer).getUint16(ptr + offset, true) as u16; }
    function read_u32(  ptr: ptr, offset: number): u32      { return new DataView(memory.buffer).getUint32(ptr + offset, true) as u32; }
    function read_usize(ptr: ptr, offset: number): usize    { return read_u32(  ptr, offset) as any; }
    function read_ptr(  ptr: ptr, offset: number): ptr      { return read_usize(ptr, offset) as any; }

    // XXX: `number` only guarantees 52-bit precision, so this is pretty bogus
    function read_u64_approx(  ptr: ptr, offset: number): u64 {
        let dv = new DataView(memory.buffer);
        let lo = dv.getUint32(ptr + offset + 0, true);
        let hi = dv.getUint32(ptr + offset + 4, true);
        return (hi * 0x100000000 + lo) as u64;
    }

    function read_u64_pair(  ptr: ptr, offset: number): [u32, u32] {
        let dv = new DataView(memory.buffer);
        let lo = dv.getUint32(ptr + offset + 0, true) as u32;
        let hi = dv.getUint32(ptr + offset + 4, true) as u32;
        return [lo, hi];
    }

    function write_u8(      ptr: ptr, offset: number, value: u8     ) { new DataView(memory.buffer).setUint8( ptr + offset, value      ); }
    function write_u16(     ptr: ptr, offset: number, value: u16    ) { new DataView(memory.buffer).setUint16(ptr + offset, value, true); }
    function write_u32(     ptr: ptr, offset: number, value: u32    ) { new DataView(memory.buffer).setUint32(ptr + offset, value, true); }
    function write_usize(   ptr: ptr, offset: number, value: usize  ) { write_u32(  ptr, offset, value as any); }
    function write_ptr(     ptr: ptr, offset: number, value: ptr    ) { write_usize(ptr, offset, value as any); }
    function write_u64_pair(ptr: ptr, offset: number, [lo, hi]: [u32, u32]) {
        write_u32(ptr, offset+0, lo);
        write_u32(ptr, offset+4, hi);
    }

    function slice(ptr: ptr, start: usize, end: usize): DataView { return new DataView(memory.buffer, ptr+start, end-start); }
    function slice8(ptr: ptr, start: usize, end: usize): Uint8Array { return new Uint8Array(memory.buffer, ptr+start, end-start); }

    function sleep_ms(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(() => resolve(), ms));
    }

    function sleep_ns(ns: number): Promise<void> {
        return sleep_ms(ns / 1000 / 1000);
    }

    function nyi(): Errno {
        debugger;
        return ERRNO_NOTCAPABLE;
    }

    function args_get                   (): Errno { return nyi(); }
    function args_sizes_get             (): Errno { return nyi(); }
    function environ_get                (): Errno { return nyi(); }
    function environ_sizes_get          (): Errno { return nyi(); }
    function clock_res_get              (): Errno { return nyi(); }
    function clock_time_get             (): Errno { return nyi(); }
    function fd_advise                  (): Errno { return nyi(); }
    function fd_allocate                (): Errno { return nyi(); }
    function fd_close                   (): Errno { return nyi(); }
    function fd_datasync                (): Errno { return nyi(); }
    function fd_fdstat_get              (): Errno { return nyi(); }
    function fd_fdstat_set_flags        (): Errno { return nyi(); }
    function fd_fdstat_set_rights       (): Errno { return nyi(); }
    function fd_filestat_get            (): Errno { return nyi(); }
    function fd_filestat_set_size       (): Errno { return nyi(); }
    function fd_filestat_set_times      (): Errno { return nyi(); }
    function fd_pread                   (): Errno { return nyi(); }
    function fd_prestat_get             (): Errno { return nyi(); }
    function fd_prestat_dir_name        (): Errno { return nyi(); }
    function fd_pwrite                  (): Errno { return nyi(); }

    function fd_read(fd: Fd, iovec_array_ptr: ptr, iovec_array_len: usize, nread_ptr: ptr): Errno { return asyncify(async () => {
        // https://docs.rs/wasi/0.10.2+wasi-snapshot-preview1/src/wasi/lib_generated.rs.html#1754

        var nread = 0;
        var errno = ERRNO_SUCCESS;

        for (var iovec_idx = 0; iovec_idx < iovec_array_len; ++iovec_idx) {
            var buf_ptr = read_ptr(iovec_array_ptr, 8 * iovec_idx + 0);
            var buf_len = read_usize(iovec_array_ptr, 8 * iovec_idx + 4);
            if (buf_len <= 0) { continue; }

            switch (fd) {
                case 0: // stdin
                    var read = await stdin_read(buf_len);
                    for (var i=0; i<read.length; ++i) {
                        var b = read[i] as u8;
                        write_u8(buf_ptr, i, b);
                    }
                    nread += read.length;
                    if (read.length < buf_len) {
                        write_usize(nread_ptr, 0, nread as usize);
                        return errno;
                    }
                    break;
                default:
                    errno = ERRNO_BADF;
                    break;
            }
        }

        write_usize(nread_ptr, 0, nread as usize);
        return errno;
    }, ERRNO_ASYNCIFY)}

    function fd_readdir                 (): Errno { return nyi(); }
    function fd_renumber                (): Errno { return nyi(); }
    function fd_seek                    (): Errno { return nyi(); }
    function fd_sync                    (): Errno { return nyi(); }
    function fd_tell                    (): Errno { return nyi(); }

    function fd_write(fd: Fd, ciovec_array_ptr: ptr, ciovec_array_len: usize, nwritten_ptr: ptr): Errno {
        // https://docs.rs/wasi/0.10.2+wasi-snapshot-preview1/src/wasi/lib_generated.rs.html#1796
        // https://nodejs.org/api/wasi.html

        var nwritten = 0;
        var errno = ERRNO_SUCCESS;

        var text = "";
        for (var ciovec_idx = 0; ciovec_idx < ciovec_array_len; ++ciovec_idx) {
            var buf_ptr = read_ptr(ciovec_array_ptr, 8 * ciovec_idx + 0);
            var buf_len = read_usize(ciovec_array_ptr, 8 * ciovec_idx + 4);

            switch (fd) {
                case 1: // stdout
                case 2: // stderr
                    text += new TextDecoder().decode(slice(buf_ptr, 0 as usize, buf_len));
                    nwritten += buf_len;
                    break;
                default:
                    errno = ERRNO_BADF;
                    break;
            }
        }

        console_write(text);

        write_usize(nwritten_ptr, 0, nwritten as usize);
        return errno;
    }

    function path_create_directory      (): Errno { return nyi(); }
    function path_filestats_get         (): Errno { return nyi(); }
    function path_filestat_set_times    (): Errno { return nyi(); }
    function path_link                  (): Errno { return nyi(); }
    function path_open                  (): Errno { return nyi(); }
    function path_readlink              (): Errno { return nyi(); }
    function path_remove_directory      (): Errno { return nyi(); }
    function path_rename                (): Errno { return nyi(); }
    function path_symlink               (): Errno { return nyi(); }
    function path_unlink_file           (): Errno { return nyi(); }

    function poll_oneoff(in_subs: ptr, out_events: ptr, in_nsubs: usize, out_nevents_ptr: ptr): Errno { return asyncify(async () => {
        // https://github.com/WebAssembly/WASI/blob/main/phases/snapshot/docs.md#-poll_oneoffin-constpointersubscription-out-pointerevent-nsubscriptions-size---errno-size
        // https://docs.rs/wasi/0.10.2+wasi-snapshot-preview1/src/wasi/lib_generated.rs.html#1892

        let out_nevents = 0;
        write_usize(out_nevents_ptr, 0, out_nevents as usize);

        if (in_nsubs == 0) { return ERRNO_SUCCESS; }
        if (in_nsubs > 1) { nyi(); return ERRNO_2BIG; }

        for (var sub=0; sub<in_nsubs; ++sub) {
            let sub_base = (in_subs + 48 * sub) as ptr;

            let userdata        = read_u64_pair(sub_base, 0);

            let u_tag           = read_u8( sub_base, 8);
            type Eventtype = u8;
            const EVENTTYPE_CLOCK       = <Eventtype>0;
            const EVENTTYPE_FD_READ     = <Eventtype>1;
            const EVENTTYPE_FD_WRITE    = <Eventtype>2;
            if (u_tag !== EVENTTYPE_CLOCK) {
                return nyi();
            }
            // 7 bytes of padding

            let u_u_clock_id    = read_u32(sub_base, 16);
            type Clockid = u32;
            const CLOCKID_REALTIME              = <Clockid>0; // The clock measuring real time. Time value zero corresponds with 1970-01-01T00:00:00Z.
            const CLOCKID_MONOTONIC             = <Clockid>1; // The store-wide monotonic clock, which is defined as a clock measuring real time, whose value cannot be adjusted and which cannot have negative clock jumps. The epoch of this clock is undefined. The absolute time value of this clock therefore has no meaning.
            const CLOCKID_PROCESS_CPUTIME_ID    = <Clockid>2;
            const CLOCKID_THREAD_CPUTIME_ID     = <Clockid>3;
            // 4 bytes of padding

            let u_u_clock_timeout   = read_u64_approx(sub_base, 24);
            let u_u_clock_precision = read_u64_approx(sub_base, 32);

            let u_u_clock_flags     = read_u16(sub_base, 40);
            const SUBCLOCKFLAGS_SUBSCRIPTION_CLOCK_ABSTIME  = <u16>0x1;
            console.assert(u_u_clock_flags === 0, "u_u_clock_flags !== 0 not yet supported");

            let abs = (u_u_clock_flags & SUBCLOCKFLAGS_SUBSCRIPTION_CLOCK_ABSTIME) !== 0;
            // 6 bytes of padding

            if (abs) {
                return nyi();
            } else {
                switch (u_u_clock_id) {
                    case CLOCKID_REALTIME:
                    case CLOCKID_MONOTONIC:
                        await sleep_ns(u_u_clock_timeout);

                        // https://github.com/WebAssembly/WASI/blob/main/phases/snapshot/docs.md#-event-struct
                        write_u64_pair( out_events, 32 * out_nevents +  0, userdata);
                        write_u32(      out_events, 32 * out_nevents +  8, 0 as u32); // error
                        write_u8(       out_events, 32 * out_nevents + 10, u_tag); // type
                        // fd_readwrite can be skipped for clocks

                        out_nevents += 1;
                        write_usize(out_nevents_ptr, 0, out_nevents as usize);
                        break;
                    default:
                        return nyi();
                }
            }
        }

        write_usize(out_nevents_ptr, 0, in_nsubs);
        return ERRNO_SUCCESS;
    }, ERRNO_ASYNCIFY)}

    function proc_exit(code: number): never {
        // https://docs.rs/wasi/0.10.2+wasi-snapshot-preview1/src/wasi/lib_generated.rs.html#1901
        console_write_proc_exit(code);
        throw "exit";
    }

    function proc_raise                 (): Errno { return nyi(); }

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
            self.crypto.getRandomValues(slice8(buf, 0 as usize, len));
        } else {
            for (var i=0; i<len; ++i) {
                write_u8(buf, i, (0xFF & Math.floor(Math.random()*0x100)) as u8);
            }
        }
        return ERRNO_SUCCESS;
    }

    function sock_recv                  (): Errno { return nyi(); }
    function sock_send                  (): Errno { return nyi(); }
    function sock_shutdown              (): Errno { return nyi(); }

    const imports = {
        wasi_snapshot_preview1: {
            args_get,
            args_sizes_get,
            environ_get,
            environ_sizes_get,
            clock_res_get,
            clock_time_get,
            fd_advise,
            fd_allocate,
            fd_close,
            fd_datasync,
            fd_fdstat_get,
            fd_fdstat_set_flags,
            fd_fdstat_set_rights,
            fd_filestat_get,
            fd_filestat_set_size,
            fd_filestat_set_times,
            fd_pread,
            fd_prestat_get,
            fd_prestat_dir_name,
            fd_pwrite,
            fd_read,
            fd_readdir,
            fd_renumber,
            fd_seek,
            fd_sync,
            fd_tell,
            fd_write,
            path_create_directory,
            path_filestats_get,
            path_filestat_set_times,
            path_link,
            path_open,
            path_readlink,
            path_remove_directory,
            path_rename,
            path_symlink,
            path_unlink_file,
            poll_oneoff,
            proc_exit,
            proc_raise,
            sched_yield,
            random_get,
            sock_recv,
            sock_send,
            sock_shutdown,
        },
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

        memory = exports.memory;
        asyncify_page_idx = memory.grow(asyncify_page_count);
        console.assert(asyncify_page_idx !== -1);
        asyncify_byte_idx = PAGE_SIZE * asyncify_page_idx;

        main();
    });
}
