namespace wasi {
    /**
     * A super basic `wasi_snapshot_preview1` syscall provider.
     * All provided syscalls are implemented as:
     *
     * ```js
     * debugger;
     * return ERRNO_NOTCAPABLE;
     * ```
     *
     * This allows you to run programs that require not yet implemented syscalls
     * until you reach the point of actually trying to call one of them.
     */
    export function nyi(i: Imports) {
        function nyi(): Errno {
            debugger;
            return ERRNO_NOTCAPABLE;
        }

        Object.assign(i.wasi_snapshot_preview1, {
            args_get:                   function args_get                   (): Errno { return nyi(); },
            args_sizes_get:             function args_sizes_get             (): Errno { return nyi(); },
            environ_get:                function environ_get                (): Errno { return nyi(); },
            environ_sizes_get:          function environ_sizes_get          (): Errno { return nyi(); },
            clock_res_get:              function clock_res_get              (): Errno { return nyi(); },
            clock_time_get:             function clock_time_get             (): Errno { return nyi(); },
            fd_advise:                  function fd_advise                  (): Errno { return nyi(); },
            fd_allocate:                function fd_allocate                (): Errno { return nyi(); },
            fd_close:                   function fd_close                   (): Errno { return nyi(); },
            fd_datasync:                function fd_datasync                (): Errno { return nyi(); },
            fd_fdstat_get:              function fd_fdstat_get              (): Errno { return nyi(); },
            fd_fdstat_set_flags:        function fd_fdstat_set_flags        (): Errno { return nyi(); },
            fd_fdstat_set_rights:       function fd_fdstat_set_rights       (): Errno { return nyi(); },
            fd_filestat_get:            function fd_filestat_get            (): Errno { return nyi(); },
            fd_filestat_set_size:       function fd_filestat_set_size       (): Errno { return nyi(); },
            fd_filestat_set_times:      function fd_filestat_set_times      (): Errno { return nyi(); },
            fd_pread:                   function fd_pread                   (): Errno { return nyi(); },
            fd_prestat_get:             function fd_prestat_get             (): Errno { return nyi(); },
            fd_prestat_dir_name:        function fd_prestat_dir_name        (): Errno { return nyi(); },
            fd_pwrite:                  function fd_pwrite                  (): Errno { return nyi(); },
            fd_read:                    function fd_read                    (): Errno { return nyi(); },
            fd_readdir:                 function fd_readdir                 (): Errno { return nyi(); },
            fd_renumber:                function fd_renumber                (): Errno { return nyi(); },
            fd_seek:                    function fd_seek                    (): Errno { return nyi(); },
            fd_sync:                    function fd_sync                    (): Errno { return nyi(); },
            fd_tell:                    function fd_tell                    (): Errno { return nyi(); },
            fd_write:                   function fd_write                   (): Errno { return nyi(); },
            path_create_directory:      function path_create_directory      (): Errno { return nyi(); },
            path_filestat_get:          function path_filestat_get          (): Errno { return nyi(); },
            path_filestat_set_times:    function path_filestat_set_times    (): Errno { return nyi(); },
            path_link:                  function path_link                  (): Errno { return nyi(); },
            path_open:                  function path_open                  (): Errno { return nyi(); },
            path_readlink:              function path_readlink              (): Errno { return nyi(); },
            path_remove_directory:      function path_remove_directory      (): Errno { return nyi(); },
            path_rename:                function path_rename                (): Errno { return nyi(); },
            path_symlink:               function path_symlink               (): Errno { return nyi(); },
            path_unlink_file:           function path_unlink_file           (): Errno { return nyi(); },
            poll_oneoff:                function poll_oneoff                (): Errno { return nyi(); },
            proc_exit:                  function proc_exit                  (): never { throw "proc_exit nyi"; },
            proc_raise:                 function proc_raise                 (): Errno { return nyi(); },
            sched_yield:                function sched_yield                (): Errno { return nyi(); },
            random_get:                 function random_get                 (): Errno { return nyi(); },
            sock_recv:                  function sock_recv                  (): Errno { return nyi(); },
            sock_send:                  function sock_send                  (): Errno { return nyi(); },
            sock_shutdown:              function sock_shutdown              (): Errno { return nyi(); },
        });
    }
}
