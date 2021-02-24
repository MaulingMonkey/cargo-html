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
            4: new fs.temp.DirectoryHandle(DIR_HOME), // cwd for stable rust
        };

        // XXX: WASI recommends randomizing FDs, but I want optional deterministic behavior.
        let next_fd = 1000;
        function alloc_handle_fd(handle: Handle | HandleAsync): Fd {
            while (next_fd in FDS) next_fd = (next_fd + 1) & 0x3FFFFFFF;
            FDS[next_fd] = handle;
            return next_fd as Fd;
        }

        function wrap_fd(fd: Fd, op: (handle: Handle | HandleAsync) => Promise<Errno>): Errno {
            return asyncifier.asyncify(async () => {
                const handle = FDS[fd];
                if (handle === undefined) return ERRNO_BADF; // handle does not exist
                try {
                    return await op(handle);
                } catch (errno) {
                    if (typeof errno === "number") {
                        return errno as Errno;
                    } else {
                        throw errno;
                    }
                }
            }, ERRNO_ASYNCIFY);
        }

        function write_filestat(ptr: ptr, off: usize, filestat: FileStat) {
            memory.write_u64(ptr, off+ 0, filestat.dev              );
            memory.write_u64(ptr, off+ 8, filestat.ino              );
            memory.write_u8( ptr, off+16, filestat.filetype         );
            memory.write_u64(ptr, off+24, filestat.nlink            );
            memory.write_u64(ptr, off+32, filestat.size             );
            memory.write_u64(ptr, off+40, filestat.access_time      );
            memory.write_u64(ptr, off+48, filestat.modified_time    );
            memory.write_u64(ptr, off+56, filestat.change_time      );
        }

        function write_prestat(ptr: ptr, off: usize, prestat: PreStat) {
            memory.write_u8(ptr, off+ 0, prestat.tag);
            switch (prestat.tag) {
                case 0:
                    memory.write_usize(ptr, off+ 4, prestat.u_dir_pr_name_len || (0 as usize));
                    break;
            }
        }

        /////////////////////////////////////////////////// SYSCALLS ///////////////////////////////////////////////////

        function fd_close(fd: Fd): Errno { return wrap_fd(fd, async (handle) => {
            // https://docs.rs/wasi/0.10.2+wasi-snapshot-preview1/src/wasi/lib_generated.rs.html#1700
            // https://github.com/WebAssembly/WASI/blob/main/phases/snapshot/docs.md#fd_close
            if (handle.fd_close === undefined) {
                return ERRNO_ACCESS; // handle does not support operation
            } else if (handle.async) {
                await handle.fd_close();
            } else {
                handle.fd_close();
            }
            delete FDS[fd];
            return ERRNO_SUCCESS;
        })}

        function fd_filestat_get(fd: Fd, buf: ptr): Errno { return wrap_fd(fd, async (handle) => {
            // https://docs.rs/wasi/0.10.2+wasi-snapshot-preview1/src/wasi/lib_generated.rs.html#1717
            // https://github.com/WebAssembly/WASI/blob/main/phases/snapshot/docs.md#fd_filestat_get

            var result : FileStat;
            if (handle.fd_filestat_get === undefined) return ERRNO_ACCESS; // handle does not support operation
            if (handle.async) {
                result = await handle.fd_filestat_get();
            } else {
                result = handle.fd_filestat_get();
            }
            write_filestat(buf, 0 as usize, result);
            return ERRNO_SUCCESS;
        })}

        function fd_prestat_get(fd: Fd, buf: ptr): Errno { return wrap_fd(fd, async (handle) => {
            // https://docs.rs/wasi/0.10.2+wasi-snapshot-preview1/src/wasi/lib_generated.rs.html#1739
            // https://github.com/WebAssembly/WASI/blob/main/phases/snapshot/docs.md#fd_prestat_get

            var result : PreStat;
            if (handle.fd_prestat_get === undefined) return ERRNO_ACCESS; // handle does not support operation
            if (handle.async) {
                result = await handle.fd_prestat_get();
            } else {
                result = handle.fd_prestat_get();
            }
            write_prestat(buf, 0 as usize, result);
            return ERRNO_SUCCESS;
        })}

        function fd_read(fd: Fd, iovec_array_ptr: ptr, iovec_array_len: usize, nread_ptr: ptr): Errno { return wrap_fd(fd, async (handle) => {
            // https://docs.rs/wasi/0.10.2+wasi-snapshot-preview1/src/wasi/lib_generated.rs.html#1754
            // https://github.com/WebAssembly/WASI/blob/main/phases/snapshot/docs.md#fd_read

            if (handle.fd_read === undefined) return ERRNO_ACCESS; // handle does not support operation

            const iovec = new IovecArray(memory, iovec_array_ptr, iovec_array_len);
            var nwritten = 0;
            if (handle.async) {
                nwritten = await handle.fd_read(iovec);
            } else {
                nwritten = handle.fd_read(iovec);
            }
            memory.write_usize(nread_ptr, 0, nwritten as usize);
            return ERRNO_SUCCESS;
        })}

        function fd_write(fd: Fd, ciovec_array_ptr: ptr, ciovec_array_len: usize, nwritten_ptr: ptr): Errno { return wrap_fd(fd, async (handle) => {
            // https://docs.rs/wasi/0.10.2+wasi-snapshot-preview1/src/wasi/lib_generated.rs.html#1796
            // https://github.com/WebAssembly/WASI/blob/main/phases/snapshot/docs.md#fd_write
            // https://nodejs.org/api/wasi.html

            if (handle.fd_write === undefined) return ERRNO_ACCESS; // handle does not support operation

            const ciovec = new IovecArray(memory, ciovec_array_ptr, ciovec_array_len);
            var nwritten = 0;
            if (handle.async) {
                nwritten = await handle.fd_write(ciovec);
            } else {
                nwritten = handle.fd_write(ciovec);
            }
            memory.write_usize(nwritten_ptr, 0, nwritten as usize);
            return ERRNO_SUCCESS;
        })}

        function path_filestat_get(fd: Fd, flags: LookupFlags, path_ptr: ptr, path_len: usize, buf: ptr): Errno { return wrap_fd(fd, async (handle) => {
            // https://docs.rs/wasi/0.10.2+wasi-snapshot-preview1/src/wasi/lib_generated.rs.html#1805
            // https://github.com/WebAssembly/WASI/blob/main/phases/snapshot/docs.md#path_filestat_get

            const path = memory.read_string(path_ptr, +0 as usize, path_len);
            if (handle.path_filestat_get === undefined) return ERRNO_ACCESS; // handle does not support operation

            var stat : FileStat;
            if (handle.async) {
                stat = await handle.path_filestat_get(flags, path);
            } else {
                stat = handle.path_filestat_get(flags, path);
            }

            write_filestat(buf, 0 as usize, stat);
            return ERRNO_SUCCESS;
        })}

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
        ): Errno { return wrap_fd(fd, async (handle) => {
            // https://docs.rs/wasi/0.10.2+wasi-snapshot-preview1/src/wasi/lib_generated.rs.html#1352
            // https://github.com/WebAssembly/WASI/blob/main/phases/snapshot/docs.md#path_open

            if (handle.path_open === undefined) return ERRNO_ACCESS; // handle does not support operation
            const path = memory.read_string(path_ptr, 0 as usize, path_len);

            var out_fd : Fd;
            if (handle.async) {
                out_fd = alloc_handle_fd(await handle.path_open(dirflags, path, oflags, fs_rights_base, fs_rights_inheriting, fdflags));
            } else {
                out_fd = alloc_handle_fd(handle.path_open(dirflags, path, oflags, fs_rights_base, fs_rights_inheriting, fdflags));
            }

            memory.write_u32(opened_fd, +0, out_fd);
            return ERRNO_SUCCESS;
        })}

        return {
            fd_close,
            fd_filestat_get,
            fd_prestat_get,
            fd_read,
            fd_write,
            path_filestat_get,
            path_open,
        };
    }
}
