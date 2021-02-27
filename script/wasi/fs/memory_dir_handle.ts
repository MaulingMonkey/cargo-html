namespace wasi.fs {
    export class MemoryDirHandle implements Handle {
        readonly async = false;
        readonly fs:        io.memory.FileSystem;
        readonly dirs:      io.memory.Dir[] = [];
        readonly leaf:      io.memory.Dir;
        //readonly path:      string;
        readonly prestat:   Uint8Array | undefined;

        fdflags = FDFLAGS_NONE;

        //debug(): string { return `MemoryDirHandle(\`${this.path}\`)`; }
        debug(): string { return `MemoryDirHandle`; }

        //constructor(fs: io.memory.FileSystem, dirs: io.memory.Dir[], path: string, prestat?: true) {
        constructor(fs: io.memory.FileSystem, dirs: io.memory.Dir[], prestat?: string) {
            const leaf = dirs[dirs.length - 1];
            if (leaf === undefined) throw `MemoryDirHandle: at least one directory must be specified in array`;
            this.fs     = fs;
            this.dirs   = dirs;
            this.leaf   = leaf;
            //this.path   = path;
            if (prestat !== undefined) this.prestat = new TextEncoder().encode(prestat);
        }

        fd_close() {
            // noop
        }

        fd_advise(_offset: FileSize, _len: FileSize, _advice: Advice) {}
        fd_allocate(offset: FileSize, len: FileSize) { throw ERRNO_ISDIR; }
        fd_datasync() {} // TODO: sync fs if it has persistence?

        fd_fdstat_get(): FdStat {
            return {
                filetype:           FILETYPE_DIRECTORY,
                flags:              this.fdflags,
                rights_base:        RIGHTS_ALL_DIR,
                rights_inheriting:  RIGHTS_ALL,
            };
        }

        fd_fdstat_set_flags(fdflags: FdFlags) { this.fdflags = fdflags; }

        fd_filestat_get(): FileStat {
            return {
                dev:            0n as Device,
                ino:            BigInt(this.leaf.node) as Inode,
                filetype:       FILETYPE_DIRECTORY,
                nlink:          0n as LinkCount,
                size:           0n as FileSize,
                access_time:    0n as TimeStamp,
                modified_time:  0n as TimeStamp,
                change_time:    0n as TimeStamp,
            };
        }

        fd_prestat_dir_name(): Uint8Array {
            if (this.prestat === undefined) throw ERRNO_NOTCAPABLE;
            return this.prestat;
        }

        fd_prestat_get(): PreStat {
            if (this.prestat === undefined) throw ERRNO_NOTCAPABLE;
            return {
                tag:                PREOPENTYPE_DIR,
                u_dir_pr_name_len:  this.prestat.length as usize,
            };
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
                            dir.children[name] = {
                                type: "dir",
                                node: this.fs.next_node_id++,
                                children:   {},
                                listable:   true,
                                readable:   true,
                                writeable:  true,
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

        path_filestat_get(_flags: LookupFlags, path: string): FileStat {
            const existing = this.path_open(_flags, path, OFLAGS_NONE, RIGHTS_FD_FILESTAT_GET, RIGHTS_NONE, FDFLAGS_NONE);
            try {
                return existing.fd_filestat_get!();
            } finally {
                if (existing.fd_close) existing.fd_close();
            }
        }

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
                                n = parent.children[name] = {
                                    type:       "dir",
                                    node:       this.fs.next_node_id++,
                                    children:   {},
                                    listable:   true,
                                    readable:   true,
                                    writeable:  true,
                                };
                            } else {
                                n = parent.children[name] = {
                                    type:       "file",
                                    node:       this.fs.next_node_id++,
                                    data:       new Uint8Array(128),
                                    length:     0,
                                    readable:   true,
                                    writeable:  true,
                                    readers:    0,
                                    writers:    0,
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
                            const h = new MemoryFileHandle(n, write);
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
    }
}
