function exec_base64_wasm(wasm) {
    const con       = document.getElementById("console");
    const cursor    = document.getElementById("cursor");

    var memory;

    // References:
    // https://docs.rs/wasi-types/0.1.5/src/wasi_types/lib.rs.html
    // https://docs.rs/wasi/0.10.2+wasi-snapshot-preview1/src/wasi/lib_generated.rs.html

    // https://docs.rs/wasi/0.10.2+wasi-snapshot-preview1/src/wasi/lib_generated.rs.html#27
    const ERRNO_SUCCESS     = 0;
    const ERRNO_BADF        = 8;
    const ERRNO_NOTCAPABLE  = 76;

    function args_get                   () { return ERRNO_NOTCAPABLE; }
    function args_sizes_get             () { return ERRNO_NOTCAPABLE; }
    function environ_get                () { return ERRNO_NOTCAPABLE; }
    function environ_sizes_get          () { return ERRNO_NOTCAPABLE; }
    function clock_res_get              () { return ERRNO_NOTCAPABLE; }
    function clock_time_get             () { return ERRNO_NOTCAPABLE; }
    function fd_advise                  () { return ERRNO_NOTCAPABLE; }
    function fd_allocate                () { return ERRNO_NOTCAPABLE; }
    function fd_close                   () { return ERRNO_NOTCAPABLE; }
    function fd_datasync                () { return ERRNO_NOTCAPABLE; }
    function fd_fdstat_get              () { return ERRNO_NOTCAPABLE; }
    function fd_fdstat_set_flags        () { return ERRNO_NOTCAPABLE; }
    function fd_fdstat_set_rights       () { return ERRNO_NOTCAPABLE; }
    function fd_filestat_get            () { return ERRNO_NOTCAPABLE; }
    function fd_filestat_set_size       () { return ERRNO_NOTCAPABLE; }
    function fd_filestat_set_times      () { return ERRNO_NOTCAPABLE; }
    function fd_pread                   () { return ERRNO_NOTCAPABLE; }
    function fd_prestat_get             () { return ERRNO_NOTCAPABLE; }
    function fd_prestat_dir_name        () { return ERRNO_NOTCAPABLE; }
    function fd_pwrite                  () { return ERRNO_NOTCAPABLE; }
    function fd_read                    () { return ERRNO_NOTCAPABLE; }
    function fd_readdir                 () { return ERRNO_NOTCAPABLE; }
    function fd_renumber                () { return ERRNO_NOTCAPABLE; }
    function fd_seek                    () { return ERRNO_NOTCAPABLE; }
    function fd_sync                    () { return ERRNO_NOTCAPABLE; }
    function fd_tell                    () { return ERRNO_NOTCAPABLE; }

    function fd_write(fd, ciovec_array_ptr, ciovec_array_len, nwritten_ptr) {
        // https://docs.rs/wasi/0.10.2+wasi-snapshot-preview1/src/wasi/lib_generated.rs.html#1796
        // https://nodejs.org/api/wasi.html

        var dv = new DataView(memory.buffer);
        var nwritten = 0;
        var errno = ERRNO_SUCCESS;

        var text = "";
        for (var ciovec_idx = 0; ciovec_idx < ciovec_array_len; ++ciovec_idx) {
            var buf_ptr = dv.getUint32(ciovec_array_ptr + (8 * ciovec_idx) + 0, true);
            var buf_len = dv.getUint32(ciovec_array_ptr + (8 * ciovec_idx) + 4, true);

            switch (fd) {
                case 1: // stdout
                case 2: // stderr
                    text += new TextDecoder().decode(new DataView(memory.buffer, buf_ptr, buf_len));
                    nwritten += buf_len;
                    break;
                default:
                    errno = ERRNO_BADF;
                    break;
            }
        }

        if (text !== "") {
            con.insertBefore(document.createTextNode(text), cursor);
        }

        dv.setUint32(nwritten_ptr, nwritten, true);
        return errno;
    }

    function path_create_directory      () { return ERRNO_NOTCAPABLE; }
    function path_filestats_get         () { return ERRNO_NOTCAPABLE; }
    function path_filestat_set_times    () { return ERRNO_NOTCAPABLE; }
    function path_link                  () { return ERRNO_NOTCAPABLE; }
    function path_open                  () { return ERRNO_NOTCAPABLE; }
    function path_readlink              () { return ERRNO_NOTCAPABLE; }
    function path_remove_directory      () { return ERRNO_NOTCAPABLE; }
    function path_rename                () { return ERRNO_NOTCAPABLE; }
    function path_symlink               () { return ERRNO_NOTCAPABLE; }
    function path_unlink_file           () { return ERRNO_NOTCAPABLE; }
    function poll_oneoff                () { return ERRNO_NOTCAPABLE; }

    function proc_exit(code) {
        // https://docs.rs/wasi/0.10.2+wasi-snapshot-preview1/src/wasi/lib_generated.rs.html#1901
        throw { call: "proc_exit", code };
    }

    function proc_raise                 () { return ERRNO_NOTCAPABLE; }
    function sched_yield                () { return ERRNO_NOTCAPABLE; }
    function random_get                 () { return ERRNO_NOTCAPABLE; }
    function sock_recv                  () { return ERRNO_NOTCAPABLE; }
    function sock_send                  () { return ERRNO_NOTCAPABLE; }
    function sock_shutdown              () { return ERRNO_NOTCAPABLE; }

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
        memory = m.exports.memory;
        try {
            m.exports.main();
            proc_exit(0);
        } catch (e) {
            if ("call" in e) {
                switch (e.call) {
                    case "proc_exit":
                        var exit = document.createElement("span");
                        exit.textContent = `\nprocess exited with code ${e.code}`;
                        exit.style.color = "#888";
                        con.insertBefore(exit, cursor);
                        con.removeChild(cursor);
                        break;
                }
            } else {
                throw e;
            }
        }
    });
}
