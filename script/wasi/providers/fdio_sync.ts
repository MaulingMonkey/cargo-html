namespace wasi {
    export function fdio_sync(i: Imports, memory: MemoryLE, tty: XTermTty | DomTty | undefined, settings: Settings) {
        const trace = true;

        const FS = new io.memory.FileSystem();
        FS.now = () => {
            if (i._cargo_html_shenannigans_do_not_use.file_time_now === undefined) return (0n as TimeStamp);
            else return i._cargo_html_shenannigans_do_not_use.file_time_now();
        };

        const root = FS.init_dir("/");
        //root.writeable = false;
        const temp = FS.init_dir("/temp/");
        temp.listable = false;
        const home = FS.init_dir("/home/");

        interface FdEntry {
            handle:         Handle;
            rights_base:    Rights,
            rights_inherit: Rights,
        }

        const FDS : { [fd: number]: (FdEntry | undefined) } = {
            // root and cwd preopened handles
            // stable vs nightly rust treat this differently for inferring the CWD, but DIR_ROOT should be portable
            // https://github.com/WebAssembly/wasi-libc/blob/5ccebd3130ef6e384474d921d0c24ebf5403ae1a/libc-bottom-half/sources/getcwd.c#L10
            3: { handle: new wasi.fs.MemoryDirHandle(FS, [root], "/"), rights_base: RIGHTS_ALL, rights_inherit: RIGHTS_ALL },
            4: { handle: new wasi.fs.MemoryDirHandle(FS, [root], "."), rights_base: RIGHTS_ALL, rights_inherit: RIGHTS_ALL },
        };

        const RIGHTS_CONIN = rights(
            // harmless but pointless?
            // RIGHTS_FD_ADVISE,
            // RIGHTS_FD_DATASYNC,
            // RIGHTS_FD_FDSTAT_SET_FLAGS,
            // RIGHTS_FD_SYNC,

            RIGHTS_FD_FILESTAT_GET,
            RIGHTS_FD_READ,
            //RIGHTS_POLL_FD_READWRITE, // TODO
        );

        switch (settings.stdin || (tty ? "tty" : "prompt")) {
            case "badfd":   break;
            case "prompt":  break; // TODO: proper prompt device
            case "tty":     break; // no stdin support
        }

        const RIGHTS_CONOUT = rights(
            // harmless but pointless?
            // RIGHTS_FD_ADVISE,
            // RIGHTS_FD_DATASYNC,
            // RIGHTS_FD_FDSTAT_SET_FLAGS,
            // RIGHTS_FD_SYNC,

            RIGHTS_FD_FILESTAT_GET,
            RIGHTS_FD_WRITE,
            //RIGHTS_POLL_FD_READWRITE, // TODO
        );

        const stdout = TextStreamWriter.from_output(settings.stdout || (tty ? "tty" : "console-log"),   "stdout", tty);
        const stderr = TextStreamWriter.from_output(settings.stdout || (tty ? "tty" : "console-error"), "stderr", tty);
        if (stdout) FDS[1] = { handle: stdout, rights_base: RIGHTS_CONOUT, rights_inherit: RIGHTS_NONE };
        if (stderr) FDS[2] = { handle: stderr, rights_base: RIGHTS_CONOUT, rights_inherit: RIGHTS_NONE };

        // XXX: WASI recommends randomizing FDs, but I want optional deterministic behavior.
        let _next_fd = 0x1000;
        function advance_fd(): number {
            ++_next_fd;
            if (_next_fd > 0x3FFFFFFF) _next_fd = 0x1000;
            return _next_fd ^ 0xFF; // shuffle low bits around some
        }
        function alloc_fd(entry: FdEntry): Fd {
            var fd = 0;
            while ((fd = advance_fd()) in FDS) {}
            FDS[fd] = entry;
            return fd as Fd;
        }

        function get_io_caller_name(): string {
            const s = (new Error()).stack;
            if (!s) return "???";
            const m = /^\s*at ((fd|path)_[a-zA-Z_]*)/gm.exec(s);
            if (!m) return "???";
            return m[1];
        }

        function wrap_fd(fd: Fd, req_rights_base: Rights, op: (e: FdEntry) => Errno): Errno {
            const name = trace ? get_io_caller_name() : undefined;
            const e = FDS[fd];
            if (e === undefined) {
                if (trace) console.error("%s(fd=%d, ...) failed: ERRNO_BADF", name, fd);
                return ERRNO_BADF; // handle does not exist
            }
            if ((e.rights_base & req_rights_base) !== req_rights_base) return _ERRNO_RIGHTS_FAILED;
            let ret : Errno;
            try {
                ret = op(e);
            } catch (errno) {
                if (typeof errno === "number") {
                    ret = errno as Errno;
                } else {
                    throw errno;
                }
            }
            if (trace && ret !== ERRNO_SUCCESS) console.error("%s(fd=%d, entry=%s, ...) failed: ERRNO_%s", name, fd, e.handle.debug(), errno_string(ret));
            return ret;
        }

        function wrap_path(fd: Fd, req_rights_base: Rights, _lookup: LookupFlags | undefined, path_ptr: ptr, path_len: usize, op: (e: FdEntry, path: string) => Errno): Errno {
            const name = trace ? get_io_caller_name() : undefined;
            const path = memory.read_string(path_ptr, +0 as usize, path_len);
            const e = FDS[fd];
            if (e === undefined) {
                if (trace) console.error("%s(fd=%d, path=\"%s\", ...) failed: ERRNO_BADF", name, fd, path);
                return ERRNO_BADF; // handle does not exist
            }
            let ret : Errno;
            try {
                ret = op(e, path);
            } catch (errno) {
                if (typeof errno === "number") {
                    ret = errno as Errno;
                } else {
                    throw errno;
                }
            }
            if (trace && ret !== ERRNO_SUCCESS) console.error("%s(fd=%d, path=\"%s\", ...) failed: ERRNO_%s", name, fd, path, errno_string(ret));
            return ret;
        }

        /////////////////////////////////////////////////// SYSCALLS ///////////////////////////////////////////////////

        i.wasi_snapshot_preview1.fd_advise = function fd_advise(fd: Fd, offset: FileSize, len: FileSize, advice: Advice): Errno { return wrap_fd(fd, RIGHTS_FD_ADVISE, e => {
            advice_validate(advice);
            const r = e.handle.fd_advise(offset, len, advice);
            return ERRNO_SUCCESS;
        })}

        i.wasi_snapshot_preview1.fd_allocate = function fd_allocate(fd: Fd, offset: FileSize, len: FileSize): Errno { return wrap_fd(fd, RIGHTS_FD_ALLOCATE, e => {
            if (len === 0n) throw ERRNO_INVAL;
            e.handle.fd_allocate(offset, len);
            return ERRNO_SUCCESS;
        })}

        i.wasi_snapshot_preview1.fd_close = function fd_close(fd: Fd): Errno { return wrap_fd(fd, RIGHTS_NONE, e => {
            e.handle.fd_close();
            delete FDS[fd];
            return ERRNO_SUCCESS;
        })}

        i.wasi_snapshot_preview1.fd_datasync = function fd_datasync(fd: Fd): Errno { return wrap_fd(fd, RIGHTS_FD_DATASYNC, e => {
            e.handle.fd_datasync();
            delete FDS[fd];
            return ERRNO_SUCCESS;
        })}

        i.wasi_snapshot_preview1.fd_fdstat_get = function fd_fdstat_get(fd: Fd, buf: ptr): Errno { return wrap_fd(fd, RIGHTS_NONE, e => {
            var stat = e.handle.fd_fdstat_get();
            stat = {
                filetype:           stat.filetype,
                flags:              stat.flags,
                rights_base:        (stat.rights_base         & e.rights_base     ) as Rights,
                rights_inheriting:  (stat.rights_inheriting   & e.rights_inherit  ) as Rights,
            };
            write_fdstat(memory, buf, 0 as usize, stat);
            return ERRNO_SUCCESS;
        })}

        i.wasi_snapshot_preview1.fd_fdstat_set_flags = function fd_fdstat_set_flags(fd: Fd, flags: FdFlags): Errno { return wrap_fd(fd, RIGHTS_FD_FDSTAT_SET_FLAGS, e => {
            const r = e.handle.fd_fdstat_set_flags(flags);
            return ERRNO_SUCCESS;
        })}

        i.wasi_snapshot_preview1.fd_fdstat_set_rights = function fd_fdstat_set_rights(fd: Fd, rights_base: Rights, rights_inheriting: Rights): Errno { return wrap_fd(fd, RIGHTS_NONE, e => {
            // This syscall is not allowed to add rights, only subtract them.
            if ((e.rights_base      & rights_base       ) != rights_base        ) return ERRNO_NOTCAPABLE;
            if ((e.rights_inherit   & rights_inheriting ) != rights_inheriting  ) return ERRNO_NOTCAPABLE;
            // I'm tempted to always narrow the rights, even on failure... note that this would *not* be the correct code to do that with! would need to be `&=`!
            e.rights_base       = rights_base;
            e.rights_inherit    = rights_inheriting;
            return ERRNO_SUCCESS;
        })}

        i.wasi_snapshot_preview1.fd_filestat_get = function fd_filestat_get(fd: Fd, buf: ptr): Errno { return wrap_fd(fd, RIGHTS_FD_FILESTAT_GET, e => {
            const stat = e.handle.fd_filestat_get();
            write_filestat(memory, buf, 0 as usize, stat);
            return ERRNO_SUCCESS;
        })}

        i.wasi_snapshot_preview1.fd_filestat_set_size = function fd_filestat_set_size(fd: Fd, size: FileSize): Errno { return wrap_fd(fd, RIGHTS_FD_FILESTAT_SET_SIZE, e => {
            e.handle.fd_filestat_set_size(size);
            return ERRNO_SUCCESS;
        })}

        i.wasi_snapshot_preview1.fd_filestat_set_times = function fd_filestat_set_times(fd: Fd, access_time: TimeStamp, modified_time: TimeStamp, fst_flags: FstFlags): Errno { return wrap_fd(fd, RIGHTS_FD_FILESTAT_SET_TIMES, e => {
            validate_fst_flags(fst_flags);
            e.handle.fd_filestat_set_times(access_time, modified_time, fst_flags);
            return ERRNO_SUCCESS;
        })}

        i.wasi_snapshot_preview1.fd_pread = function fd_pread(fd: Fd, iovec_array_ptr: ptr, iovec_array_len: usize, offset: FileSize, nread: ptr): Errno { return wrap_fd(fd, rights(RIGHTS_FD_READ, RIGHTS_FD_SEEK), e => {
            if (e.handle.fd_pread === undefined) return ERRNO_NOTCAPABLE;
            const read = e.handle.fd_pread(new IovecArray(memory, iovec_array_ptr, iovec_array_len), offset);
            memory.write_usize(nread, 0, read as usize);
            return ERRNO_SUCCESS;
        })}

        i.wasi_snapshot_preview1.fd_prestat_dir_name = function fd_prestat_dir_name(fd: Fd, path: ptr, path_len: usize): Errno { return wrap_fd(fd, RIGHTS_NONE, e => {
            if (e.handle.prestat_dir === undefined) return ERRNO_NOTCAPABLE;
            const name : Uint8Array = e.handle.prestat_dir;
            console.assert(name[name.length-1] === 0); // name should've been preterminated with `\0`
            if (path_len < name.length) return ERRNO_NAMETOOLONG;
            for (var i=0; i<name.length; ++i) memory.write_u8(path, i, name[i] as u8);
            return ERRNO_SUCCESS;
        })}

        i.wasi_snapshot_preview1.fd_prestat_get = function fd_prestat_get(fd: Fd, buf: ptr): Errno { return wrap_fd(fd, RIGHTS_NONE, e => {
            if (e.handle.prestat_dir === undefined) return ERRNO_NOTCAPABLE;
            const name : Uint8Array = e.handle.prestat_dir;
            console.assert(name[name.length-1] === 0); // name should've been preterminated with `\0`
            memory.write_u8     (buf, 0, 0 as u8); // PREOPENTYPE_DIR: https://github.com/WebAssembly/WASI/blob/main/phases/snapshot/docs.md#preopentype
            memory.write_usize  (buf, 4, name.length as usize); // https://github.com/WebAssembly/WASI/blob/main/phases/snapshot/docs.md#prestat_dir
            return ERRNO_SUCCESS;
        })}

        i.wasi_snapshot_preview1.fd_pwrite = function fd_pwrite(fd: Fd, ciovec_array_ptr: ptr, ciovec_array_len: usize, offset: FileSize, nwritten: ptr): Errno { return wrap_fd(fd, rights(RIGHTS_FD_WRITE, RIGHTS_FD_SEEK), e => {
            if (e.handle.fd_pwrite === undefined) return ERRNO_NOTCAPABLE;
            const wrote = e.handle.fd_pwrite(new IovecArray(memory, ciovec_array_ptr, ciovec_array_len), offset);
            memory.write_usize(nwritten, 0, wrote as usize);
            return ERRNO_SUCCESS;
        })}

        i.wasi_snapshot_preview1.fd_read = function fd_read(fd: Fd, iovec_array_ptr: ptr, iovec_array_len: usize, nread_ptr: ptr): Errno { return wrap_fd(fd, RIGHTS_FD_READ, e => {
            if (e.handle.fd_read === undefined) return ERRNO_NOTCAPABLE;
            const iovec = new IovecArray(memory, iovec_array_ptr, iovec_array_len);
            const nwritten = e.handle.fd_read(iovec);
            memory.write_usize(nread_ptr, 0, nwritten as usize);
            return ERRNO_SUCCESS;
        })}

        i.wasi_snapshot_preview1.fd_readdir = function fd_readdir(fd: Fd, buf: ptr, buf_len: usize, cookie: DirCookie, buf_used: ptr): Errno { return wrap_fd(fd, RIGHTS_FD_READDIR, e => {
            if (e.handle.fd_readdir === undefined) return ERRNO_NOTCAPABLE;
            const dirents = e.handle.fd_readdir(cookie, buf_len);

            let used = 0;
            const dirent_header = new DataView(new ArrayBuffer(DIRENT_SIZE));
            dirents.forEach(src => {
                if (buf_len <= 0) return;

                dirent_header.setBigUint64(  0, src.next, true);
                dirent_header.setBigUint64(  8, src.ino,  true);
                dirent_header.setUint32(    16, src.name.length, true);
                dirent_header.setUint8(     20, src.type);

                var n = Math.min(buf_len, DIRENT_SIZE);
                for (let i=0; i<n; ++i) memory.write_u8(buf, i, dirent_header.getUint8(i) as u8);
                buf     = (buf + n) as ptr;
                buf_len = (buf_len - n) as usize;
                used    += n;

                var n = Math.min(buf_len, src.name.length);
                for (let i=0; i<n; ++i) memory.write_u8(buf, i, src.name[i] as u8);
                buf     = (buf + n) as ptr;
                buf_len = (buf_len - n) as usize;
                used    += n;
            });

            memory.write_usize(buf_used, +0, used as usize);

            return ERRNO_SUCCESS;
        })}

        i.wasi_snapshot_preview1.fd_renumber = function fd_renumber(from: Fd, to: Fd): Errno {
            if (!(from in FDS)) return ERRNO_BADF;
            const e = FDS[to];
            if (e !== undefined) e.handle.fd_close();
            FDS[to] = FDS[from];
            delete FDS[from];
            return ERRNO_SUCCESS;
        }

        i.wasi_snapshot_preview1.fd_seek = function fd_seek(fd: Fd, offset: FileDelta, whence: Whence, new_offset: ptr): Errno { return wrap_fd(fd, RIGHTS_NONE, e => {
            const rights = ((offset === 0n) && (whence === WHENCE_CUR)) ? RIGHTS_FD_TELL : RIGHTS_FD_SEEK;
            if ((e.rights_base & rights) !== rights) return _ERRNO_RIGHTS_FAILED;
            if (e.handle.fd_seek === undefined) return ERRNO_NOTCAPABLE;
            const newoff = e.handle.fd_seek(offset, whence);
            memory.write_u64(new_offset, 0, newoff);
            return ERRNO_SUCCESS;
        })}

        i.wasi_snapshot_preview1.fd_sync = function fd_sync(fd: Fd): Errno { return wrap_fd(fd, RIGHTS_FD_SYNC, e => {
            if (e.handle.fd_sync === undefined) return ERRNO_NOTCAPABLE;
            e.handle.fd_sync();
            return ERRNO_SUCCESS;
        })}

        i.wasi_snapshot_preview1.fd_tell = function fd_tell(fd: Fd, offset: ptr): Errno { return wrap_fd(fd, RIGHTS_FD_TELL, e => {
            if (e.handle.fd_tell === undefined) return ERRNO_NOTCAPABLE;
            const newoff = e.handle.fd_tell();
            memory.write_u64(offset, 0, newoff);
            return ERRNO_SUCCESS;
        })}

        i.wasi_snapshot_preview1.fd_write = function fd_write(fd: Fd, ciovec_array_ptr: ptr, ciovec_array_len: usize, nwritten_ptr: ptr): Errno {
            return wrap_fd(fd, RIGHTS_FD_WRITE, e => {
                if (e.handle.fd_write === undefined) return ERRNO_NOTCAPABLE;
                const ciovec = new IovecArray(memory, ciovec_array_ptr, ciovec_array_len);
                const nwritten = e.handle.fd_write(ciovec);
                memory.write_usize(nwritten_ptr, 0, nwritten as usize);
                return ERRNO_SUCCESS;
            })
        }

        i.wasi_snapshot_preview1.path_create_directory = function path_create_directory(fd: Fd, path_ptr: ptr, path_len: usize): Errno {
            return wrap_path(fd, RIGHTS_PATH_CREATE_DIRECTORY, undefined, path_ptr, path_len, (e, path) => {
                if (e.handle.path_create_directory === undefined) return ERRNO_NOTCAPABLE;
                e.handle.path_create_directory(path);
                return ERRNO_SUCCESS;
            })
        }

        i.wasi_snapshot_preview1.path_filestat_get = function path_filestat_get(fd: Fd, flags: LookupFlags, path_ptr: ptr, path_len: usize, buf: ptr): Errno {
            return wrap_path(fd, RIGHTS_PATH_FILESTAT_GET, flags, path_ptr, path_len, (e, path) => {
                if (e.handle.path_filestat_get === undefined) return ERRNO_NOTCAPABLE;
                const stat = e.handle.path_filestat_get(flags, path);
                write_filestat(memory, buf, 0 as usize, stat);
                return ERRNO_SUCCESS;
            })
        }

        i.wasi_snapshot_preview1.path_filestat_set_times = function path_filestat_set_times(fd: Fd, flags: LookupFlags, path_ptr: ptr, path_len: usize, access_time: TimeStamp, modified_time: TimeStamp, fst_flags: FstFlags): Errno {
            return wrap_path(fd, RIGHTS_PATH_FILESTAT_SET_TIMES, flags, path_ptr, path_len, (e, path) => {
                if (e.handle.path_filestat_set_times === undefined) return ERRNO_NOTCAPABLE;
                e.handle.path_filestat_set_times(flags, path, access_time, modified_time, fst_flags);;
                return ERRNO_SUCCESS;
            })
        }

        i.wasi_snapshot_preview1.path_link = function path_link(old_fd: Fd, old_flags: LookupFlags, old_path_ptr: ptr, old_path_len: usize, new_fd: Fd, new_path_ptr: ptr, new_path_len: usize): Errno {
            return wrap_path(old_fd, RIGHTS_PATH_LINK_SOURCE, old_flags, old_path_ptr, old_path_len, (old, old_path) => {
                if (old.handle.path_link === undefined) return ERRNO_NOTCAPABLE;
                const new_path = memory.read_string(new_path_ptr, +0 as usize, new_path_len);
                const to = FDS[new_fd];
                if (to === undefined) {
                    if (trace) console.error("path_link(old_fd=%d, old_path=\"%s\", new_fd=%d, new_path=\"%s\", ...) failed: ERRNO_BADF (new_fd is invalid)", old_fd, old_path, new_fd, new_path);
                    return ERRNO_BADF; // handle does not exist
                } else if (!(to.rights_base & RIGHTS_PATH_LINK_TARGET)) {
                    return _ERRNO_RIGHTS_FAILED;
                } else {
                    old.handle.path_link(old_flags, old_path, to.handle, new_path);
                }
                return ERRNO_SUCCESS;
            })
        }

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
        ): Errno { return wrap_path(fd, RIGHTS_PATH_OPEN, dirflags, path_ptr, path_len, (e, path) => {
            if (e.handle.path_open === undefined) return ERRNO_NOTCAPABLE;
            if ((fdflags & FDFLAGS_DSYNC) && !(e.rights_base & RIGHTS_FD_DATASYNC   )) return _ERRNO_RIGHTS_FAILED;
            if ((fdflags & FDFLAGS_DSYNC) && !(e.rights_base & RIGHTS_FD_SYNC       )) return _ERRNO_RIGHTS_FAILED;
            if ((fdflags & FDFLAGS_RSYNC) && !(e.rights_base & RIGHTS_FD_SYNC       )) return _ERRNO_RIGHTS_FAILED;
            if ((oflags & OFLAGS_CREAT) && !(e.rights_base & RIGHTS_PATH_CREATE_FILE)) return _ERRNO_RIGHTS_FAILED;
            if ((oflags & OFLAGS_TRUNC) && !(e.rights_base & RIGHTS_PATH_FILESTAT_SET_SIZE)) return _ERRNO_RIGHTS_FAILED;

            const handle = e.handle.path_open(dirflags, path, oflags, fs_rights_base, fs_rights_inheriting, fdflags);

            const out_fd = alloc_fd({ handle, rights_base: e.rights_inherit, rights_inherit: e.rights_inherit });
            memory.write_u32(opened_fd, +0, out_fd);
            return ERRNO_SUCCESS;
        })}

        i.wasi_snapshot_preview1.path_readlink = function path_readlink(fd: Fd, path_ptr: ptr, path_len: usize, buf: ptr, buf_len: usize, buf_used: ptr): Errno {
            return wrap_path(fd, RIGHTS_PATH_READLINK, undefined, path_ptr, path_len, (e, path) => {
                memory.write_usize(buf_used, 0, 0 as usize);

                if (e.handle.path_readlink === undefined) return ERRNO_NOTCAPABLE;
                const symlink = e.handle.path_readlink(path);

                const r = new TextEncoder().encode(symlink);
                const n = Math.min(buf_len, r.length);
                for (let i=0; i<n; ++i) memory.write_u8(buf, i, r[i] as u8);
                memory.write_usize(buf_used, 0, n as usize);
                return ERRNO_SUCCESS;
            })
        }

        i.wasi_snapshot_preview1.path_remove_directory = function path_remove_directory(fd: Fd, path_ptr: ptr, path_len: usize): Errno {
            return wrap_path(fd, RIGHTS_PATH_REMOVE_DIRECTORY, undefined, path_ptr, path_len, (e, path) => {
                if (e.handle.path_remove_directory === undefined) return ERRNO_NOTCAPABLE;
                e.handle.path_remove_directory(path);
                return ERRNO_SUCCESS;
            })
        }

        i.wasi_snapshot_preview1.path_rename = function path_rename(old_fd: Fd, old_path_ptr: ptr, old_path_len: usize, new_fd: Fd, new_path_ptr: ptr, new_path_len: usize): Errno {
            return wrap_path(old_fd, RIGHTS_PATH_RENAME_SOURCE, undefined, old_path_ptr, old_path_len, (old, old_path) => {
                if (old.handle.path_rename === undefined) return ERRNO_NOTCAPABLE;
                const new_path = memory.read_string(new_path_ptr, +0 as usize, new_path_len);
                const to = FDS[new_fd];
                if (to === undefined) {
                    if (trace) console.error("path_rename(old_fd=%d, old_path=\"%s\", new_fd=%d, new_path=\"%s\", ...) failed: ERRNO_BADF (new_fd is invalid)", old_fd, old_path, new_fd, new_path);
                    return ERRNO_BADF; // handle does not exist
                } else if (!(to.rights_base & RIGHTS_PATH_RENAME_TARGET)) {
                    return _ERRNO_RIGHTS_FAILED;
                } else {
                    old.handle.path_rename(old_path, to.handle, new_path);
                }
                return ERRNO_SUCCESS;
            })
        }

        i.wasi_snapshot_preview1.path_symlink = function path_symlink(old_path_ptr: ptr, old_path_len: usize, fd: Fd, new_path_ptr: ptr, new_path_len: usize): Errno {
            return wrap_fd(fd, RIGHTS_PATH_SYMLINK, e => {
                if (e.handle.path_symlink === undefined) return ERRNO_NOTCAPABLE;
                const old_path = memory.read_string(old_path_ptr, +0 as usize, old_path_len);
                const new_path = memory.read_string(new_path_ptr, +0 as usize, new_path_len);
                e.handle.path_symlink(old_path, new_path);
                return ERRNO_SUCCESS;
            })
        }

        i.wasi_snapshot_preview1.path_unlink_file = function path_unlink_file(fd: Fd, path_ptr: ptr, path_len: usize): Errno {
            return wrap_path(fd, RIGHTS_PATH_UNLINK_FILE, undefined, path_ptr, path_len, (e, path) => {
                if (e.handle.path_unlink_file === undefined) return ERRNO_NOTCAPABLE;
                e.handle.path_unlink_file(path);
                return ERRNO_SUCCESS;
            })
        }

        i.wasi_snapshot_preview1.sock_recv = function sock_recv(fd: Fd, ri_data_ptr: ptr, ri_data_len: usize, ri_flags: RiFlags, ro_datalen: ptr, ro_flags: ptr): Errno {
            return wrap_fd(fd, RIGHTS_FD_READ, e => {
                memory.write_usize(ro_datalen, +0, 0 as usize);
                memory.write_u16(  ro_flags,   +0, 0 as RoFlags);

                if (e.handle.sock_recv === undefined) return ERRNO_NOTSOCK;
                const r = e.handle.sock_recv(new IovecArray(memory, ri_data_ptr, ri_data_len), ri_flags);

                const [read, flags] = r;
                memory.write_usize(ro_datalen, +0, read );
                memory.write_u16(  ro_flags,   +0, flags);
                return ERRNO_SUCCESS;
            })
        }

        i.wasi_snapshot_preview1.sock_send = function sock_send(fd: Fd, si_data_ptr: ptr, si_data_len: usize, si_flags: SiFlags, so_datalen: ptr): Errno {
            return wrap_fd(fd, RIGHTS_FD_WRITE, e => {
                memory.write_usize(so_datalen, +0, 0 as usize);
                if (e.handle.sock_send === undefined) return ERRNO_NOTSOCK;

                const wrote = e.handle.sock_send(new IovecArray(memory, si_data_ptr, si_data_len), si_flags);
                memory.write_usize(so_datalen, +0, wrote);
                return ERRNO_SUCCESS;
            })
        }

        i.wasi_snapshot_preview1.sock_shutdown = function sock_shutdown(fd: Fd, how: SdFlags): Errno {
            return wrap_fd(fd, RIGHTS_SOCK_SHUTDOWN, e => {
                if (e.handle.sock_shutdown === undefined) return ERRNO_NOTSOCK;
                e.handle.sock_shutdown(how);
                return ERRNO_SUCCESS;
            })
        }
    }
}
