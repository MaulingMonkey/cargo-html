namespace io.memory {
    export interface Mount {
        mount:      string,
        writable:   boolean,
        dirs:       { relative: string }[],
        files:      { relative: string, encoding: "base64" | "text", data: string }[],
        persist?:   { type: "local-storage", key: string, overlay: boolean },
    }

    export class FileSystem {
        next_node_id: number = 2;
        private readonly _init = this.now();
        readonly root: Dir = {
            type:               "dir",
            node:               1,
            children:           {},
            last_access_time:   this._init,
            last_modified_time: this._init,
            last_change_time:   this._init,
            listable:           true,
            readable:           true,
            writeable:          true,
        };

        constructor(mounts: Mount[]) {
            mounts.forEach(mount => {
                console.assert(mount.mount.startsWith("/"));
                const mount_is_dir = mount.mount.endsWith("/");

                mount.dirs.forEach(dir => {
                    console.assert(mount_is_dir);
                    console.assert(!dir.relative.startsWith("/"));
                    console.assert(!dir.relative.endsWith("/"));

                    let p = mount.mount + dir.relative;
                    p = (p.endsWith("/") ? p : (p+"/"));
                    this.init_dir(p);
                });

                mount.files.forEach(file => {
                    if (mount_is_dir)   console.assert(file.relative !== "");
                    else                console.assert(file.relative === "");
                    console.assert(!file.relative.startsWith("/"));
                    console.assert(!file.relative.endsWith("/"));

                    this.init_file(mount.mount + file.relative, file.encoding, file.data);
                });
            });
        }

        init_dir(path: string): Dir {
            console.assert(path.startsWith("/"));
            console.assert(path.endsWith("/"));

            // Navigate directory tree
            let slash = 0;
            let next_slash = 0;
            let dir = this.root;
            for (;-1 !== (next_slash = path.indexOf("/", slash+1)); slash = next_slash) {
                let name = path.substring(slash+1, next_slash);
                const existing = dir.children[name];
                if (existing === undefined) {
                    const now = this.now();
                    dir = dir.children[name] = {
                        type:               "dir",
                        node:               this.next_node_id++,
                        children:           {},
                        last_access_time:   now,
                        last_modified_time: now,
                        last_change_time:   now,
                        listable:           true,
                        readable:           true,
                        writeable:          true,
                    };
                } else if (existing.type === "dir") {
                    dir = existing;
                } else {
                    throw `init_dir: \`${path.substring(0, next_slash)}\` is not a directory, unable to create \`${path}\``;
                }
            }
            return dir;
        }

        init_file(path: string, encoding: "base64" | "text", data: string): File {
            console.assert(path.startsWith("/"));
            const name_start = path.lastIndexOf("/")+1;
            const parent = this.init_dir(path.substr(0, name_start));
            const name = path.substring(name_start);

            let src : string;
            switch (encoding) {
                case "base64":  src = btoa(data);   break;
                case "text":    src = data;         break;
            }
            const data8 = new Uint8Array(src.length);
            const length = data8.length;
            for (let i=0; i<length; ++i) data8[i] = src.charCodeAt(i);

            if (name in parent.children) throw `init_file: \`${path}\` already exists`;
            const now = this.now();
            const file = parent.children[name] = {
                type:               "file",
                node:               this.next_node_id++,
                data:               data8,
                length,
                last_access_time:   now,
                last_modified_time: now,
                last_change_time:   now,
                readers:            0,
                writers:            0,
                readable:           true,
                writeable:          true,
            };
            return file;
        }

        now(): wasi.TimeStamp { return 0n as wasi.TimeStamp; }  // TODO: proper system timestamps
        file_commit() {}                                        // TODO: A file had it's last writer closed, should probably checkpoint / try to save data
        sync() {}                                               // TODO: async syncronization for e.g. remote server sync?  How does this play with sync `Handle`s?

        // ...
    }

    export type Node = File | Dir;

    export interface File {
        readonly type: "file";
        readonly node: number;

        // core data
        data:       Uint8Array;
        length:     number;

        // meta data
        last_access_time:   wasi.TimeStamp,
        last_modified_time: wasi.TimeStamp,
        last_change_time:   wasi.TimeStamp,

        // locks
        readers:    number;
        writers:    number;

        // acccess control
        readable:   boolean;
        writeable:  boolean;
        // TODO: "owner"?
    }

    export interface Dir {
        readonly type: "dir";
        readonly node: number;

        // core data
        children: { [name: string]: Node };

        // meta data
        last_access_time:   wasi.TimeStamp,
        last_modified_time: wasi.TimeStamp,
        last_change_time:   wasi.TimeStamp,

        // access control
        listable:   boolean;
        readable:   boolean;
        writeable:  boolean;
    }

    // TODO: devices?
}
