namespace io.memory {
    export class FileSystem {
        next_node_id: number = 2;
        private readonly _init = this.now();
        readonly root: Dir = {
            type:               "dir",
            node:               1,
            children:           {},
            created_time:       this._init,
            last_access_time:   this._init,
            last_modified_time: this._init,
            last_change_time:   this._init,
            listable:           true,
            readable:           true,
            writeable:          true,
        };

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
                        created_time:       now,
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

        init_file(path: string, base64: string): File {
            console.assert(path.startsWith("/"));
            const name_start = path.lastIndexOf("/")+1;
            const parent = this.init_dir(path.substr(0, name_start));
            const name = path.substring(name_start);

            const src = btoa(base64);
            const data = new Uint8Array(src.length);
            const length = data.length;
            for (let i=0; i<length; ++i) data[i] = src.charCodeAt(i);

            if (name in parent.children) throw `init_file: \`${path}\` already exists`;
            const now = this.now();
            const file = parent.children[name] = {
                type:               "file",
                node:               this.next_node_id++,
                data,
                length,
                created_time:       now,
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
        created_time:       wasi.TimeStamp,
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
        created_time:       wasi.TimeStamp,
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
