namespace wasi_snapshot_preview1 {
    /**
     * Provide input/output related syscall implementations.
     */
    export function io(memory: MemoryLE, asyncifier: Asyncifier, {}: {}) {
        const DIR_TEMP = new fs.temp.Dir("/temp/", {});
        const DIR_HOME = new fs.temp.Dir("/home/", {});
        const DIR_ROOT = new fs.temp.Dir("/", {
            "temp": { node: DIR_TEMP },
            "home": { node: DIR_HOME },
        });

        const FDS : { [fd: number]: (Handle | HandleAsync | undefined) } = {
            0: ConReader.try_create({ // stdin
                mode:       "linebuffered",
                listen_to:  document,
                input:      "cargo-html-console-input",
                echo:       con.write,
            }),
            1: new ConWriter(), // stdout
            2: new ConWriter(), // stderr
            3: new fs.temp.DirectoryHandle(DIR_ROOT), // root
            4: new fs.temp.DirectoryHandle(DIR_HOME), // cwd
        };

        // XXX: WASI recommends randomizing FDs, but I want optional deterministic behavior.
        let next_fd = 1000;
        function alloc_handle_fd(handle: Handle | HandleAsync): Fd {
            while (next_fd in FDS) next_fd = (next_fd + 1) & 0x3FFFFFFF;
            FDS[next_fd] = handle;
            return next_fd as Fd;
        }

        function fd_close(fd: Fd): Errno { return asyncifier.asyncify(async () => {
            // https://docs.rs/wasi/0.10.2+wasi-snapshot-preview1/src/wasi/lib_generated.rs.html#1700
            // https://github.com/WebAssembly/WASI/blob/main/phases/snapshot/docs.md#fd_close

            const handle = FDS[fd];
            if (handle          === undefined) return ERRNO_BADF;   // handle does not exist
            if (handle.fd_close === undefined) return ERRNO_ACCESS; // handle cannot be written to (ERRNO_IO? ERRNO_PIPE?)

            try {
                if (handle.async) {
                    await handle.fd_close!();
                } else {
                    handle.fd_close!();
                }
            } catch (errno) {
                if (typeof errno === "number") {
                    return errno as Errno;
                } else {
                    throw errno;
                }
            }
            delete FDS[fd];
            return ERRNO_SUCCESS;
        }, ERRNO_ASYNCIFY)}

        function fd_filestat_get(): Errno {
            return ERRNO_NOTCAPABLE;
        }

        function fd_read(fd: Fd, iovec_array_ptr: ptr, iovec_array_len: usize, nread_ptr: ptr): Errno { return asyncifier.asyncify(async () => {
            // https://docs.rs/wasi/0.10.2+wasi-snapshot-preview1/src/wasi/lib_generated.rs.html#1754
            // https://github.com/WebAssembly/WASI/blob/main/phases/snapshot/docs.md#fd_read

            const handle = FDS[fd];
            if (handle          === undefined) return ERRNO_BADF;   // handle does not exist
            if (handle.fd_read  === undefined) return ERRNO_ACCESS; // handle cannot be written to (ERRNO_IO? ERRNO_PIPE?)

            const iovec = new IovecArray(memory, iovec_array_ptr, iovec_array_len);
            var nwritten = 0;
            try {
                if (handle.async) {
                    nwritten = await handle.fd_read!(iovec);
                } else {
                    nwritten = handle.fd_read!(iovec);
                }
            } catch (errno) {
                if (typeof errno === "number") {
                    memory.write_usize(nread_ptr, 0, 0 as usize);
                    return errno as Errno;
                } else {
                    throw errno;
                }
            }
            memory.write_usize(nread_ptr, 0, nwritten as usize);
            return ERRNO_SUCCESS;
        }, ERRNO_ASYNCIFY)}

        function fd_write(fd: Fd, ciovec_array_ptr: ptr, ciovec_array_len: usize, nwritten_ptr: ptr): Errno { return asyncifier.asyncify(async () => {
            // https://docs.rs/wasi/0.10.2+wasi-snapshot-preview1/src/wasi/lib_generated.rs.html#1796
            // https://github.com/WebAssembly/WASI/blob/main/phases/snapshot/docs.md#fd_write
            // https://nodejs.org/api/wasi.html

            const handle = FDS[fd];
            if (handle          === undefined) return ERRNO_BADF;   // handle does not exist
            if (handle.fd_write === undefined) return ERRNO_ACCESS; // handle cannot be written to (ERRNO_IO? ERRNO_PIPE?)

            const ciovec = new IovecArray(memory, ciovec_array_ptr, ciovec_array_len);
            var nwritten = 0;
            try {
                if (handle.async) {
                    nwritten = await handle.fd_write!(ciovec);
                } else {
                    nwritten = handle.fd_write!(ciovec);
                }
            } catch (errno) {
                if (typeof errno === "number") {
                    memory.write_usize(nwritten_ptr, 0, 0 as usize);
                    return errno as Errno;
                } else {
                    throw errno;
                }
            }
            memory.write_usize(nwritten_ptr, 0, nwritten as usize);
            return ERRNO_SUCCESS;
        }, ERRNO_ASYNCIFY)}

        function path_open(
            fd:                     Fd,
            dirflags:               LookupFlags,
            path_ptr:               ptr,
            path_len:               usize,
            oflags:                 OFlags,
            fs_rights_base:         Rights,
            fs_rights_inheriting:   Rights,
            fdflags:                FdFlags,
            opened_fd:              ptr,
        ): Errno { return asyncifier.asyncify(async () => {
            // https://docs.rs/wasi/0.10.2+wasi-snapshot-preview1/src/wasi/lib_generated.rs.html#1352
            // https://github.com/WebAssembly/WASI/blob/main/phases/snapshot/docs.md#path_open

            const handle = FDS[fd];
            if (handle              === undefined) return ERRNO_BADF;   // handle does not exist
            if (handle.path_open    === undefined) return ERRNO_ACCESS; // handle cannot be written to (ERRNO_IO? ERRNO_PIPE?)
            const path = memory.read_string(path_ptr, 0 as usize, path_len);

            var out_fd : Fd;
            try {
                if (handle.async) {
                    out_fd = alloc_handle_fd(await handle.path_open!(dirflags, path, oflags, fs_rights_base, fs_rights_inheriting, fdflags));
                } else {
                    out_fd = alloc_handle_fd(handle.path_open!(dirflags, path, oflags, fs_rights_base, fs_rights_inheriting, fdflags));
                }
            } catch (errno) {
                if (typeof errno === "number") {
                    memory.write_u32(opened_fd, +0, 0xFFFFFFFF as Fd); // invalid handle
                    return errno as Errno;
                } else {
                    throw errno;
                }
            }

            memory.write_u32(opened_fd, +0, out_fd);
            return ERRNO_SUCCESS;
        }, ERRNO_ASYNCIFY)}

        return {
            fd_close,
            fd_filestat_get,
            fd_read,
            fd_write,
            path_open,
        };
    }
}
