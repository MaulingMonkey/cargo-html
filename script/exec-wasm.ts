function exec_base64_wasm(data: any, wasm: string) {
    var memory : WebAssembly.Memory;

    type Fd     = number & { _not_real: "fd"; }
    type Errno  = number & { _not_real: "errno"; }
    type ptr    = number & { _not_real: "ptr"; }
    type u8     = number & { _not_real: "u8"; }
    type u16    = number & { _not_real: "u16"; }
    type u32    = number & { _not_real: "u32"; }
    type usize  = number & { _not_real: "usize"; }

    const {atomic_sab, stdin_sab} = data;
    const atomic    = new Int32Array(atomic_sab);
    const stdin     = new Uint8Array(stdin_sab);

    // References:
    // https://docs.rs/wasi-types/0.1.5/src/wasi_types/lib.rs.html
    // https://docs.rs/wasi/0.10.2+wasi-snapshot-preview1/src/wasi/lib_generated.rs.html
    // https://github.com/WebAssembly/WASI/blob/main/phases/snapshot/docs.md

    // https://docs.rs/wasi/0.10.2+wasi-snapshot-preview1/src/wasi/lib_generated.rs.html#27
    const ERRNO_SUCCESS     = <Errno>0;
    const ERRNO_BADF        = <Errno>8;
    const ERRNO_NOTCAPABLE  = <Errno>76;

    function read_u8(   ptr: ptr, offset: number): u8       { return new DataView(memory.buffer).getUint8( ptr + offset      ) as u8; }
    function read_u16(  ptr: ptr, offset: number): u16      { return new DataView(memory.buffer).getUint16(ptr + offset, true) as u16; }
    function read_u32(  ptr: ptr, offset: number): u32      { return new DataView(memory.buffer).getUint32(ptr + offset, true) as u32; }
    function read_usize(ptr: ptr, offset: number): usize    { return read_u32(  ptr, offset) as any; }
    function read_ptr(  ptr: ptr, offset: number): ptr      { return read_usize(ptr, offset) as any; }

    function write_u8(      ptr: ptr, offset: number, value: u8     ) { new DataView(memory.buffer).setUint8( ptr + offset, value      ); }
    function write_u16(     ptr: ptr, offset: number, value: u16    ) { new DataView(memory.buffer).setUint16(ptr + offset, value, true); }
    function write_u32(     ptr: ptr, offset: number, value: u32    ) { new DataView(memory.buffer).setUint32(ptr + offset, value, true); }
    function write_usize(   ptr: ptr, offset: number, value: usize  ) { write_u32(  ptr, offset, value as any); }
    function write_ptr(     ptr: ptr, offset: number, value: ptr    ) { write_usize(ptr, offset, value as any); }

    function slice(ptr: ptr, start: usize, end: usize): DataView { return new DataView(memory.buffer, ptr+start, end-start); }

    function nyi(): Errno {
        //debugger;
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

    function fd_read(fd: Fd, iovec_array_ptr: ptr, iovec_array_len: usize, nread_ptr: ptr): Errno {
        // https://docs.rs/wasi/0.10.2+wasi-snapshot-preview1/src/wasi/lib_generated.rs.html#1754

        var nread = 0;
        var errno = ERRNO_SUCCESS;

        for (var iovec_idx = 0; iovec_idx < iovec_array_len; ++iovec_idx) {
            var buf_ptr = read_ptr(iovec_array_ptr, 8 * iovec_idx + 0);
            var buf_len = read_usize(iovec_array_ptr, 8 * iovec_idx + 4);
            if (buf_len <= 0) { continue; }

            switch (fd) {
                case 0: // stdin
                    for (;;) {
                        var consumed    = Atomics.load(atomic, ATOMIC_STDIN_CONSUMED);
                        while (Atomics.wait(atomic, ATOMIC_STDIN_FILLED, consumed) !== "ok") {}
                        var filled      = Atomics.load(atomic, ATOMIC_STDIN_FILLED);
                        var available   = (filled-consumed)|0; // available *to read*
                        console.assert(available > 0);
                        var n = Math.min(available, buf_len);

                        for (var i=0; i<n; ++i) {
                            var b = stdin[(i+consumed)&STDIN_MASK] as u8;
                            work2dom.post({ kind: "console", text: new TextDecoder().decode(new Uint8Array([b])) }); // XXX: local echo
                            write_u8(buf_ptr, i, b);
                        }
                        Atomics.store(atomic, ATOMIC_STDIN_CONSUMED, (consumed+n)|0);

                        nread += n;
                        break;
                    }
                    break;
                default:
                    errno = ERRNO_BADF;
                    break;
            }
        }

        write_usize(nread_ptr, 0, nread as usize);
        return errno;
    }

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

        if (text !== "") {
            work2dom.post({ kind: "console", text });
        }

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
    function poll_oneoff                (): Errno { return nyi(); }

    function proc_exit(code: number): never {
        // https://docs.rs/wasi/0.10.2+wasi-snapshot-preview1/src/wasi/lib_generated.rs.html#1901
        work2dom.post({ kind: "proc_exit", code });
        throw "exit";
    }

    function proc_raise                 (): Errno { return nyi(); }
    function sched_yield                (): Errno { return nyi(); }
    function random_get                 (): Errno { return nyi(); }
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
        memory = <any>m.exports.memory;
        try {
            (m.exports.main as any)();
            proc_exit(0);
        } catch (e) {
            if (e !== "exit") {
                console.error(e);
                debugger;
                throw e;
            }
        } finally {
            self.close();
        }
    });
}
