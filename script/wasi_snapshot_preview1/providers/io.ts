namespace wasi_snapshot_preview1 {
    /**
     * Provide input/output related syscall implementations.
     */
    export function io(memory: MemoryLE, asyncifier: Asyncifier, domtty: DomTty | undefined, settings: Settings) {
        const trace = true;

        const DIR_TEMP = new fs.temp.Dir("/temp/", {});
        const DIR_HOME = new fs.temp.Dir("/home/", {});
        const DIR_ROOT = new fs.temp.Dir("/", {
            "temp": { node: DIR_TEMP },
            "home": { node: DIR_HOME },
        });

        const FDS : { [fd: number]: (Handle | HandleAsync | undefined) } = {
            // root and cwd preopened handles
            // stable vs nightly rust treat this differently for inferring the CWD, but DIR_ROOT should be portable
            // https://github.com/WebAssembly/wasi-libc/blob/5ccebd3130ef6e384474d921d0c24ebf5403ae1a/libc-bottom-half/sources/getcwd.c#L10
            3: new fs.temp.DirectoryHandle(DIR_ROOT, "/"),
            4: new fs.temp.DirectoryHandle(DIR_ROOT, "."),
        };

        switch (settings.stdin || (domtty ? "dom" : "prompt")) {
            case "badfd":   break;
            case "prompt":  break; // TODO: proper prompt device
            case "dom":     FDS[0] = ConReader.try_create({
                                mode:       settings.domtty?.mode   || "line-buffered",
                                listen_to:  settings.domtty?.listen || document,
                                input:      settings.domtty?.input  || "cargo-html-console-input",
                                echo:       (text) => domtty ? domtty.write(text) : undefined,
                            }); break;
        }

        const stdout = TextStreamWriter.from_output(settings.stdout || (domtty ? "dom" : "console-log"),   "#FFF", domtty);
        const stderr = TextStreamWriter.from_output(settings.stdout || (domtty ? "dom" : "console-error"), "#F44", domtty);
        if (stdout) FDS[1] = stdout;
        if (stderr) FDS[2] = stderr;

        // XXX: WASI recommends randomizing FDs, but I want optional deterministic behavior.
        let _next_fd = 0x1000;
        function advance_fd(): number {
            ++_next_fd;
            if (_next_fd > 0x3FFFFFFF) _next_fd = 0x1000;
            return _next_fd ^ 0xFF; // shuffle low bits around some
        }
        function alloc_handle_fd(handle: Handle | HandleAsync): Fd {
            var fd = 0;
            while ((fd = advance_fd()) in FDS) {}
            FDS[fd] = handle;
            return fd as Fd;
        }

        function get_io_caller_name(): string {
            const s = (new Error()).stack;
            if (!s) return "???";
            const m = /^\s*at ((fd|path)_[a-zA-Z_]*)/gm.exec(s);
            if (!m) return "???";
            return m[1];
        }

        function wrap_fd(fd: Fd, op: (handle: Handle | HandleAsync) => Promise<Errno>): Errno {
            const name = trace ? get_io_caller_name() : undefined;
            return asyncifier.asyncify(async () => {
                const handle = FDS[fd];
                if (handle === undefined) {
                    if (trace) console.error("%s(fd=%d, ...) failed: ERRNO_BADF", name, fd);
                    return ERRNO_BADF; // handle does not exist
                }
                let ret : Errno;
                try {
                    ret = await op(handle);
                } catch (errno) {
                    if (typeof errno === "number") {
                        ret = errno as Errno;
                    } else {
                        throw errno;
                    }
                }
                if (trace && ret !== ERRNO_SUCCESS) console.error("%s(fd=%d, entry=%s, ...) failed: ERRNO_%s", name, fd, handle.debug(), errno_string(ret));
                return ret;
            }, ERRNO_ASYNCIFY);
        }

        function wrap_path(fd: Fd, path_ptr: ptr, path_len: usize, op: (handle: Handle | HandleAsync, path: string) => Promise<Errno>): Errno {
            const name = trace ? get_io_caller_name() : undefined;
            return asyncifier.asyncify(async () => {
                const path = memory.read_string(path_ptr, +0 as usize, path_len);
                const handle = FDS[fd];
                if (handle === undefined) {
                    if (trace) console.error("%s(fd=%d, path=\"%s\", ...) failed: ERRNO_BADF", name, fd, path);
                    return ERRNO_BADF; // handle does not exist
                }
                let ret : Errno;
                try {
                    ret = await op(handle, path);
                } catch (errno) {
                    if (typeof errno === "number") {
                        ret = errno as Errno;
                    } else {
                        throw errno;
                    }
                }
                if (trace && ret !== ERRNO_SUCCESS) console.error("%s(fd=%d, path=\"%s\", ...) failed: ERRNO_%s", name, fd, path, errno_string(ret));
                return ret;
            }, ERRNO_ASYNCIFY);
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

        function fd_advise(fd: Fd, offset: FileSize, len: FileSize, advice: Advice): Errno { return wrap_fd(fd, async (handle) => {
            // https://docs.rs/wasi/0.10.2+wasi-snapshot-preview1/src/wasi/lib_generated.rs.html#1692
            // https://github.com/WebAssembly/WASI/blob/main/phases/snapshot/docs.md#fd_advise
            if (handle.fd_advise === undefined) {
                if (trace) console.error("operation not implemented");
                return ERRNO_ACCESS; // handle does not support operation
            } else if (handle.async) {
                await handle.fd_advise(offset, len, advice);
            } else {
                handle.fd_advise(offset, len, advice);
            }
            return ERRNO_SUCCESS;
        })}

        function fd_allocate(fd: Fd, offset: FileSize, len: FileSize): Errno { return wrap_fd(fd, async (handle) => {
            // https://docs.rs/wasi/0.10.2+wasi-snapshot-preview1/src/wasi/lib_generated.rs.html#1695
            // https://github.com/WebAssembly/WASI/blob/main/phases/snapshot/docs.md#fd_allocate
            if (handle.fd_allocate === undefined) {
                if (trace) console.error("operation not implemented");
                return ERRNO_ACCESS; // handle does not support operation
            } else if (handle.async) {
                await handle.fd_allocate(offset, len);
            } else {
                handle.fd_allocate(offset, len);
            }
            return ERRNO_SUCCESS;
        })}

        function fd_close(fd: Fd): Errno { return wrap_fd(fd, async (handle) => {
            // https://docs.rs/wasi/0.10.2+wasi-snapshot-preview1/src/wasi/lib_generated.rs.html#1698
            // https://github.com/WebAssembly/WASI/blob/main/phases/snapshot/docs.md#fd_close
            if (handle.fd_close === undefined) {
                if (trace) console.error("operation not implemented");
                return ERRNO_ACCESS; // handle does not support operation
            } else if (handle.async) {
                await handle.fd_close();
            } else {
                handle.fd_close();
            }
            delete FDS[fd];
            return ERRNO_SUCCESS;
        })}

        function fd_datasync(fd: Fd): Errno { return wrap_fd(fd, async (handle) => {
            // https://docs.rs/wasi/0.10.2+wasi-snapshot-preview1/src/wasi/lib_generated.rs.html#1701
            // https://github.com/WebAssembly/WASI/blob/main/phases/snapshot/docs.md#fd_datasync
            if (handle.fd_datasync === undefined) {
                if (trace) console.error("operation not implemented");
                return ERRNO_ACCESS; // handle does not support operation
            } else if (handle.async) {
                await handle.fd_datasync();
            } else {
                handle.fd_datasync();
            }
            delete FDS[fd];
            return ERRNO_SUCCESS;
        })}

        function fd_fdstat_get(fd: Fd, buf: ptr): Errno { return wrap_fd(fd, async (handle) => {
            // https://docs.rs/wasi/0.10.2+wasi-snapshot-preview1/src/wasi/lib_generated.rs.html#1704
            // https://github.com/WebAssembly/WASI/blob/main/phases/snapshot/docs.md#fd_fdstat_get
            var result : FdStat;
            if (handle.fd_fdstat_get === undefined) {
                if (trace) console.error("operation not implemented");
                return ERRNO_ACCESS; // handle does not support operation
            } else if (handle.async) {
                result = await handle.fd_fdstat_get();
            } else {
                result = handle.fd_fdstat_get();
            }
            write_fdstat(memory, buf, 0 as usize, result);
            return ERRNO_SUCCESS;
        })}

        function fd_fdstat_set_flags(fd: Fd, flags: FdFlags): Errno { return wrap_fd(fd, async (handle) => {
            // https://docs.rs/wasi/0.10.2+wasi-snapshot-preview1/src/wasi/lib_generated.rs.html#1707
            // https://github.com/WebAssembly/WASI/blob/main/phases/snapshot/docs.md#fd_fdstat_set_flags
            if (handle.fd_fdstat_set_flags === undefined) {
                if (trace) console.error("operation not implemented");
                return ERRNO_ACCESS; // handle does not support operation
            } else if (handle.async) {
                await handle.fd_fdstat_set_flags(flags);
            } else {
                handle.fd_fdstat_set_flags(flags);
            }
            return ERRNO_SUCCESS;
        })}

        function fd_fdstat_set_rights(fd: Fd, rights: Rights): Errno { return wrap_fd(fd, async (handle) => {
            // https://docs.rs/wasi/0.10.2+wasi-snapshot-preview1/src/wasi/lib_generated.rs.html#1710
            // https://github.com/WebAssembly/WASI/blob/main/phases/snapshot/docs.md#fd_fdstat_set_rights
            if (handle.fd_fdstat_set_rights === undefined) {
                if (trace) console.error("operation not implemented");
                return ERRNO_ACCESS; // handle does not support operation
            } else if (handle.async) {
                await handle.fd_fdstat_set_rights(rights);
            } else {
                handle.fd_fdstat_set_rights(rights);
            }
            return ERRNO_SUCCESS;
        })}

        function fd_filestat_get(fd: Fd, buf: ptr): Errno { return wrap_fd(fd, async (handle) => {
            // https://docs.rs/wasi/0.10.2+wasi-snapshot-preview1/src/wasi/lib_generated.rs.html#1717
            // https://github.com/WebAssembly/WASI/blob/main/phases/snapshot/docs.md#fd_filestat_get

            var result : FileStat;
            if (handle.fd_filestat_get === undefined) {
                if (trace) console.error("operation not implemented");
                return ERRNO_ACCESS; // handle does not support operation
            } else if (handle.async) {
                result = await handle.fd_filestat_get();
            } else {
                result = handle.fd_filestat_get();
            }
            write_filestat(memory, buf, 0 as usize, result);
            return ERRNO_SUCCESS;
        })}

        function fd_filestat_set_size(fd: Fd, size: FileSize): Errno { return wrap_fd(fd, async (handle) => {
            // https://docs.rs/wasi/0.10.2+wasi-snapshot-preview1/src/wasi/lib_generated.rs.html#1719
            // https://github.com/WebAssembly/WASI/blob/main/phases/snapshot/docs.md#fd_filestat_set_size
            if (handle.fd_filestat_set_size === undefined) {
                if (trace) console.error("operation not implemented");
                return ERRNO_ACCESS; // handle does not support operation
            } else if (handle.async) {
                await handle.fd_filestat_set_size(size);
            } else {
                handle.fd_filestat_set_size(size);
            }
            return ERRNO_SUCCESS;
        })}

        function fd_filestat_set_times(fd: Fd, access_time: TimeStamp, modified_time: TimeStamp, fst_flags: FstFlags): Errno { return wrap_fd(fd, async (handle) => {
            // https://docs.rs/wasi/0.10.2+wasi-snapshot-preview1/src/wasi/lib_generated.rs.html#1722
            // https://github.com/WebAssembly/WASI/blob/main/phases/snapshot/docs.md#fd_filestat_set_times
            if (handle.fd_filestat_set_times === undefined) {
                if (trace) console.error("operation not implemented");
                return ERRNO_ACCESS; // handle does not support operation
            } else if (handle.async) {
                await handle.fd_filestat_set_times(access_time, modified_time, fst_flags);
            } else {
                handle.fd_filestat_set_times(access_time, modified_time, fst_flags);
            }
            return ERRNO_SUCCESS;
        })}

        function fd_pread(fd: Fd, iovec_array_ptr: ptr, iovec_array_len: usize, offset: FileSize, nread: ptr): Errno { return wrap_fd(fd, async (handle) => {
            // https://docs.rs/wasi/0.10.2+wasi-snapshot-preview1/src/wasi/lib_generated.rs.html#1730
            // https://github.com/WebAssembly/WASI/blob/main/phases/snapshot/docs.md#fd_pread
            var result;
            if (handle.fd_pread === undefined) {
                if (trace) console.error("operation not implemented");
                return ERRNO_ACCESS; // handle does not support operation
            } else if (handle.async) {
                result = await handle.fd_pread(new IovecArray(memory, iovec_array_ptr, iovec_array_len), offset);
            } else {
                result = handle.fd_pread(new IovecArray(memory, iovec_array_ptr, iovec_array_len), offset);
            }
            memory.write_usize(nread, 0, result as usize);
            return ERRNO_SUCCESS;
        })}

        function fd_prestat_dir_name(fd: Fd, path: ptr, path_len: usize): Errno { return wrap_fd(fd, async (handle) => {
            // https://docs.rs/wasi/0.10.2+wasi-snapshot-preview1/src/wasi/lib_generated.rs.html#1741
            // https://github.com/WebAssembly/WASI/blob/main/phases/snapshot/docs.md#fd_prestat_dir_name

            var result : Uint8Array;
            if (handle.fd_prestat_dir_name === undefined) {
                if (trace) console.error("operation not implemented");
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

        function fd_prestat_get(fd: Fd, buf: ptr): Errno { return wrap_fd(fd, async (handle) => {
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

        function fd_pwrite(fd: Fd, ciovec_array_ptr: ptr, ciovec_array_len: usize, offset: FileSize, nwritten: ptr): Errno { return wrap_fd(fd, async (handle) => {
            // https://docs.rs/wasi/0.10.2+wasi-snapshot-preview1/src/wasi/lib_generated.rs.html#1743
            // https://github.com/WebAssembly/WASI/blob/main/phases/snapshot/docs.md#fd_pwrite
            var result;
            if (handle.fd_pwrite === undefined) {
                if (trace) console.error("operation not implemented");
                return ERRNO_ACCESS; // handle does not support operation
            } else if (handle.async) {
                result = await handle.fd_pwrite(new IovecArray(memory, ciovec_array_ptr, ciovec_array_len), offset);
            } else {
                result = handle.fd_pwrite(new IovecArray(memory, ciovec_array_ptr, ciovec_array_len), offset);
            }
            memory.write_usize(nwritten, 0, result as usize);
            return ERRNO_SUCCESS;
        })}

        function fd_read(fd: Fd, iovec_array_ptr: ptr, iovec_array_len: usize, nread_ptr: ptr): Errno { return wrap_fd(fd, async (handle) => {
            // https://docs.rs/wasi/0.10.2+wasi-snapshot-preview1/src/wasi/lib_generated.rs.html#1752
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

        function fd_readdir(fd: Fd, buf: ptr, buf_len: usize, cookie: DirCookie, buf_used: ptr): Errno { return wrap_fd(fd, async (handle) => {
            // https://docs.rs/wasi/0.10.2+wasi-snapshot-preview1/src/wasi/lib_generated.rs.html#1755
            // https://github.com/WebAssembly/WASI/blob/main/phases/snapshot/docs.md#fd_readdir
            var result;
            if (handle.fd_readdir === undefined) {
                if (trace) console.error("operation not implemented");
                return ERRNO_ACCESS; // handle does not support operation
            } else if (handle.async) {
                result = await handle.fd_readdir(cookie, buf_len);
            } else {
                result = handle.fd_readdir(cookie, buf_len);
            }

            const dirent_header = new DataView(new Uint8Array(DIRENT_SIZE));
            result.forEach(src => {
                if (buf_len <= 0) return;
                const name = new TextEncoder().encode(src.name);

                dirent_header.setBigUint64(  0, src.next, true);
                dirent_header.setBigUint64(  8, src.ino,  true);
                dirent_header.setUint32(    16, name.length, true);
                dirent_header.setUint8(     20, src.type);

                var n = Math.min(buf_len, DIRENT_SIZE);
                for (let i=0; i<n; ++i) memory.write_u8(buf, i, dirent_header.getUint8(i) as u8);
                buf     = (buf + n) as ptr;
                buf_len = (buf_len - n) as usize;

                var n = Math.min(buf_len, name.length);
                for (let i=0; i<n; ++i) memory.write_u8(buf, i, name[i] as u8);
                buf     = (buf + n) as ptr;
                buf_len = (buf_len - n) as usize;
            });

            return ERRNO_SUCCESS;
        })}

        function fd_renumber(from: Fd, to: Fd): Errno {
            // https://docs.rs/wasi/0.10.2+wasi-snapshot-preview1/src/wasi/lib_generated.rs.html#1771
            // https://github.com/WebAssembly/WASI/blob/main/phases/snapshot/docs.md#fd_renumber

            if (!(from in FDS)) return ERRNO_BADF;

            // TODO: other implementations seem to allow clobbering `to`.
            // perhaps I should instead try to close this FD?
            // what if FDS[to] isn't closable or throws an error?
            // should I make fd_close support mandatory for `Handle`?
            // should I forbid falliable fd_close?
            // should I ignore failing fd_close?
            if (to in FDS) return ERRNO_PERM;

            FDS[to] = FDS[from];
            delete FDS[from];
            return ERRNO_SUCCESS;
        }

        function fd_seek(fd: Fd, offset: FileDelta, whence: Whence, new_offset: ptr): Errno { return wrap_fd(fd, async (handle) => {
            // https://github.com/WebAssembly/WASI/blob/main/phases/snapshot/docs.md#fd_seek
            // https://docs.rs/wasi/0.10.2+wasi-snapshot-preview1/src/wasi/lib_generated.rs.html#1780
            var result;
            if (handle.fd_seek === undefined) {
                if (trace) console.error("handle doesn't implement operation");
                return ERRNO_ACCESS;
            } else if (handle.async) {
                result = await handle.fd_seek(offset, whence);
            } else {
                result = handle.fd_seek(offset, whence);
            }
            memory.write_u64(new_offset, 0, result);
            return ERRNO_SUCCESS;
        })}

        function fd_sync(fd: Fd): Errno { return wrap_fd(fd, async (handle) => {
            // https://github.com/WebAssembly/WASI/blob/main/phases/snapshot/docs.md#fd_sync
            // https://docs.rs/wasi/0.10.2+wasi-snapshot-preview1/src/wasi/lib_generated.rs.html#1788
            if (handle.fd_sync === undefined) {
                if (trace) console.error("handle doesn't implement operation");
                return ERRNO_ACCESS;
            } else if (handle.async) {
                await handle.fd_sync();
            } else {
                handle.fd_sync();
            }
            return ERRNO_SUCCESS;
        })}

        function fd_tell(fd: Fd, offset: ptr): Errno { return wrap_fd(fd, async (handle) => {
            // https://github.com/WebAssembly/WASI/blob/main/phases/snapshot/docs.md#fd_tell
            // https://docs.rs/wasi/0.10.2+wasi-snapshot-preview1/src/wasi/lib_generated.rs.html#1791
            var result;
            if (handle.fd_tell === undefined) {
                if (trace) console.error("handle doesn't implement operation");
                return ERRNO_ACCESS;
            } else if (handle.async) {
                result = await handle.fd_tell();
            } else {
                result = handle.fd_tell();
            }
            memory.write_u64(offset, 0, result);
            return ERRNO_SUCCESS;
        })}

        function fd_write(fd: Fd, ciovec_array_ptr: ptr, ciovec_array_len: usize, nwritten_ptr: ptr): Errno { return wrap_fd(fd, async (handle) => {
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

        // TODO: more I/O

        function path_create_directory(fd: Fd, path_ptr: ptr, path_len: usize): Errno { return wrap_path(fd, path_ptr, path_len, async (handle, path) => {
            // https://docs.rs/wasi/0.10.2+wasi-snapshot-preview1/src/wasi/lib_generated.rs.html#1802
            // https://github.com/WebAssembly/WASI/blob/main/phases/snapshot/docs.md#path_create_directory
            if (handle.path_create_directory === undefined) {
                if (trace) console.error("handle doesn't implement operation");
                return ERRNO_ACCESS;
            } else if (handle.async) {
                await handle.path_create_directory(path);
            } else {
                handle.path_create_directory(path);
            }
            return ERRNO_SUCCESS;
        })}

        function path_filestat_get(fd: Fd, flags: LookupFlags, path_ptr: ptr, path_len: usize, buf: ptr): Errno { return wrap_path(fd, path_ptr, path_len, async (handle, path) => {
            // https://docs.rs/wasi/0.10.2+wasi-snapshot-preview1/src/wasi/lib_generated.rs.html#1805
            // https://github.com/WebAssembly/WASI/blob/main/phases/snapshot/docs.md#path_filestat_get
            var stat : FileStat;
            if (handle.path_filestat_get === undefined) {
                if (trace) console.error("path_filestat_get(%d, ..., \"%s\", ...) failed: ERRNO_ACCESS (handle doesn't implement operation)", fd, path);
                return ERRNO_ACCESS; // handle does not support operation
            } else if (handle.async) {
                stat = await handle.path_filestat_get(flags, path);
            } else {
                stat = handle.path_filestat_get(flags, path);
            }
            write_filestat(memory, buf, 0 as usize, stat);
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
        ): Errno { return wrap_path(fd, path_ptr, path_len, async (handle, path) => {
            // https://docs.rs/wasi/0.10.2+wasi-snapshot-preview1/src/wasi/lib_generated.rs.html#1352
            // https://github.com/WebAssembly/WASI/blob/main/phases/snapshot/docs.md#path_open

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
            fd_prestat_dir_name,
            fd_prestat_get,
            fd_pwrite,
            fd_read,
            fd_readdir,
            fd_renumber,
            fd_seek,
            fd_sync,
            fd_tell,
            fd_write,

            // TODO: more I/O

            path_create_directory,
            path_filestat_get,
            path_open,
        };
    }
}
