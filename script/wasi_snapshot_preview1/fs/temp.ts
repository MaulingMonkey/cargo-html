namespace wasi_snapshot_preview1.fs.temp {
    interface Entry {
        node:       Dir | File;
        // timestamps
        // permission bits?
    }

    class Node {
        readonly debug_id: string | undefined;
        locked: number = 0;

        constructor(debug_id: string | undefined) {
            this.debug_id = debug_id;
        }
    }

    export class File extends Node {
        readonly type = "file";

        readonly data: number[]; // TODO: pagify + optimize?

        constructor(debug_id: string | undefined) {
            super(debug_id);
            this.data = [];
        }

        size(): number {
            return this.data.length;
        }

        truncate(size: number) {
            if (size < this.data.length) this.data.splice(size, this.data.length-size);
        }
    }

    export class Dir extends Node {
        readonly type = "dir";

        readonly debug_id: string | undefined;
        readonly entries: { [name: string]: Entry };
        parent: Dir | undefined = undefined;

        constructor(debug_id: string | undefined, entries: { [name: string]: Entry }) {
            super(debug_id);
            this.entries = entries;
            Object.values(entries).forEach(entry => {
                if (entry.node.type === "dir") {
                    if (entry.node.parent !== undefined) throw `fs.temp.Dir ${entry.node.debug_id} already had a parent`;
                    entry.node.parent = this;
                }
            });
        }
    }

    export class DirectoryHandle implements Handle {
        readonly async = false;
        readonly dir: Dir;

        list        = true;
        read        = true;
        write       = true;

        constructor(dir: Dir) {
            this.dir = dir;
            dir.locked += 1;
        }

        path_open(_dirflags: LookupFlags, path: string, oflags: OFlags, fs_rights_base: Rights, fs_rights_inheriting: Rights, fdflags: FdFlags): Handle {
            // No symlinks supported yet
            // const _follow_symlinks = !!(_dirflags & LOOKUPFLAGS_SYMLINK_FOLLOW);

            var dir : Dir | undefined = this.dir;
            var components = path.split("/");
            for (var i = 0; i < components.length - 1; ++i) {
                const c = components[i];
                if (dir) switch (c) {
                    case ".":   break;
                    case "..":  dir = dir.parent; break;
                    default:
                        const e = dir.entries[c];
                        if (!e || e.node.type !== "dir") throw ERRNO_NOTDIR;
                        dir = e.node;
                        break;
                }
            }
            if (!dir) throw ERRNO_NOTDIR;
            const name = components[components.length-1];
            var entry = dir.entries[name];

            const creat     = !!(oflags & OFLAGS_CREAT);
            const directory = !!(oflags & OFLAGS_DIRECTORY);
            const excl      = !!(oflags & OFLAGS_EXCL);
            const trunc     = !!(oflags & OFLAGS_TRUNC);

            if (entry) {
                // File/directory already exists
                if (excl) throw ERRNO_EXIST;
                if (trunc) {
                    switch (entry.node.type) {
                        case "dir":     throw ERRNO_INVAL;
                        case "file":    entry.node.truncate(0); break;
                        default:        unreachable(entry.node);
                    }
                }

            } else {
                // File/directory does not yet exist

                if (!creat) throw ERRNO_NOENT;
                const debug_id = dir.debug_id ? `${dir.debug_id}${name}` : undefined;
                entry = dir.entries[name] = {
                    node: directory ? new Dir(debug_id + "/", {}) : new File(debug_id),
                };
            }

            // TODO: check/set rights
            // fs_rights_base
            // fs_rights_inheriting

            const append    = !!(fdflags & FDFLAGS_APPEND   );
            //const _dsync    = !!(fdflags & FDFLAGS_DSYNC    ); // TempFS always processed immediately and never persisted, sync unnecessary
            const nonblock  = !!(fdflags & FDFLAGS_NONBLOCK );
            //const _rsync    = !!(fdflags & FDFLAGS_RSYNC    ); // TempFS always processed immediately and never persisted, sync unnecessary
            //const _sync     = !!(fdflags & FDFLAGS_SYNC     ); // TempFS always processed immediately and never persisted, sync unnecessary

            switch (entry.node.type) {
                case "dir":
                    var d = new DirectoryHandle(entry.node);
                    return d;
                case "file":
                    var f = new FileHandle(entry.node);
                    if (append)    f.position = entry.node.size();
                    if (nonblock)  f.blocking = false;
                    return f;
                default:
                    unreachable(entry.node);
                    throw "never"; // workaround (for older tsc?)
            }
        }

        fd_close() {
            this.dir.locked -= 1;
        }
    }

    export class FileHandle implements Handle {
        readonly async = false;
        readonly file: File;

        position    = 0;
        blocking    = true;

        can_seek    = true;
        can_read    = true;
        can_write   = true;

        constructor(file: File) {
            this.file = file;
            file.locked += 1;
        }

        fd_read(iovec: IovecArray): usize {
            if (!this.can_seek  ) throw ERRNO_NOTCAPABLE;
            if (!this.can_read  ) throw ERRNO_NOTCAPABLE;

            let read = 0;
            iovec.forEach8(io => {
                let n = Math.min(io.length, this.file.data.length - this.position);
                for (let i = 0; i < n; ++i) io[i] = this.file.data[i];
                this.position += n;
                read += n;
            });
            return read as usize;
        }

        fd_write(ciovec: CIovecArray): usize {
            if (!this.can_seek  ) throw ERRNO_NOTCAPABLE;
            if (!this.can_write ) throw ERRNO_NOTCAPABLE;

            while (this.file.data.length < this.position) this.file.data.push(0);

            let wrote = 0;
            ciovec.forEach8(io => {
                io.forEach(b => this.file.data.push(b));
                wrote += io.length;
            });
            this.position += wrote;
            return wrote as usize;
        }

        fd_close() {
            this.file.locked -= 1;
        }
    }

    function unreachable(_: never): never { throw "never"; }
}
