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
            const now = (fst_flags & (FSTFLAGS_ATIM_NOW | FSTFLAGS_MTIM_NOW)) ? this.fs.now() : (0n as TimeStamp);
            if      (fst_flags & FSTFLAGS_ATIM)     this.leaf.last_access_time = access_time;
            else if (fst_flags & FSTFLAGS_ATIM_NOW) this.leaf.last_access_time = now;
            if      (fst_flags & FSTFLAGS_MTIM)     this.leaf.last_modified_time = modified_time;
            else if (fst_flags & FSTFLAGS_MTIM_NOW) this.leaf.last_modified_time = now;
        }

        fd_readdir(cookie: DirCookie, maxbytes: number): DirEnt[] {
            if (maxbytes <= 0)                      throw ERRNO_INVAL;
            if (cookie >= Number.MAX_SAFE_INTEGER)  throw ERRNO_INVAL;

            const r : DirEnt[] = [];
            const entries = Object.entries(this.leaf.children); // TODO: fix this source of non-deterministic enumeration? sort by filename?
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

        private path_parents_name(path: string): [io.memory.Dir[], string] {
            const dirs = [...this.dirs];

            const [parents, leaf] = sanitize_dirs_name(path);
            parents.forEach(name => {
                switch (name) {
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
            });

            return [dirs, leaf];
        }

        path_create_directory(path: string) {
            const [dirs, leaf] = this.path_parents_name(path);

            switch (leaf) {
                case ".":   throw ERRNO_EXIST;
                case "..":  throw ERRNO_EXIST;
                default:
                    const dir = dirs[dirs.length-1];
                    if (leaf in dir.children) throw ERRNO_EXIST;
                    if (!(dir.writeable)) throw ERRNO_ROFS;
                    const now = this.fs.now();
                    dir.children[leaf] = {
                        type:               "dir",
                        node:               this.fs.next_node_id++,
                        children:           {},
                        last_access_time:   now,
                        last_modified_time: now,
                        last_change_time:   now,
                        listable:           true,
                        readable:           true,
                        writeable:          true,
                    };
                    break;
            }
        }

        path_remove_directory(path: string) { this.path_remove(path, "dir", ERRNO_NOTDIR); }
        path_unlink_file(path: string) { this.path_remove(path, "file", ERRNO_ISDIR); }
        private path_remove(path: string, type: string, wrongtype: Errno) {
            const nodes : io.memory.Node[] = [...this.dirs];

            sanitize_path(path).split("/").forEach(name => {
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

        path_open(dirflags: LookupFlags, path: string, oflags: OFlags, _fs_rights_base: Rights, _fs_rights_inheriting: Rights, fdflags: FdFlags): wasi.Handle {
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

            const [dirs, leaf] = this.path_parents_name(path);

            var n : io.memory.Node;
            switch (leaf) {
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
                    const existing = parent.children[leaf];
                    if (existing) {
                        if (excl) throw ERRNO_EXIST;
                        if (directory && existing.type !== "dir") throw ERRNO_NOTDIR;
                        n = existing;
                    }
                    else if (!creat) throw ERRNO_NOENT;
                    else if (!parent.writeable) throw ERRNO_ROFS;
                    else if (directory) {
                        const now = this.fs.now();
                        n = parent.children[leaf] = {
                            type:               "dir",
                            node:               this.fs.next_node_id++,
                            children:           {},
                            last_access_time:   now,
                            last_modified_time: now,
                            last_change_time:   now,
                            listable:           true,
                            readable:           true,
                            writeable:          true,
                        };
                    } else {
                        const now = this.fs.now();
                        n = parent.children[leaf] = {
                            type:               "file",
                            node:               this.fs.next_node_id++,
                            data:               new Uint8Array(128),
                            length:             0,
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
        }

        // TODO: path_readlink?

        path_link(old_flags: LookupFlags, old_path: string, new_handle: Handle, new_path: string) { this.path_link_or_rename(old_flags, old_path, new_handle, new_path, false); }
        path_rename(old_path: string, new_handle: Handle, new_path: string) { this.path_link_or_rename(LOOKUPFLAGS_NONE, old_path, new_handle, new_path, true); }
        private path_link_or_rename(old_flags: LookupFlags, old_path: string, new_handle: Handle, new_path: string, rename: boolean) {
            const old_handle = this;
            if (!(new_handle instanceof MemoryDirHandle)) throw ERRNO_XDEV;
            if (old_handle.fs !== new_handle.fs) throw ERRNO_XDEV; // inodes might collide

            let [old_parents, old_name] = this      .path_parents_name(old_path);
            let [new_parents, new_name] = new_handle.path_parents_name(new_path);
            if (old_name === ".") { const leaf = old_parents.pop()!; const dir = old_parents[old_parents.length-1]; const n = find_node(dir, leaf); if (n === undefined) throw ERRNO_IO; old_name = n; }
            if (new_name === ".") { const leaf = new_parents.pop()!; const dir = new_parents[new_parents.length-1]; const n = find_node(dir, leaf); if (n === undefined) throw ERRNO_IO; new_name = n; }
            const old_dir = old_parents.pop();
            const new_dir = new_parents.pop();
            if (!old_dir) throw ERRNO_NOTDIR;
            if (!new_dir) throw ERRNO_NOTDIR;
            if (!(old_name in old_dir.children)) throw ERRNO_NOENT;
            if (  new_name in new_dir.children ) throw ERRNO_EXIST; // XXX: Should this clobber instead?
            new_dir.children[new_name] = old_dir.children[old_name];
            if (rename) delete old_dir.children[old_name];
        }

        // TODO: path_symlink

        // TODO: polling?
    }

    function throws(exception: any, expr: () => any): boolean {
        try {
            expr();
            return false;
        } catch (e) {
            return e === exception;
        }
    }

    // Note: does *not* remove ".."s!
    function sanitize_path(path: string): string {
        const a = path.replaceAll(/\/(\.?\/)+/g, "/"); // simplify "////././///.///" => "/"
        const b = /^(\.\/)?(.+?)(\/.)?$/.exec(a); // simplify "./foo/." => "foo"
        if (!b) throw wasi.ERRNO_INVAL;
        const c = b[2];
        if (c.startsWith("/") || c.endsWith("/")) throw wasi.ERRNO_INVAL; // reject "/foo", "bar/", "/"
        return c;
    }

    function sanitize_dirs_name(path: string): [string[], string] {
        const p = sanitize_path(path).split("/");
        const leaf = p.pop()!;
        return [p, leaf];
    }

    function find_node(dir: io.memory.Dir | undefined, node: io.memory.Node): string | undefined {
        if (!dir) return undefined;
        for (const name in dir.children) if (dir.children[name] === node) return name;
        return undefined;
    }

    // XXX: wasi.ERRNO_INVAL might not be defined yet
    //console.assert(throws(wasi.ERRNO_INVAL, () => sanitize_path("")));
    //console.assert(throws(wasi.ERRNO_INVAL, () => sanitize_path("/")));
    //console.assert(throws(wasi.ERRNO_INVAL, () => sanitize_path("/foo")));
    //console.assert(throws(wasi.ERRNO_INVAL, () => sanitize_path("foo/")));
    //console.assert(throws(wasi.ERRNO_INVAL, () => sanitize_path("/foo/")));
    //console.assert(throws(wasi.ERRNO_INVAL, () => sanitize_path("//foo//")));
    //console.assert(throws(wasi.ERRNO_INVAL, () => sanitize_path("/./foo/./")));
    //console.assert(sanitize_path(".") === ".");
    //console.assert(sanitize_path("./.") === ".");
    //console.assert(sanitize_path(".//.") === ".");
    //console.assert(sanitize_path("././.") === ".");
    //console.assert(sanitize_path("foo") === "foo");
    //console.assert(sanitize_path("./././/././foo/././//././/.") === "foo");
    //console.assert(sanitize_path("./././/././foo/././//././/bar//././//././/.") === "foo/bar");
    //console.assert(sanitize_path("./././/././.foo/././//././/.") === ".foo");
    //console.assert(sanitize_path("./././/././.foo/././//././/.bar//././//././/.") === ".foo/.bar");
}
