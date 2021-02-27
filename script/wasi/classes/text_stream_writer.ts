namespace wasi {
    export class TextStreamWriter implements Handle {
        readonly async = false;
        readonly io : (text: string) => void;

        fdflags = FDFLAGS_NONE;

        static from_output(output: Output, color_hint: string, domtty: DomTty | undefined): TextStreamWriter | undefined {
            switch (output) {
                case "badfd":           return undefined;
                case "null":            return new TextStreamWriter(_ => {});
                case "console-error":   return new TextStreamWriter(text => console.error("%s", text)); // TODO: join/buffer lines?
                case "console-log":     return new TextStreamWriter(text => console.log  ("%s", text)); // TODO: join/buffer lines?
                case "dom":
                    if (domtty === undefined) throw "output === \"dom\", but no domtty was provided";
                    return new TextStreamWriter(text => domtty!.write(text, color_hint));
            }
        }

        constructor(io: (text: string) => void) {
            this.io = io;
        }

        debug(): string { return "TextStreamWriter"; }

        fd_advise(_offset: FileSize, _len: FileSize, _advice: Advice) { throw ERRNO_PIPE; }
        fd_allocate(offset: FileSize, len: FileSize) { throw ERRNO_PIPE; }
        fd_close() {}
        fd_datasync() {}

        fd_fdstat_get(): FdStat {
            return {
                filetype:           FILETYPE_UNKNOWN,
                flags:              this.fdflags,
                rights_base:        RIGHTS_ALL_PIPE,
                rights_inheriting:  RIGHTS_NONE,
            };
        }

        fd_fdstat_set_flags(fdflags: FdFlags) { this.fdflags = fdflags; }

        fd_filestat_get(): FileStat {
            return {
                dev:            0n as Device,
                ino:            0n as Inode,
                filetype:       FILETYPE_UNKNOWN,
                nlink:          0n as LinkCount,
                size:           0n as FileSize,
                access_time:    0n as TimeStamp,
                modified_time:  0n as TimeStamp,
                change_time:    0n as TimeStamp,
            };
        }

        fd_write(ciovec: CIovecArray): number {
            var nwritten = 0;
            var text = "";
            ciovec.forEach8(buf => {
                text += new TextDecoder().decode(buf);
                nwritten += buf.length;
            });
            this.io(text);
            return nwritten;
        }
    }
}
