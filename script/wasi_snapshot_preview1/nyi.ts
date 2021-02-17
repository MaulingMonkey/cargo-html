namespace wasi_snapshot_preview1.nyi {
    export function nyi(): Errno {
        debugger;
        return ERRNO_NOTCAPABLE;
    }

    export function args_get                    (): Errno { return nyi(); }
    export function args_sizes_get              (): Errno { return nyi(); }
    export function environ_get                 (): Errno { return nyi(); }
    export function environ_sizes_get           (): Errno { return nyi(); }
    export function clock_res_get               (): Errno { return nyi(); }
    export function clock_time_get              (): Errno { return nyi(); }
    export function fd_advise                   (): Errno { return nyi(); }
    export function fd_allocate                 (): Errno { return nyi(); }
    export function fd_close                    (): Errno { return nyi(); }
    export function fd_datasync                 (): Errno { return nyi(); }
    export function fd_fdstat_get               (): Errno { return nyi(); }
    export function fd_fdstat_set_flags         (): Errno { return nyi(); }
    export function fd_fdstat_set_rights        (): Errno { return nyi(); }
    export function fd_filestat_get             (): Errno { return nyi(); }
    export function fd_filestat_set_size        (): Errno { return nyi(); }
    export function fd_filestat_set_times       (): Errno { return nyi(); }
    export function fd_pread                    (): Errno { return nyi(); }
    export function fd_prestat_get              (): Errno { return nyi(); }
    export function fd_prestat_dir_name         (): Errno { return nyi(); }
    export function fd_pwrite                   (): Errno { return nyi(); }
    export function fd_read                     (): Errno { return nyi(); }
    export function fd_readdir                  (): Errno { return nyi(); }
    export function fd_renumber                 (): Errno { return nyi(); }
    export function fd_seek                     (): Errno { return nyi(); }
    export function fd_sync                     (): Errno { return nyi(); }
    export function fd_tell                     (): Errno { return nyi(); }
    export function fd_write                    (): Errno { return nyi(); }
    export function path_create_directory       (): Errno { return nyi(); }
    export function path_filestats_get          (): Errno { return nyi(); }
    export function path_filestat_set_times     (): Errno { return nyi(); }
    export function path_link                   (): Errno { return nyi(); }
    export function path_open                   (): Errno { return nyi(); }
    export function path_readlink               (): Errno { return nyi(); }
    export function path_remove_directory       (): Errno { return nyi(); }
    export function path_rename                 (): Errno { return nyi(); }
    export function path_symlink                (): Errno { return nyi(); }
    export function path_unlink_file            (): Errno { return nyi(); }
    export function poll_oneoff                 (): Errno { return nyi(); }
    export function proc_exit                   (): Errno { return nyi(); }
    export function proc_raise                  (): Errno { return nyi(); }
    export function sched_yield                 (): Errno { return nyi(); }
    export function random_get                  (): Errno { return nyi(); }
    export function sock_recv                   (): Errno { return nyi(); }
    export function sock_send                   (): Errno { return nyi(); }
    export function sock_shutdown               (): Errno { return nyi(); }
}
