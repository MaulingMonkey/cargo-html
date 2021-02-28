namespace wasi.fs {
    export class MemoryDirHandle implements Handle {
        readonly async = false;
        readonly fs:            io.memory.FileSystem;
        readonly dirs:          io.memory.Dir[] = [];
        readonly leaf:          io.memory.Dir;
        readonly prestat_dir:   Uint8Array | undefined;

        fdflags = FDFLAGS_NONE;

        debug(): string { return `MemoryDirHandle`; }

        constructor(fs: io.memory.FileSystem, dirs: io.memory.Dir[], prestat?: string) {
            const leaf = dirs[dirs.length - 1];
            if (leaf === undefined) throw `MemoryDirHandle: at least one directory must be specified in array`;
            this.fs     = fs;
            this.dirs   = dirs;
            this.leaf   = leaf;
            if (prestat !== undefined) this.prestat_dir = new TextEncoder().encode(prestat+"\0");
        }

        fd_close() {} // noop

        fd_advise(_offset: FileSize, _len: FileSize, _advice: Advice) {}
        fd_allocate(_offset: FileSize, _len: FileSize) { throw ERRNO_ISDIR; }
        fd_datasync() { this.fs.sync(); }
        fd_fdstat_set_flags(fdflags: FdFlags) { this.fdflags = fdflags; }
        fd_filestat_set_size(size: FileSize) { throw ERRNO_ISDIR; }
        fd_sync() { this.fs.sync(); }

        fd_fdstat_get(): FdStat {
            return {
                filetype:           FILETYPE_DIRECTORY,
                flags:              this.fdflags,
                rights_base:        RIGHTS_ALL_DIR,
                rights_inheriting:  RIGHTS_ALL,
            };
        }

        fd_filestat_get(): FileStat {
            return {
                dev:            0n as Device,
                ino:            BigInt(this.leaf.node) as Inode,
                filetype:       FILETYPE_DIRECTORY,
                nlink:          0n as LinkCount,
                size:           0n as FileSize,
                access_time:    this.leaf.last_access_time,
                modified_time:  this.leaf.last_modified_time,
                change_time:    this.leaf.last_change_time,
            };
        }


        fd_filestat_set_times(access_time: TimeStamp, modified_time: TimeStamp, fst_flags: FstFlags) {
            const now = this.fs.now();
            if      (fst_flags & FSTFLAGS_ATIM)     this.leaf.last_access_time = access_time;
            else if (fst_flags & FSTFLAGS_ATIM_NOW) this.leaf.last_access_time = now;
            if      (fst_flags & FSTFLAGS_MTIM)     this.leaf.last_modified_time = modified_time;
            else if (fst_flags & FSTFLAGS_MTIM_NOW) this.leaf.last_modified_time = now;
        }

        fd_readdir(cookie: DirCookie, maxbytes: number): DirEnt[] {
            if (maxbytes <= 0)                      throw ERRNO_INVAL;
            if (cookie >= Number.MAX_SAFE_INTEGER)  throw ERRNO_INVAL;

            const r : DirEnt[] = [];
            const entries = Object.entries(this.leaf.children);
            const utf8 = new TextEncoder();

            for (let i = Number(cookie); (i < entries.length) && (maxbytes > 0); ++i) {
                const [name, e] = entries[i];
                var type;
                switch (e.type) {
                    case "dir":     type = FILETYPE_DIRECTORY; break;
                    case "file":    type = FILETYPE_REGULAR_FILE; break;
                }
                r.push({
                    ino:    0n as Inode,
                    name:   utf8.encode(name),
                    next:   BigInt(i+1) as DirCookie,
                    type,
                });
                maxbytes -= DIRENT_SIZE + name.length;
            }

            return r;
        }

        path_create_directory(path: string) {
            const dirs = [...this.dirs];

            path.split("/").forEach((name, i, components) => {
                if (i === components.length - 1) {
                    switch (name) {
                        case ".":   throw ERRNO_EXIST;
                        case "..":  throw ERRNO_EXIST;
                        default:
                            const dir = dirs[dirs.length-1];
                            if (name in dir.children) throw ERRNO_EXIST;
                            if (!(dir.writeable)) throw ERRNO_ROFS;
                            const now = this.fs.now();
                            dir.children[name] = {
                                type:               "dir",
                                node:               this.fs.next_node_id++,
                                children:           {},
                                created_time:       now,
                                last_access_time:   now,
                                last_modified_time: now,
                                last_change_time:   now,
                                listable:           true,
                                readable:           true,
                                writeable:          true,
                            };
                            break;
                    }
                } else {
                    switch (name) {
                        case ".":
                            // noop
                            break;
                        case "..":
                            dirs.pop();
                            if (dirs.length === 0) throw ERRNO_NOENT; // popped root
                            break;
                        default:
                            const dir = dirs[dirs.length-1];
                            const child = dir.children[name];
                            if (!child) throw ERRNO_NOENT;
                            if (child.type !== "dir") throw ERRNO_NOTDIR;
                            dirs.push(child);
                            break;
                    }
                }
            });
        }

        path_remove_directory(path: string) { this.path_remove(path, "dir", ERRNO_NOTDIR); }
        path_unlink_file(path: string) { this.path_remove(path, "file", ERRNO_ISDIR); }
        private path_remove(path: string, type: string, wrongtype: Errno) {
            const nodes : io.memory.Node[] = [...this.dirs];

            path.split("/").forEach((name, i, components) => {
                switch (name) {
                    case ".":
                        // noop
                        break;
                    case "..":
                        nodes.pop();
                        if (nodes.length === 0) throw ERRNO_NOENT; // popped root
                        break;
                    default:
                        const dir = nodes[nodes.length-1];
                        if (dir.type !== "dir") throw ERRNO_NOTDIR;
                        const child = dir.children[name];
                        if (!child) throw ERRNO_NOENT;
                        nodes.push(child);
                        break;
                }
            });

            const target = nodes.pop();
            const parent = nodes.pop();
            if (!target || !parent) throw ERRNO_ACCESS; // can't remove root dir
            if (parent.type !== "dir") throw ERRNO_NOTDIR; // bug?
            if (target.type !== type) throw wrongtype;
            if (target.type === "dir" && Object.keys(target.children).length > 0) throw ERRNO_NOTEMPTY;
            const children = Object.entries(parent.children);
            let removed = false;
            for (let i=0; i<children.length; ++i) {
                const [name, node] = children[i];
                if (node === target) {
                    delete parent.children[name];
                    removed = true;
                }
            }
            if (!removed) {
                console.error("failed to remove %s (did the path `%s` escape the current directory and access a stale dir or something?)", type, path);
                debugger;
                throw ERRNO_IO;
            }
        }

        path_filestat_get(_flags: LookupFlags, path: string): FileStat {
            const existing = this.path_open(_flags, path, OFLAGS_NONE, RIGHTS_FD_FILESTAT_GET, RIGHTS_NONE, FDFLAGS_NONE);
            try {
                return existing.fd_filestat_get!();
            } finally {
                if (existing.fd_close) existing.fd_close();
            }
        }

        path_filestat_set_times(flags: LookupFlags, path: string, access_time: TimeStamp, modified_time: TimeStamp, fst_flags: FstFlags) {
            const existing = this.path_open(flags, path, OFLAGS_NONE, RIGHTS_FD_FILESTAT_SET_TIMES, RIGHTS_NONE, FDFLAGS_NONE);
            try {
                return existing.fd_filestat_set_times(access_time, modified_time, fst_flags);
            } finally {
                if (existing.fd_close) existing.fd_close();
            }
        }

        // TODO: path_link?

        path_open(dirflags: LookupFlags, path: string, oflags: OFlags, _fs_rights_base: Rights, _fs_rights_inheriting: Rights, fdflags: FdFlags): wasi.Handle {
            const dirs = [...this.dirs];

            const follow_symlinks = !!(dirflags & LOOKUPFLAGS_SYMLINK_FOLLOW);

            const creat     = !!(oflags & OFLAGS_CREAT);
            const directory = !!(oflags & OFLAGS_DIRECTORY);
            const excl      = !!(oflags & OFLAGS_EXCL);
            const trunc     = !!(oflags & OFLAGS_TRUNC);

            const append    = !!(fdflags & FDFLAGS_APPEND);
            const nonblock  = !!(fdflags & FDFLAGS_NONBLOCK);   // noop for in-memory filesystems?
            const dsync     = !!(fdflags & FDFLAGS_DSYNC);      // noop until filesystem implements syncers
            const rsync     = !!(fdflags & FDFLAGS_RSYNC);
            const sync      = !!(fdflags & FDFLAGS_SYNC);

            const write     = !!(_fs_rights_inheriting & RIGHTS_FD_WRITE);

            const components = path.split("/");
            for (let i=0; i<components.length; ++i) {
                const name = components[i];
                if (i === components.length - 1) {
                    var n : io.memory.Node;
                    switch (name) {
                        case ".":
                            if (excl) throw ERRNO_EXIST;
                            n = dirs[dirs.length - 1];
                            break;
                        case "..":
                            dirs.pop();
                            if (dirs.length === 0) throw ERRNO_NOENT; // popped root
                            if (excl) throw ERRNO_EXIST;
                            n = dirs[dirs.length - 1];
                            break;
                        default:
                            const parent = dirs[dirs.length - 1];
                            const existing = parent.children[name];
                            if (existing) {
                                if (excl) throw ERRNO_EXIST;
                                if (directory && existing.type !== "dir") throw ERRNO_NOTDIR;
                                n = existing;
                            }
                            else if (!creat) throw ERRNO_NOENT;
                            else if (!parent.writeable) throw ERRNO_ROFS;
                            else if (directory) {
                                const now = this.fs.now();
                                n = parent.children[name] = {
                                    type:               "dir",
                                    node:               this.fs.next_node_id++,
                                    children:           {},
                                    created_time:       now,
                                    last_access_time:   now,
                                    last_modified_time: now,
                                    last_change_time:   now,
                                    listable:           true,
                                    readable:           true,
                                    writeable:          true,
                                };
                            } else {
                                const now = this.fs.now();
                                n = parent.children[name] = {
                                    type:               "file",
                                    node:               this.fs.next_node_id++,
                                    data:               new Uint8Array(128),
                                    length:             0,
                                    created_time:       now,
                                    last_access_time:   now,
                                    last_modified_time: now,
                                    last_change_time:   now,
                                    readable:           true,
                                    writeable:          true,
                                    readers:            0,
                                    writers:            0,
                                };
                            }
                            break;
                    }
                    var handle : wasi.Handle;
                    switch (n.type) {
                        case "dir":
                            if (trunc) throw ERRNO_ISDIR;
                            if (append) throw ERRNO_ISDIR;
                            dirs.push(n);
                            handle = new MemoryDirHandle(this.fs, dirs);
                            break;
                        case "file":
                            if (directory) throw ERRNO_NOTDIR;
                            const h = new MemoryFileHandle(this.fs, n, write);
                            if (trunc) {
                                for (let k=0; k<n.length; ++k) n.data[k] = 0;
                                n.length = 0;
                            }
                            if (append) h.position = n.length;
                            handle = h;
                            break;
                    }
                    handle.fd_fdstat_set_flags(fdflags);
                    return handle;
                } else {
                    switch (name) {
                        case ".":
                            // noop
                            break;
                        case "..":
                            dirs.pop();
                            if (dirs.length === 0) throw ERRNO_NOENT; // popped root
                            break;
                        default:
                            const dir = dirs[dirs.length-1];
                            const child = dir.children[name];
                            if (!child) throw ERRNO_NOENT;
                            if (child.type !== "dir") throw ERRNO_NOTDIR;
                            dirs.push(child);
                            break;
                    }
                }
            }

            // empty path
            const d = new MemoryDirHandle(this.fs, dirs);
            d.fd_fdstat_set_flags(fdflags);
            return d;
        }

        // TODO: path_readlink?

        // TODO: path_rename

        // TODO: path_symlink

        // TODO: polling?
    }
}
