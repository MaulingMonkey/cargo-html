namespace wasi {
    /**
     * Provide input/output related syscall implementations.
     */
    export function io(i: Imports, memory: MemoryLE, asyncifier: Asyncifier, domtty: DomTty | undefined, settings: Settings) {
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

        function wrap_path(fd: Fd, _lookup: LookupFlags | undefined, path_ptr: ptr, path_len: usize, op: (handle: Handle | HandleAsync, path: string) => Promise<Errno>): Errno {
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

        /////////////////////////////////////////////////// SYSCALLS ///////////////////////////////////////////////////

        i.wasi_snapshot_preview1.fd_advise = function fd_advise(fd: Fd, offset: FileSize, len: FileSize, advice: Advice): Errno { return wrap_fd(fd, async handle => {
            if (handle.fd_advise === undefined) {
                if (trace) console.error("operation not implemented");
                return ERRNO_ACCESS; // handle does not support operation
            }
            const r = handle.fd_advise(offset, len, advice);
            if (handle.async) await r;
            return ERRNO_SUCCESS;
        })}

        i.wasi_snapshot_preview1.fd_allocate = function fd_allocate(fd: Fd, offset: FileSize, len: FileSize): Errno { return wrap_fd(fd, async handle => {
            if (handle.fd_allocate === undefined) {
                if (trace) console.error("operation not implemented");
                return ERRNO_ACCESS; // handle does not support operation
            }
            const r = handle.fd_allocate(offset, len);
            if (handle.async) await r;
            return ERRNO_SUCCESS;
        })}

        i.wasi_snapshot_preview1.fd_close = function fd_close(fd: Fd): Errno { return wrap_fd(fd, async handle => {
            if (handle.fd_close === undefined) {
                if (trace) console.error("operation not implemented");
                return ERRNO_ACCESS; // handle does not support operation
            }
            const r = handle.fd_close();
            if (handle.async) await r;
            delete FDS[fd];
            return ERRNO_SUCCESS;
        })}

        i.wasi_snapshot_preview1.fd_datasync = function fd_datasync(fd: Fd): Errno { return wrap_fd(fd, async handle => {
            if (handle.fd_datasync === undefined) {
                if (trace) console.error("operation not implemented");
                return ERRNO_ACCESS; // handle does not support operation
            }
            const r = handle.fd_datasync();
            if (handle.async) await r;
            delete FDS[fd];
            return ERRNO_SUCCESS;
        })}

        i.wasi_snapshot_preview1.fd_fdstat_get = function fd_fdstat_get(fd: Fd, buf: ptr): Errno { return wrap_fd(fd, async handle => {
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

        i.wasi_snapshot_preview1.fd_fdstat_set_flags = function fd_fdstat_set_flags(fd: Fd, flags: FdFlags): Errno { return wrap_fd(fd, async handle => {
            if (handle.fd_fdstat_set_flags === undefined) {
                if (trace) console.error("operation not implemented");
                return ERRNO_ACCESS; // handle does not support operation
            }
            const r = handle.fd_fdstat_set_flags(flags);
            if (handle.async) await r;
            return ERRNO_SUCCESS;
        })}

        i.wasi_snapshot_preview1.fd_fdstat_set_rights = function fd_fdstat_set_rights(fd: Fd, rights: Rights): Errno { return wrap_fd(fd, async handle => {
            if (handle.fd_fdstat_set_rights === undefined) {
                if (trace) console.error("operation not implemented");
                return ERRNO_ACCESS; // handle does not support operation
            }
            const r = handle.fd_fdstat_set_rights(rights);
            if (handle.async) await r;
            return ERRNO_SUCCESS;
        })}

        i.wasi_snapshot_preview1.fd_filestat_get = function fd_filestat_get(fd: Fd, buf: ptr): Errno { return wrap_fd(fd, async handle => {
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

        i.wasi_snapshot_preview1.fd_filestat_set_size = function fd_filestat_set_size(fd: Fd, size: FileSize): Errno { return wrap_fd(fd, async handle => {
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

        i.wasi_snapshot_preview1.fd_filestat_set_times = function fd_filestat_set_times(fd: Fd, access_time: TimeStamp, modified_time: TimeStamp, fst_flags: FstFlags): Errno { return wrap_fd(fd, async handle => {
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

        i.wasi_snapshot_preview1.fd_pread = function fd_pread(fd: Fd, iovec_array_ptr: ptr, iovec_array_len: usize, offset: FileSize, nread: ptr): Errno { return wrap_fd(fd, async handle => {
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

        i.wasi_snapshot_preview1.fd_prestat_dir_name = function fd_prestat_dir_name(fd: Fd, path: ptr, path_len: usize): Errno { return wrap_fd(fd, async handle => {
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

        i.wasi_snapshot_preview1.fd_prestat_get = function fd_prestat_get(fd: Fd, buf: ptr): Errno { return wrap_fd(fd, async handle => {
            var result : PreStat;
            if (handle.fd_prestat_get === undefined) {
                if (trace) console.error("fd_prestat_get(%d, ...) failed: ERRNO_ACCESS (handle doesn't implement operation)", fd);
                return ERRNO_ACCESS; // handle does not support operation
            } else if (handle.async) {
                result = await handle.fd_prestat_get();
            } else {
                result = handle.fd_prestat_get();
            }
            write_prestat(memory, buf, 0 as usize, result);
            return ERRNO_SUCCESS;
        })}

        i.wasi_snapshot_preview1.fd_pwrite = function fd_pwrite(fd: Fd, ciovec_array_ptr: ptr, ciovec_array_len: usize, offset: FileSize, nwritten: ptr): Errno { return wrap_fd(fd, async handle => {
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

        i.wasi_snapshot_preview1.fd_read = function fd_read(fd: Fd, iovec_array_ptr: ptr, iovec_array_len: usize, nread_ptr: ptr): Errno { return wrap_fd(fd, async handle => {
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

        i.wasi_snapshot_preview1.fd_readdir = function fd_readdir(fd: Fd, buf: ptr, buf_len: usize, cookie: DirCookie, buf_used: ptr): Errno { return wrap_fd(fd, async handle => {
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

        i.wasi_snapshot_preview1.fd_renumber = function fd_renumber(from: Fd, to: Fd): Errno {
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

        i.wasi_snapshot_preview1.fd_seek = function fd_seek(fd: Fd, offset: FileDelta, whence: Whence, new_offset: ptr): Errno { return wrap_fd(fd, async handle => {
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

        i.wasi_snapshot_preview1.fd_sync = function fd_sync(fd: Fd): Errno { return wrap_fd(fd, async handle => {
            if (handle.fd_sync === undefined) {
                if (trace) console.error("handle doesn't implement operation");
                return ERRNO_ACCESS;
            };
            const r = handle.fd_sync();
            if (handle.async) await r;
            return ERRNO_SUCCESS;
        })}

        i.wasi_snapshot_preview1.fd_tell = function fd_tell(fd: Fd, offset: ptr): Errno { return wrap_fd(fd, async handle => {
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

        i.wasi_snapshot_preview1.fd_write = function fd_write(fd: Fd, ciovec_array_ptr: ptr, ciovec_array_len: usize, nwritten_ptr: ptr): Errno { return wrap_fd(fd, async handle => {
            if (handle.fd_write === undefined) {
                if (trace) console.error("handle doesn't implement operation");
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

        i.wasi_snapshot_preview1.path_create_directory = function path_create_directory(fd: Fd, path_ptr: ptr, path_len: usize): Errno { return wrap_path(fd, undefined, path_ptr, path_len, async (handle, path) => {
            if (handle.path_create_directory === undefined) {
                if (trace) console.error("handle doesn't implement operation");
                return ERRNO_ACCESS;
            }
            const r = await handle.path_create_directory(path);
            if (handle.async) await r;
            return ERRNO_SUCCESS;
        })}

        i.wasi_snapshot_preview1.path_filestat_get = function path_filestat_get(fd: Fd, flags: LookupFlags, path_ptr: ptr, path_len: usize, buf: ptr): Errno { return wrap_path(fd, flags, path_ptr, path_len, async (handle, path) => {
            var stat : FileStat;
            if (handle.path_filestat_get === undefined) {
                if (trace) console.error("handle doesn't implement operation");
                return ERRNO_ACCESS; // handle does not support operation
            } else if (handle.async) {
                stat = await handle.path_filestat_get(flags, path);
            } else {
                stat = handle.path_filestat_get(flags, path);
            }
            write_filestat(memory, buf, 0 as usize, stat);
            return ERRNO_SUCCESS;
        })}

        i.wasi_snapshot_preview1.path_filestat_set_times = function path_filestat_set_times(fd: Fd, flags: LookupFlags, path_ptr: ptr, path_len: usize, access_time: TimeStamp, modified_time: TimeStamp, fst_flags: FstFlags): Errno { return wrap_path(fd, flags, path_ptr, path_len, async (handle, path) => {
            if (handle.path_filestat_set_times === undefined) {
                if (trace) console.error("handle doesn't implement operation");
                return ERRNO_ACCESS; // handle does not support operation
            }
            const r = handle.path_filestat_set_times(flags, path, access_time, modified_time, fst_flags);;
            if (handle.async) await r;
            return ERRNO_SUCCESS;
        })}

        i.wasi_snapshot_preview1.path_link = function path_link(old_fd: Fd, old_flags: LookupFlags, old_path_ptr: ptr, old_path_len: usize, new_fd: Fd, new_path_ptr: ptr, new_path_len: usize): Errno { return wrap_path(old_fd, old_flags, old_path_ptr, old_path_len, async (old_handle, old_path) => {
            if (old_handle.path_link === undefined) {
                if (trace) console.error("handle doesn't implement operation");
                return ERRNO_ACCESS; // handle does not support operation
            }
            const new_path = memory.read_string(new_path_ptr, +0 as usize, new_path_len);
            const new_handle = FDS[new_fd];
            if (new_handle === undefined) {
                if (trace) console.error("path_link(old_fd=%d, old_path=\"%s\", new_fd=%d, new_path=\"%s\", ...) failed: ERRNO_BADF (new_fd is invalid)", old_fd, old_path, new_fd, new_path);
                return ERRNO_BADF; // handle does not exist
            } else if (old_handle.async) {
                await old_handle.path_link(old_flags, old_path, new_handle, new_path);
            } else if (new_handle.async) {
                if (trace) console.error("path_link(old_fd=%d, old_path=\"%s\", new_fd=%d, new_path=\"%s\", ...) failed: ERRNO_XDEV (new_fd is async, old_fd isn't)", old_fd, old_path, new_fd, new_path);
                return ERRNO_XDEV;
            } else {
                old_handle.path_link(old_flags, old_path, new_handle, new_path);
            }
            return ERRNO_SUCCESS;
        })}

        i.wasi_snapshot_preview1.path_open = function path_open(
            fd:                     Fd,
            dirflags:               LookupFlags,
            path_ptr:               ptr,
            path_len:               usize,
            oflags:                 OFlags,
            fs_rights_base:         Rights,
            fs_rights_inheriting:   Rights,
            fdflags:                FdFlags,
            opened_fd:              ptr,
        ): Errno { return wrap_path(fd, dirflags, path_ptr, path_len, async (handle, path) => {
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

        i.wasi_snapshot_preview1.path_readlink = function path_readlink(fd: Fd, path_ptr: ptr, path_len: usize, buf: ptr, buf_len: usize, buf_used: ptr): Errno { return wrap_path(fd, undefined, path_ptr, path_len, async (handle, path) => {
            memory.write_usize(buf_used, 0, 0 as usize);
            var result;
            if (handle.path_readlink === undefined) {
                if (trace) console.error("handle doesn't implement operation");
                return ERRNO_ACCESS;
            } else if (handle.async) {
                result = await handle.path_readlink(path);
            } else {
                result = handle.path_readlink(path);
            }
            const r = new TextEncoder().encode(result);
            const n = Math.min(buf_len, r.length);
            for (let i=0; i<n; ++i) memory.write_u8(buf, i, r[i] as u8);
            memory.write_usize(buf_used, 0, n as usize);
            return ERRNO_SUCCESS;
        })}

        i.wasi_snapshot_preview1.path_remove_directory = function path_remove_directory(fd: Fd, path_ptr: ptr, path_len: usize): Errno { return wrap_path(fd, undefined, path_ptr, path_len, async (handle, path) => {
            if (handle.path_remove_directory === undefined) {
                if (trace) console.error("handle doesn't implement operation");
                return ERRNO_ACCESS;
            }
            const r = handle.path_remove_directory(path);
            if (handle.async) await r;
            return ERRNO_SUCCESS;
        })}

        i.wasi_snapshot_preview1.path_rename = function path_rename(old_fd: Fd, old_path_ptr: ptr, old_path_len: usize, new_fd: Fd, new_path_ptr: ptr, new_path_len: usize): Errno { return wrap_path(old_fd, undefined, old_path_ptr, old_path_len, async (old_handle, old_path) => {
            if (old_handle.path_rename === undefined) {
                if (trace) console.error("handle doesn't implement operation");
                return ERRNO_ACCESS;
            }
            const new_path = memory.read_string(new_path_ptr, +0 as usize, new_path_len);
            const new_handle = FDS[new_fd];
            if (new_handle === undefined) {
                if (trace) console.error("path_rename(old_fd=%d, old_path=\"%s\", new_fd=%d, new_path=\"%s\", ...) failed: ERRNO_BADF (new_fd is invalid)", old_fd, old_path, new_fd, new_path);
                return ERRNO_BADF; // handle does not exist
            } else if (old_handle.async) {
                await old_handle.path_rename(old_path, new_handle, new_path);
            } else if (new_handle.async) {
                if (trace) console.error("path_rename(old_fd=%d, old_path=\"%s\", new_fd=%d, new_path=\"%s\", ...) failed: ERRNO_XDEV (new_fd is async, old_fd isn't)", old_fd, old_path, new_fd, new_path);
                return ERRNO_XDEV;
            } else {
                old_handle.path_rename(old_path, new_handle, new_path);
            }
            return ERRNO_SUCCESS;
        })}

        i.wasi_snapshot_preview1.path_symlink = function path_symlink(old_path_ptr: ptr, old_path_len: usize, fd: Fd, new_path_ptr: ptr, new_path_len: usize): Errno { return wrap_fd(fd, async handle => {
            if (handle.path_symlink === undefined) {
                if (trace) console.error("handle doesn't implement operation");
                return ERRNO_ACCESS;
            }
            const old_path = memory.read_string(old_path_ptr, +0 as usize, old_path_len);
            const new_path = memory.read_string(new_path_ptr, +0 as usize, new_path_len);
            const r = handle.path_symlink(old_path, new_path);
            if (handle.async) await r;
            return ERRNO_SUCCESS;
        })}

        i.wasi_snapshot_preview1.path_unlink_file = function path_unlink_file(fd: Fd, path_ptr: ptr, path_len: usize): Errno { return wrap_path(fd, undefined, path_ptr, path_len, async (handle, path) => {
            if (handle.path_unlink_file === undefined) {
                if (trace) console.error("handle doesn't implement operation");
                return ERRNO_ACCESS;
            }
            const r = handle.path_unlink_file(path);
            if (handle.async) await r;
            return ERRNO_SUCCESS;
        })}

        i.wasi_snapshot_preview1.sock_recv = function sock_recv(fd: Fd, ri_data_ptr: ptr, ri_data_len: usize, ri_flags: RiFlags, ro_datalen: ptr, ro_flags: ptr): Errno { return wrap_fd(fd, async handle => {
            memory.write_usize(ro_datalen, +0, 0 as usize);
            memory.write_u16(  ro_flags,   +0, 0 as RoFlags);
            if (handle.sock_recv === undefined) return ERRNO_NOTSOCK;
            var result;
            if (handle.async) {
                result = await handle.sock_recv(new IovecArray(memory, ri_data_ptr, ri_data_len), ri_flags);
            } else {
                result = handle.sock_recv(new IovecArray(memory, ri_data_ptr, ri_data_len), ri_flags);
            }
            const [len, flags] = result;
            memory.write_usize(ro_datalen, +0, len  );
            memory.write_u16(  ro_flags,   +0, flags);
            return ERRNO_SUCCESS;
        })}

        i.wasi_snapshot_preview1.sock_send = function sock_send(fd: Fd, si_data_ptr: ptr, si_data_len: usize, si_flags: SiFlags, so_datalen: ptr): Errno { return wrap_fd(fd, async handle => {
            memory.write_usize(so_datalen, +0, 0 as usize);
            if (handle.sock_send === undefined) return ERRNO_NOTSOCK;
            var result;
            if (handle.async) {
                result = await handle.sock_send(new IovecArray(memory, si_data_ptr, si_data_len), si_flags);
            } else {
                result = handle.sock_send(new IovecArray(memory, si_data_ptr, si_data_len), si_flags);
            }
            memory.write_usize(so_datalen, +0, result);
            return ERRNO_SUCCESS;
        })}

        i.wasi_snapshot_preview1.sock_shutdown = function sock_shutdown(fd: Fd, how: SdFlags): Errno { return wrap_fd(fd, async handle => {
            if (handle.sock_shutdown === undefined) return ERRNO_NOTSOCK;
            const r = handle.sock_shutdown(how);
            if (handle.async) await r;
            return ERRNO_SUCCESS;
        })}
    }
}
