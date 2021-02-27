namespace io.memory {
    export class FileSystem {
        next_node_id: number = 2;
        readonly root: Dir = {
            type:       "dir",
            node:       1,
            children:   {},
            listable:   true,
            readable:   true,
            writeable:  true,
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
                    dir = dir.children[name] = {
                        type:       "dir",
                        node:       this.next_node_id++,
                        children:   {},
                        listable:   true,
                        readable:   true,
                        writeable:  true,
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
            const file = parent.children[name] = {
                type:       "file",
                node:       this.next_node_id++,
                data,
                length,
                readers:    0,
                writers:    0,
                readable:   true,
                writeable:  true,
            };
            return file;
        }

        // ...
    }

    export type Node = File | Dir;

    export interface File {
        readonly type: "file";
        readonly node: number;

        // core data
        data:       Uint8Array;
        length:     number;

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

        // access control
        listable:   boolean;
        readable:   boolean;
        writeable:  boolean;
    }

    // TODO: devices?
}
