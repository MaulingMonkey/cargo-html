namespace wasi {
    /**
     * These are some of the imports that WASM may expect.
     */
    export interface Imports {
        /** Used for standard C imports, emscripten nonsense, etc. */
        env: {
        },

        /** \[[WASI](https://github.com/WebAssembly/WASI/blob/main/phases/snapshot/docs.md)\] phases/snapshot */
        wasi_snapshot_preview1: {
            /**
             * \[[WASI](https://github.com/WebAssembly/WASI/blob/main/phases/snapshot/docs.md#args_get),
             * [wasi=0.10.2](https://docs.rs/wasi/0.10.2+wasi-snapshot-preview1/src/wasi/lib_generated.rs.html#1674)\]
             * Read command-line argument data. The size of the array should match that returned by `args_sizes_get`. Each argument is expected to be `\0` terminated.
             */
            args_get?: (argv: ptr, argv_buf: ptr) => Errno,

            /**
             * \[[WASI](https://github.com/WebAssembly/WASI/blob/main/phases/snapshot/docs.md#args_sizes_get),
             * [wasi=0.10.2](https://docs.rs/wasi/0.10.2+wasi-snapshot-preview1/src/wasi/lib_generated.rs.html#1677)\]
             * Return command-line argument data sizes.
             */
            args_sizes_get?: (out_argc: ptr, out_argv_buf_size: ptr) => Errno,

            /**
             * \[[WASI](https://github.com/WebAssembly/WASI/blob/main/phases/snapshot/docs.md#environ_get),
             * [wasi=0.10.2](https://docs.rs/wasi/0.10.2+wasi-snapshot-preview1/src/wasi/lib_generated.rs.html#1679)\]
             * Read environment variable data. The sizes of the buffers should match that returned by `environ_sizes_get`.
             * Key/value pairs are expected to be joined with `=`s, and terminated with `\0`s.
             */
            environ_get?: (environ: ptr, environ_buf: ptr) => Errno,

            /**
             * \[[WASI](https://github.com/WebAssembly/WASI/blob/main/phases/snapshot/docs.md#environ_sizes_get),
             * [wasi=0.10.2](https://docs.rs/wasi/0.10.2+wasi-snapshot-preview1/src/wasi/lib_generated.rs.html#1682)\]
             * Return environment variable data sizes.
             */
            environ_sizes_get?: (out_environc: ptr, out_environ_buf_size: ptr) => Errno,

            /**
             * \[[WASI](https://github.com/WebAssembly/WASI/blob/main/phases/snapshot/docs.md#clock_res_get),
             * [wasi=0.10.2](https://docs.rs/wasi/0.10.2+wasi-snapshot-preview1/src/wasi/lib_generated.rs.html#1684)\]
             * Return the resolution of a clock.
             * Implementations are required to provide a non-zero value for supported clocks.
             * For unsupported clocks, return `ERRNO_INVAL`.
             * Note: This is similar to [`clock_getres`](https://pubs.opengroup.org/onlinepubs/009695399/functions/clock_getres.html) in POSIX.
             */
            clock_res_get?: (id: ClockID, resolution: ptr) => Errno,

            /**
             * \[[WASI](https://github.com/WebAssembly/WASI/blob/main/phases/snapshot/docs.md#clock_time_get),
             * [wasi=0.10.2](https://docs.rs/wasi/0.10.2+wasi-snapshot-preview1/src/wasi/lib_generated.rs.html#1689)\]
             * Return the time value of a clock. Note: This is similar to [`clock_gettime`](https://pubs.opengroup.org/onlinepubs/009695399/functions/clock_gettime.html) in POSIX.
             */
            clock_time_get?: (id: ClockID, precision: TimeStamp, time: ptr) => Errno,

            /**
             * \[[WASI](https://github.com/WebAssembly/WASI/blob/main/phases/snapshot/docs.md#fd_advise),
             * [wasi=0.10.2](https://docs.rs/wasi/0.10.2+wasi-snapshot-preview1/src/wasi/lib_generated.rs.html#1692)\]
             * Provide file advisory information on a file descriptor. Note: This is similar to [`posix_fadvise`](https://pubs.opengroup.org/onlinepubs/009695399/functions/posix_fadvise.html) in POSIX.
             */
            fd_advise?: (fd: Fd, offset: FileSize, len: FileSize, advice: Advice) => Errno,

            /**
             * \[[WASI](https://github.com/WebAssembly/WASI/blob/main/phases/snapshot/docs.md#fd_allocate),
             * [wasi=0.10.2](https://docs.rs/wasi/0.10.2+wasi-snapshot-preview1/src/wasi/lib_generated.rs.html#1695)\]
             * Force the allocation of space in a file. Note: This is similar to [`posix_fallocate`](https://pubs.opengroup.org/onlinepubs/009695399/functions/posix_fallocate.html) in POSIX.
             */
            fd_allocate?: (fd: Fd, offset: FileSize, len: FileSize) => Errno,

            /**
             * \[[WASI](https://github.com/WebAssembly/WASI/blob/main/phases/snapshot/docs.md#fd_close),
             * [wasi=0.10.2](https://docs.rs/wasi/0.10.2+wasi-snapshot-preview1/src/wasi/lib_generated.rs.html#1698)\]
             * Close a file descriptor. Note: This is similar to [`close`](https://pubs.opengroup.org/onlinepubs/009695399/functions/close.html) in POSIX.
             */
            fd_close?: (fd: Fd) => Errno,

            /**
             * \[[WASI](https://github.com/WebAssembly/WASI/blob/main/phases/snapshot/docs.md#fd_datasync),
             * [wasi=0.10.2](https://docs.rs/wasi/0.10.2+wasi-snapshot-preview1/src/wasi/lib_generated.rs.html#1701)\]
             * Synchronize the data of a file to disk. Note: This is similar to [`fdatasync`](https://pubs.opengroup.org/onlinepubs/009695399/functions/fdatasync.html) in POSIX.
             */
            fd_datasync?: (fd: Fd) => Errno,

            /**
             * \[[WASI](https://github.com/WebAssembly/WASI/blob/main/phases/snapshot/docs.md#fd_fdstat_get),
             * [wasi=0.10.2](https://docs.rs/wasi/0.10.2+wasi-snapshot-preview1/src/wasi/lib_generated.rs.html#1704)\]
             * Get the attributes of a file descriptor. Note: This returns similar flags to fsync(fd, F_GETFL) in POSIX, as well as additional fields.
             */
            fd_fdstat_get?: (fd: Fd, buf: ptr) => Errno,

            /**
             * \[[WASI](https://github.com/WebAssembly/WASI/blob/main/phases/snapshot/docs.md#fd_fdstat_set_flags),
             * [wasi=0.10.2](https://docs.rs/wasi/0.10.2+wasi-snapshot-preview1/src/wasi/lib_generated.rs.html#1707)\]
             * Adjust the flags associated with a file descriptor. Note: This is similar to fcntl(fd, F_SETFL, flags) in POSIX.
             */
            fd_fdstat_set_flags?: (fd: Fd, flags: FdFlags) => Errno,

            /**
             * \[[WASI](https://github.com/WebAssembly/WASI/blob/main/phases/snapshot/docs.md#fd_fdstat_set_rights),
             * [wasi=0.10.2](https://docs.rs/wasi/0.10.2+wasi-snapshot-preview1/src/wasi/lib_generated.rs.html#1710)\]
             * Adjust the rights associated with a file descriptor. This can only be used to remove rights, and returns `ERRNO_NOTCAPABLE` if called in a way that would attempt to add rights.
             */
            fd_fdstat_set_rights?: (fd: Fd, rights_base: Rights, rights_inheriting: Rights) => Errno,

            /**
             * \[[WASI](https://github.com/WebAssembly/WASI/blob/main/phases/snapshot/docs.md#fd_filestat_get),
             * [wasi=0.10.2](https://docs.rs/wasi/0.10.2+wasi-snapshot-preview1/src/wasi/lib_generated.rs.html#1717)\]
             * Return the attributes of an open file.
             */
            fd_filestat_get?: (fd: Fd, buf: ptr) => Errno,

            /**
             * \[[WASI](https://github.com/WebAssembly/WASI/blob/main/phases/snapshot/docs.md#fd_filestat_set_size),
             * [wasi=0.10.2](https://docs.rs/wasi/0.10.2+wasi-snapshot-preview1/src/wasi/lib_generated.rs.html#1719)\]
             * Adjust the size of an open file. If this increases the file's size, the extra bytes are filled with zeros. Note: This is similar to [`ftruncate`](https://pubs.opengroup.org/onlinepubs/009695399/functions/ftruncate.html) in POSIX.
             */
            fd_filestat_set_size?: (fd: Fd, size: FileSize) => Errno,

            /**
             * \[[WASI](https://github.com/WebAssembly/WASI/blob/main/phases/snapshot/docs.md#fd_filestat_set_times),
             * [wasi=0.10.2](https://docs.rs/wasi/0.10.2+wasi-snapshot-preview1/src/wasi/lib_generated.rs.html#1722)\]
             * Adjust the timestamps of an open file or directory. Note: This is similar to [`futimens`](https://pubs.opengroup.org/onlinepubs/009695399/functions/futimens.html) in POSIX.
             */
            fd_filestat_set_times?: (fd: Fd, access_time: TimeStamp, modified_time: TimeStamp, fst_flags: FstFlags) => Errno,

            /**
             * \[[WASI](https://github.com/WebAssembly/WASI/blob/main/phases/snapshot/docs.md#fd_pread),
             * [wasi=0.10.2](https://docs.rs/wasi/0.10.2+wasi-snapshot-preview1/src/wasi/lib_generated.rs.html#1730)\]
             * Read from a file descriptor, without using and updating the file descriptor's offset. Note: This is similar to [`preadv`](https://pubs.opengroup.org/onlinepubs/009695399/functions/preadv.html) in POSIX.
             */
            fd_pread?: (fd: Fd, iovec_array_ptr: ptr, iovec_array_len: usize, offset: FileSize, nread: ptr) => Errno,

            /**
             * \[[WASI](https://github.com/WebAssembly/WASI/blob/main/phases/snapshot/docs.md#fd_prestat_get),
             * [wasi=0.10.2](https://docs.rs/wasi/0.10.2+wasi-snapshot-preview1/src/wasi/lib_generated.rs.html#1739)\]
             * Return a description of the given preopened file descriptor.
             */
            fd_prestat_get?: (fd: Fd, buf: ptr) => Errno,

            /**
             * \[[WASI](https://github.com/WebAssembly/WASI/blob/main/phases/snapshot/docs.md#fd_prestat_dir_name),
             * [wasi=0.10.2](https://docs.rs/wasi/0.10.2+wasi-snapshot-preview1/src/wasi/lib_generated.rs.html#1741)\]
             * Return a description of the given preopened file descriptor.
             */
            fd_prestat_dir_name?: (fd: Fd, path: ptr, path_len: usize) => Errno,

            /**
             * \[[WASI](https://github.com/WebAssembly/WASI/blob/main/phases/snapshot/docs.md#fd_pwrite),
             * [wasi=0.10.2](https://docs.rs/wasi/0.10.2+wasi-snapshot-preview1/src/wasi/lib_generated.rs.html#1743)\]
             * Write to a file descriptor, without using and updating the file descriptor's offset. Note: This is similar to [`pwritev`](https://pubs.opengroup.org/onlinepubs/009695399/functions/pwritev.html) in POSIX.
             */
            fd_pwrite?: (fd: Fd, ciovec_array_ptr: ptr, ciovec_array_len: usize, offset: FileSize, nwritten: ptr) => Errno,

            /**
             * \[[WASI](https://github.com/WebAssembly/WASI/blob/main/phases/snapshot/docs.md#fd_read),
             * [wasi=0.10.2](https://docs.rs/wasi/0.10.2+wasi-snapshot-preview1/src/wasi/lib_generated.rs.html#1752)\]
             * Read from a file descriptor. Note: This is similar to [`readv`](https://pubs.opengroup.org/onlinepubs/009695399/functions/readv.html) in POSIX.
             */
            fd_read?: (fd: Fd, iovec_array_ptr: ptr, iovec_array_len: usize, nread_ptr: ptr) => Errno,

            /**
             * \[[WASI](https://github.com/WebAssembly/WASI/blob/main/phases/snapshot/docs.md#fd_readdir),
             * [wasi=0.10.2](https://docs.rs/wasi/0.10.2+wasi-snapshot-preview1/src/wasi/lib_generated.rs.html#1755)\]
             * Read directory entries from a directory.
             * When successful, the contents of the output buffer consist of a sequence of directory entries.
             * Each directory entry consists of a dirent object, followed by dirent::d_namlen bytes holding the name of the directory entry.
             * This function fills the output buffer as much as possible, potentially truncating the last directory entry.
             * This allows the caller to grow its read buffer size in case it's too small to fit a single large directory entry, or skip the oversized directory entry.
             */
            fd_readdir?: (fd: Fd, buf: ptr, buf_len: usize, cookie: DirCookie, buf_used: ptr) => Errno,

            /**
             * \[[WASI](https://github.com/WebAssembly/WASI/blob/main/phases/snapshot/docs.md#fd_renumber),
             * [wasi=0.10.2](https://docs.rs/wasi/0.10.2+wasi-snapshot-preview1/src/wasi/lib_generated.rs.html#1771)\]
             * Atomically replace a file descriptor by renumbering another file descriptor.
             * Due to the strong focus on thread safety, this environment does not provide a mechanism to duplicate or renumber a file descriptor to an arbitrary number, like dup2().
             * This would be prone to race conditions, as an actual file descriptor with the same number could be allocated by a different thread at the same time.
             * This function provides a way to atomically renumber file descriptors, which would disappear if dup2() were to be removed entirely.
             */
            fd_renumber?: (from: Fd, to: Fd) => Errno,

            /**
             * \[[WASI](https://github.com/WebAssembly/WASI/blob/main/phases/snapshot/docs.md#fd_seek),
             * [wasi=0.10.2](https://docs.rs/wasi/0.10.2+wasi-snapshot-preview1/src/wasi/lib_generated.rs.html#1780)\]
             * Move the offset of a file descriptor. Note: This is similar to [`lseek`](https://pubs.opengroup.org/onlinepubs/009695399/functions/lseek.html) in POSIX.
             */
            fd_seek?: (fd: Fd, offset: FileDelta, whence: Whence, new_offset: ptr) => Errno,

            /**
             * \[[WASI](https://github.com/WebAssembly/WASI/blob/main/phases/snapshot/docs.md#fd_sync),
             * [wasi=0.10.2](https://docs.rs/wasi/0.10.2+wasi-snapshot-preview1/src/wasi/lib_generated.rs.html#1788)\]
             * Synchronize the data and metadata of a file to disk. Note: This is similar to [`fsync`](https://pubs.opengroup.org/onlinepubs/009695399/functions/fsync.html) in POSIX.
             */
            fd_sync?: (fd: Fd) => Errno,

            /**
             * \[[WASI](https://github.com/WebAssembly/WASI/blob/main/phases/snapshot/docs.md#fd_tell),
             * [wasi=0.10.2](https://docs.rs/wasi/0.10.2+wasi-snapshot-preview1/src/wasi/lib_generated.rs.html#1791)\]
             * Return the current offset of a file descriptor. Note: This is similar to lseek(fd, 0, SEEK_CUR) in POSIX.
             */
            fd_tell?: (fd: Fd, offset: ptr) => Errno,

            /**
             * \[[WASI](https://github.com/WebAssembly/WASI/blob/main/phases/snapshot/docs.md#fd_write),
             * [wasi=0.10.2](https://docs.rs/wasi/0.10.2+wasi-snapshot-preview1/src/wasi/lib_generated.rs.html#1794)\]
             * Write to a file descriptor. Note: This is similar to [`writev`](https://pubs.opengroup.org/onlinepubs/009695399/functions/writev.html) in POSIX.
             */
            fd_write?: (fd: Fd, ciovec_array_ptr: ptr, ciovec_array_len: usize, nwritten_ptr: ptr) => Errno,

            /**
             * \[[WASI](https://github.com/WebAssembly/WASI/blob/main/phases/snapshot/docs.md#path_create_directory),
             * [wasi=0.10.2](https://docs.rs/wasi/0.10.2+wasi-snapshot-preview1/src/wasi/lib_generated.rs.html#1802)\]
             * Create a directory. Note: This is similar to [`mkdirat`](https://pubs.opengroup.org/onlinepubs/009695399/functions/mkdirat.html) in POSIX.
             */
            path_create_directory?: (fd: Fd, path_ptr: ptr, path_len: usize) => Errno,

            /**
             * \[[WASI](https://github.com/WebAssembly/WASI/blob/main/phases/snapshot/docs.md#path_filestat_get),
             * [wasi=0.10.2](https://docs.rs/wasi/0.10.2+wasi-snapshot-preview1/src/wasi/lib_generated.rs.html#1805)\]
             * Return the attributes of a file or directory. Note: This is similar to [`stat`](https://pubs.opengroup.org/onlinepubs/009695399/functions/stat.html) in POSIX.
             */
            path_filestat_get?: (fd: Fd, flags: LookupFlags, path_ptr: ptr, path_len: usize, buf: ptr) => Errno,

            /**
             * \[[WASI](https://github.com/WebAssembly/WASI/blob/main/phases/snapshot/docs.md#path_filestat_set_times),
             * [wasi=0.10.2](https://docs.rs/wasi/0.10.2+wasi-snapshot-preview1/src/wasi/lib_generated.rs.html#1814)\]
             * Adjust the timestamps of a file or directory. Note: This is similar to [`utimensat`](https://pubs.opengroup.org/onlinepubs/009695399/functions/utimensat.html) in POSIX.
             */
            path_filestat_set_times?: (fd: Fd, flags: LookupFlags, path_ptr: ptr, path_len: usize, access_time: TimeStamp, modified_time: TimeStamp, fst_flags: FstFlags) => Errno,

            /**
             * \[[WASI](https://github.com/WebAssembly/WASI/blob/main/phases/snapshot/docs.md#path_link),
             * [wasi=0.10.2](https://docs.rs/wasi/0.10.2+wasi-snapshot-preview1/src/wasi/lib_generated.rs.html#1825)\]
             * Create a hard link. Note: This is similar to [`linkat`](https://pubs.opengroup.org/onlinepubs/9699919799/functions/link.html) in POSIX.
             */
            path_link?: (old_fd: Fd, old_flags: LookupFlags, old_path_ptr: ptr, old_path_len: usize, new_fd: Fd, new_path_ptr: ptr, new_path_len: usize) => Errno,

            /**
             * \[[WASI](https://github.com/WebAssembly/WASI/blob/main/phases/snapshot/docs.md#path_open),
             * [wasi=0.10.2](https://docs.rs/wasi/0.10.2+wasi-snapshot-preview1/src/wasi/lib_generated.rs.html#1836)\]
             * Open a file or directory.
             * The returned file descriptor is not guaranteed to be the lowest-numbered file descriptor not currently open; it is randomized to prevent applications from depending on making assumptions about indexes, since this is error-prone in multi-threaded contexts.
             * The returned file descriptor is guaranteed to be less than 2**31.
             * Note: This is similar to [`openat`](https://pubs.opengroup.org/onlinepubs/009695399/functions/openat.html) in POSIX.
             */
            path_open?: (fd: Fd, dirflags: LookupFlags, path_ptr: ptr, path_len: usize, oflags: OFlags, fs_rights_base: Rights, fs_rights_inheriting: Rights, fdflags: FdFlags, opened_fd: ptr) => Errno,

            /**
             * \[[WASI](https://github.com/WebAssembly/WASI/blob/main/phases/snapshot/docs.md#path_readlink),
             * [wasi=0.10.2](https://docs.rs/wasi/0.10.2+wasi-snapshot-preview1/src/wasi/lib_generated.rs.html#1854)\]
             * Read the contents of a symbolic link. Note: This is similar to [`readlinkat`](https://pubs.opengroup.org/onlinepubs/009695399/functions/readlink.html) in POSIX.
             */
            path_readlink?: (fd: Fd, path_ptr: ptr, path_len: usize, buf: ptr, buf_len: usize, buf_used: ptr) => Errno,

            /**
             * \[[WASI](https://github.com/WebAssembly/WASI/blob/main/phases/snapshot/docs.md#path_remove_directory),
             * [wasi=0.10.2](https://docs.rs/wasi/0.10.2+wasi-snapshot-preview1/src/wasi/lib_generated.rs.html#1864)\]
             * Remove a directory. Return `ERRNO_NOTEMPTY` if the directory is not empty.
             * Note: This is similar to unlinkat(fd, path, AT_REMOVEDIR) in POSIX.
             */
            path_remove_directory?: (fd: Fd, path_ptr: ptr, path_len: usize) => Errno,

            /**
             * \[[WASI](https://github.com/WebAssembly/WASI/blob/main/phases/snapshot/docs.md#path_rename),
             * [wasi=0.10.2](https://docs.rs/wasi/0.10.2+wasi-snapshot-preview1/src/wasi/lib_generated.rs.html#1868)\]
             * Rename a file or directory. Note: This is similar to [`renameat`](https://pubs.opengroup.org/onlinepubs/009695399/functions/renameat.html) in POSIX.
             */
            path_rename?: (old_fd: Fd, old_path_ptr: ptr, old_path_len: usize, new_fd: Fd, new_path_ptr: ptr, new_path_len: usize) => Errno,

            /**
             * \[[WASI](https://github.com/WebAssembly/WASI/blob/main/phases/snapshot/docs.md#path_symlink),
             * [wasi=0.10.2](https://docs.rs/wasi/0.10.2+wasi-snapshot-preview1/src/wasi/lib_generated.rs.html#1878)\]
             * Create a symbolic link. Note: This is similar to [`symlinkat`](https://pubs.opengroup.org/onlinepubs/009695399/functions/symlinkat.html) in POSIX.
             */
            path_symlink?: (old_path_ptr: ptr, old_path_len: usize, fd: Fd, new_path_ptr: ptr, new_path_len: usize) => Errno,

            /**
             * \[[WASI](https://github.com/WebAssembly/WASI/blob/main/phases/snapshot/docs.md#path_unlink_file),
             * [wasi=0.10.2](https://docs.rs/wasi/0.10.2+wasi-snapshot-preview1/src/wasi/lib_generated.rs.html#1887)\]
             * Unlink a file. Return `ERRNO_ISDIR` if the path refers to a directory. Note: This is similar to unlinkat(fd, path, 0) in POSIX.
             */
            path_unlink_file?: (fd: Fd, path_ptr: ptr, path_len: usize) => Errno,

            /**
             * \[[WASI](https://github.com/WebAssembly/WASI/blob/main/phases/snapshot/docs.md#poll_oneoff),
             * [wasi=0.10.2](https://docs.rs/wasi/0.10.2+wasi-snapshot-preview1/src/wasi/lib_generated.rs.html#1891)\]
             * Concurrently poll for the occurrence of a set of events.
             */
            poll_oneoff?: (in_subs: ptr, out_events: ptr, in_nsubs: usize, out_nevents_ptr: ptr) => Errno,

            /**
             * \[[WASI](https://github.com/WebAssembly/WASI/blob/main/phases/snapshot/docs.md#proc_exit),
             * [wasi=0.10.2](https://docs.rs/wasi/0.10.2+wasi-snapshot-preview1/src/wasi/lib_generated.rs.html#1898)\]
             * Terminate the process normally. An exit code of 0 indicates successful termination of the program. The meanings of other values is dependent on the environment.
             */
            proc_exit?: (code: u32) => never,

            /**
             * \[[WASI](https://github.com/WebAssembly/WASI/blob/main/phases/snapshot/docs.md#proc_raise),
             * [wasi=0.10.2](https://docs.rs/wasi/0.10.2+wasi-snapshot-preview1/src/wasi/lib_generated.rs.html#1902)\]
             * Send a signal to the process of the calling thread. Note: This is similar to [`raise`](https://pubs.opengroup.org/onlinepubs/009695399/functions/raise.html) in POSIX.
             */
            proc_raise?: (sig: Signal) => Errno,

            /**
             * \[[WASI](https://github.com/WebAssembly/WASI/blob/main/phases/snapshot/docs.md#sched_yield),
             * [wasi=0.10.2](https://docs.rs/wasi/0.10.2+wasi-snapshot-preview1/src/wasi/lib_generated.rs.html#1905)\]
             * Temporarily yield execution of the calling thread. Note: This is similar to [`sched_yield`](https://pubs.opengroup.org/onlinepubs/009695399/functions/sched_yield.html) in POSIX.
             */
            sched_yield?: () => Errno,

            /**
             * \[[WASI](https://github.com/WebAssembly/WASI/blob/main/phases/snapshot/docs.md#random_get),
             * [wasi=0.10.2](https://docs.rs/wasi/0.10.2+wasi-snapshot-preview1/src/wasi/lib_generated.rs.html#1908)\]
             * Write high-quality random data into a buffer.
             * This function blocks when the implementation is unable to immediately provide sufficient high-quality random data.
             * This function may execute slowly, so when large mounts of random data are required, it's advisable to use this function to seed a pseudo-random number generator, rather than to provide the random data directly.
             */
            random_get?: (buf: ptr, len: usize) => Errno,

            /**
             * \[[WASI](https://github.com/WebAssembly/WASI/blob/main/phases/snapshot/docs.md#sock_recv),
             * [wasi=0.10.2](https://docs.rs/wasi/0.10.2+wasi-snapshot-preview1/src/wasi/lib_generated.rs.html#1915)\]
             * Receive a message from a socket. Note: This is similar to [`recv`](https://pubs.opengroup.org/onlinepubs/009695399/functions/recv.html) in POSIX, though it also supports reading the data into multiple buffers in the manner of readv.
             */
            sock_recv?: (fd: Fd, ri_data_ptr: ptr, ri_data_len: usize, ri_flags: RiFlags, ro_datalen: ptr, ro_flags: ptr) => Errno,

            /**
             * \[[WASI](https://github.com/WebAssembly/WASI/blob/main/phases/snapshot/docs.md#sock_send),
             * [wasi=0.10.2](https://docs.rs/wasi/0.10.2+wasi-snapshot-preview1/src/wasi/lib_generated.rs.html#1926)\]
             * Send a message on a socket. Note: This is similar to [`send`](https://pubs.opengroup.org/onlinepubs/009695399/functions/send.html) in POSIX, though it also supports writing the data from multiple buffers in the manner of writev.
             */
            sock_send?: (fd: Fd, si_data_ptr: ptr, si_data_len: usize, si_flags: SiFlags, so_datalen: ptr) => Errno,

            /**
             * \[[WASI](https://github.com/WebAssembly/WASI/blob/main/phases/snapshot/docs.md#sock_shutdown),
             * [wasi=0.10.2](https://docs.rs/wasi/0.10.2+wasi-snapshot-preview1/src/wasi/lib_generated.rs.html#1936)\]
             * Shut down socket send and receive channels. Note: This is similar to [`shutdown`](https://pubs.opengroup.org/onlinepubs/009695399/functions/shutdown.html) in POSIX.
             */
            sock_shutdown?: (fd: Fd, how: SdFlags) => Errno,
        },
    }
}
