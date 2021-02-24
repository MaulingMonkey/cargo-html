namespace wasi_snapshot_preview1 {
    /**
     * Provide input/output related syscall implementations.
     */
    export function io(memory: MemoryLE, asyncifier: Asyncifier, {}: {}) {
        const trace = true;

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

        function wrap_fd(fd: Fd, opname: string, op: (handle: Handle | HandleAsync) => Promise<Errno>): Errno {
            return asyncifier.asyncify(async () => {
                const handle = FDS[fd];
                if (handle === undefined) {
                    if (trace) console.error("%s(%d, ...) failed: ERRNO_BADF", opname, fd);
                    return ERRNO_BADF; // handle does not exist
                }
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

        function fd_close(fd: Fd): Errno { return wrap_fd(fd, "fd_close", async (handle) => {
            // https://docs.rs/wasi/0.10.2+wasi-snapshot-preview1/src/wasi/lib_generated.rs.html#1700
            // https://github.com/WebAssembly/WASI/blob/main/phases/snapshot/docs.md#fd_close
            if (handle.fd_close === undefined) {
                if (trace) console.error("fd_close(%d, ...) failed: ERRNO_ACCESS (handle doesn't implement operation)", fd);
                return ERRNO_ACCESS; // handle does not support operation
            } else if (handle.async) {
                await handle.fd_close();
            } else {
                handle.fd_close();
            }
            delete FDS[fd];
            return ERRNO_SUCCESS;
        })}

        function fd_filestat_get(fd: Fd, buf: ptr): Errno { return wrap_fd(fd, "fd_filestat_get", async (handle) => {
            // https://docs.rs/wasi/0.10.2+wasi-snapshot-preview1/src/wasi/lib_generated.rs.html#1717
            // https://github.com/WebAssembly/WASI/blob/main/phases/snapshot/docs.md#fd_filestat_get

            var result : FileStat;
            if (handle.fd_filestat_get === undefined) {
                if (trace) console.error("fd_filestat_get(%d, ...) failed: ERRNO_ACCESS (handle doesn't implement operation)", fd);
                return ERRNO_ACCESS; // handle does not support operation
            } else if (handle.async) {
                result = await handle.fd_filestat_get();
            } else {
                result = handle.fd_filestat_get();
            }
            write_filestat(buf, 0 as usize, result);
            return ERRNO_SUCCESS;
        })}

        function fd_prestat_dir_name(fd: Fd, path: ptr, path_len: usize): Errno { return wrap_fd(fd, "fd_prestat_dir_name", async (handle) => {
            // https://docs.rs/wasi/0.10.2+wasi-snapshot-preview1/src/wasi/lib_generated.rs.html#1741
            // https://github.com/WebAssembly/WASI/blob/main/phases/snapshot/docs.md#fd_prestat_dir_name

            var result : Uint8Array;
            if (handle.fd_prestat_dir_name === undefined) {
                if (trace) console.error("fd_prestat_dir_name(%d, ...) failed: ERRNO_ACCESS (handle doesn't implement operation)", fd);
                return ERRNO_ACCESS; // handle does not support operation
            } else if (handle.async) {
                result = await handle.fd_prestat_dir_name();
            } else {
                result = handle.fd_prestat_dir_name();
            }
            if (path_len < result.length) {
                if (trace) console.error("fd_prestat_dir_name(%d, ...) failed: ERRNO_NAMETOOLONG (provided buffer smaller than dir name)", fd);
                return ERRNO_NAMETOOLONG; // handle does not support operation
            }
            for (var i=0; i<result.length; ++i)         memory.write_u8(path, i, result[i] as u8);
            for (var i=result.length; i<path_len; ++i)  memory.write_u8(path, i, 0 as u8);
            return ERRNO_SUCCESS;
        })}

        function fd_prestat_get(fd: Fd, buf: ptr): Errno { return wrap_fd(fd, "fd_prestat_get", async (handle) => {
            // https://docs.rs/wasi/0.10.2+wasi-snapshot-preview1/src/wasi/lib_generated.rs.html#1739
            // https://github.com/WebAssembly/WASI/blob/main/phases/snapshot/docs.md#fd_prestat_get

            var result : PreStat;
            if (handle.fd_prestat_get === undefined) {
                if (trace) console.error("fd_prestat_get(%d, ...) failed: ERRNO_ACCESS (handle doesn't implement operation)", fd);
                return ERRNO_ACCESS; // handle does not support operation
            } else if (handle.async) {
                result = await handle.fd_prestat_get();
            } else {
                result = handle.fd_prestat_get();
            }
            write_prestat(buf, 0 as usize, result);
            return ERRNO_SUCCESS;
        })}

        function fd_read(fd: Fd, iovec_array_ptr: ptr, iovec_array_len: usize, nread_ptr: ptr): Errno { return wrap_fd(fd, "fd_read", async (handle) => {
            // https://docs.rs/wasi/0.10.2+wasi-snapshot-preview1/src/wasi/lib_generated.rs.html#1754
            // https://github.com/WebAssembly/WASI/blob/main/phases/snapshot/docs.md#fd_read

            if (handle.fd_read === undefined) {
                if (trace) console.error("fd_read(%d, ...) failed: ERRNO_ACCESS (handle doesn't implement operation)", fd);
                return ERRNO_ACCESS; // handle does not support operation
            }

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

        function fd_write(fd: Fd, ciovec_array_ptr: ptr, ciovec_array_len: usize, nwritten_ptr: ptr): Errno { return wrap_fd(fd, "fd_write", async (handle) => {
            // https://docs.rs/wasi/0.10.2+wasi-snapshot-preview1/src/wasi/lib_generated.rs.html#1796
            // https://github.com/WebAssembly/WASI/blob/main/phases/snapshot/docs.md#fd_write
            // https://nodejs.org/api/wasi.html

            if (handle.fd_write === undefined) {
                if (trace) console.error("fd_write(%d, ...) failed: ERRNO_ACCESS (handle doesn't implement operation)", fd);
                return ERRNO_ACCESS; // handle does not support operation
            }

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

        function path_filestat_get(fd: Fd, flags: LookupFlags, path_ptr: ptr, path_len: usize, buf: ptr): Errno { return wrap_fd(fd, "path_filestat_get", async (handle) => {
            // https://docs.rs/wasi/0.10.2+wasi-snapshot-preview1/src/wasi/lib_generated.rs.html#1805
            // https://github.com/WebAssembly/WASI/blob/main/phases/snapshot/docs.md#path_filestat_get

            const path = memory.read_string(path_ptr, +0 as usize, path_len);
            if (handle.path_filestat_get === undefined) {
                if (trace) console.error("path_filestat_get(%d, ..., \"%s\", ...) failed: ERRNO_ACCESS (handle doesn't implement operation)", fd, path);
                return ERRNO_ACCESS; // handle does not support operation
            }

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
        ): Errno { return wrap_fd(fd, "path_open", async (handle) => {
            // https://docs.rs/wasi/0.10.2+wasi-snapshot-preview1/src/wasi/lib_generated.rs.html#1352
            // https://github.com/WebAssembly/WASI/blob/main/phases/snapshot/docs.md#path_open

            const path = memory.read_string(path_ptr, 0 as usize, path_len);
            if (handle.path_open === undefined) {
                if (trace) console.error("path_open(%d, ..., \"%s\", ...) failed: ERRNO_ACCESS (handle doesn't implement operation)", fd, path);
                return ERRNO_ACCESS; // handle does not support operation
            }

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
            fd_prestat_dir_name,
            fd_prestat_get,
            fd_read,
            fd_write,
            path_filestat_get,
            path_open,
        };
    }
}
