namespace wasi {
    type Mode = "raw" | "line-buffered";

    interface ConReaderSettings {
        /**
         * * `"raw"`            - recieve each keyboard event on stdin immediately
         * * `"line-buffered"`  - recieve keyboard input on stdin once enter is pressed
         */
        mode:       Mode;

        /** Which HTML element to listen to keyboard events with */
        listen_to:  Document | HTMLElement | string;

        /** Which HTML element to preview input in.  Ignored for `mode` == `"raw"`. */
        input:      HTMLElement | string | null;

        /** How to echo stdin */
        echo:       (output: string) => void;
    }

    export class ConReader implements HandleAsync {
        readonly async = true;

        private readonly settings : ConReaderSettings;
        private readonly pending_io : { max: number, resolve: ((input: number[]) => void), reject: ((reason: any) => any) }[] = [];
        private readonly input : HTMLElement | null;
        private readonly preview : HTMLElement | null;
        private preview_fallback_buf : string = "";
        private buf : number[] = [];
        private fdflags = FDFLAGS_NONE;

        constructor(settings: ConReaderSettings, tty: XTermTty | DomTty) {
            this.settings = settings;
            this.preview = document.querySelector(".cargo-html-input-preview");

            if (tty instanceof DomTty) {
                if (typeof settings.listen_to === "string") {
                    const e = document.getElementById(settings.listen_to);
                    if (!e) throw `ConReader: no such element: #${settings.listen_to}`;
                    e.addEventListener("keydown",  ev => this.keydown(ev));
                    e.addEventListener("keypress", ev => this.keypress(ev));
                } else if (settings.listen_to instanceof Document) {
                    settings.listen_to.addEventListener("keydown",  ev => this.keydown(ev));
                    settings.listen_to.addEventListener("keypress", ev => this.keypress(ev));
                } else {
                    settings.listen_to.addEventListener("keydown",  ev => this.keydown(ev));
                    settings.listen_to.addEventListener("keypress", ev => this.keypress(ev));
                }

                document.querySelectorAll("input.cargo-html-input-preview").forEach(input => {
                    input.addEventListener("keypress", ev => this.inputchange(ev));
                    input.addEventListener("keyup",    ev => this.inputchange(ev));
                    input.addEventListener("change",   ev => this.inputchange(ev));
                });
                document.querySelectorAll("textarea.cargo-html-input-preview").forEach(input => {
                    input.addEventListener("keypress", ev => this.inputchange(ev));
                    input.addEventListener("keyup",    ev => this.inputchange(ev));
                    input.addEventListener("change",   ev => this.inputchange(ev));
                });
                document.querySelectorAll(".cargo-html-input-submit").forEach(submit => {
                    submit.addEventListener("click", _ev => this.submit_input_buffer());
                });

                if (typeof settings.input === "string") {
                    this.input = document.getElementById(settings.input);
                    if (this.input === null) throw `ConReader: no such element: #${settings.input}`;
                } else {
                    this.input = settings.input;
                    if (this.input === null && settings.mode !== "raw") throw `ConReader: linebuffered mode requires an input element`;
                }
            } else { // instanceof XTermTty
                this.input = null;
                settings.echo = () => {};
                tty.listen(data => this.write(data));
            }
        }

        static try_create(settings: ConReaderSettings, tty: XTermTty | DomTty | undefined): ConReader | undefined {
            if (tty === undefined) return undefined;
            try {
                return new ConReader(settings, tty);
            } catch (e) {
                console.error(e);
                return undefined;
            }
        }

        debug(): string { return "ConReader"; }

        async fd_advise(_offset: FileSize, _len: FileSize, _advice: Advice) { throw ERRNO_SPIPE; }
        async fd_allocate(offset: FileSize, len: FileSize) { throw ERRNO_SPIPE; }
        async fd_close() {}
        async fd_datasync() {}

        async fd_fdstat_get(): Promise<FdStat> {
            return {
                filetype:           FILETYPE_CHARACTER_DEVICE,
                flags:              this.fdflags,
                rights_base:        RIGHTS_ALL_PIPE,
                rights_inheriting:  RIGHTS_NONE,
            };
        }

        async fd_fdstat_set_flags(fdflags: FdFlags) { this.fdflags = fdflags; }
        async fd_filestat_get(): Promise<FileStat> {
            return {
                dev:            0n as Device,
                ino:            0n as Inode,
                filetype:       FILETYPE_CHARACTER_DEVICE,
                nlink:          0n as LinkCount,
                size:           0n as FileSize,
                access_time:    0n as TimeStamp,
                modified_time:  0n as TimeStamp,
                change_time:    0n as TimeStamp,
            };
        }

        async fd_filestat_set_size(size: FileSize) { throw ERRNO_SPIPE; }
        async fd_filestat_set_times(access_time: TimeStamp, modified_time: TimeStamp, fst_flags: FstFlags) { throw ERRNO_SPIPE; }

        async fd_read(iovec: IovecArray): Promise<number> {
            const read = await this.read(iovec.total_bytes());
            const nread = read.length;
            iovec.forEach8(buf => {
                const n = buf.length;
                for (let i = 0; i < n; ++i) {
                    const byte = read.shift();
                    if (byte === undefined) return;
                    buf[i] = byte;
                }
            });
            return nread;
        }

        private read(max: number): Promise<number[]> {
            return new Promise((resolve, reject) => {
                this.pending_io.push({max, resolve, reject});
                this.dispatch();
            });
        }

        private write(text: string) {
            (this.settings.echo)(text);
            var bytes = new TextEncoder().encode(text);
            for (var i=0; i<bytes.length; ++i) {
                this.buf.push(bytes[i]);
            }
            this.dispatch();
        }

        private dispatch() {
            while (this.pending_io.length > 0 && (this.buf.length > 0)) {
                const io = this.pending_io.shift();
                if (io === undefined) continue;
                const nread = Math.min(this.buf.length, io.max);
                const read = this.buf.slice(0, nread);
                const after = this.buf.slice(nread);
                this.buf = after;
                (io.resolve)(read);
            }
            if (this.fdflags & FDFLAGS_NONBLOCK) for(;;) {
                const io = this.pending_io.shift();
                if (io === undefined) return;
                io.reject(ERRNO_AGAIN);
            }
        }

        private get_input_buffer(): string {
            if (this.preview === null) return this.preview_fallback_buf;
            switch (this.preview.tagName) {
                case "INPUT":       return (this.preview as HTMLInputElement).value;
                case "TEXTAREA":    return (this.preview as HTMLTextAreaElement).value;
                default:            return this.preview.textContent || "";
            }
        }

        private set_input_buffer(buffer: string) {
            this.preview_fallback_buf = buffer;
            document.querySelectorAll(".cargo-html-input-preview").forEach(preview => {
                switch (preview.tagName) {
                    case "INPUT":
                        const input = preview as HTMLInputElement;
                        input.value = buffer;
                        break;
                    case "TEXTAREA":
                        const textarea = preview as HTMLTextAreaElement;
                        textarea.value = buffer;
                        textarea.rows  = buffer.split("\n").length;
                        break;
                    default:
                        preview.textContent = buffer;
                        break;
                }
            });
        }

        private append_input_buffer(text: string) {
            this.set_input_buffer(this.get_input_buffer() + text);
        }

        private submit_input_buffer() {
            const buffer = this.get_input_buffer() + "\n";
            this.set_input_buffer("");
            this.write(buffer);
        }

        private keypress(ev: KeyboardEvent) {
            if (ev.target instanceof HTMLElement && ev.target.tagName === "INPUT") return;
            if (ev.target instanceof HTMLElement && ev.target.tagName === "TEXTAREA") return;

            var text = ev.char || String.fromCharCode(ev.charCode);
            if (text === "\r") { text = "\n"; }
            switch (this.settings.mode) {
                case "raw":
                    switch (text) {
                        case "\n":
                        case "\r":
                        case "\t":
                            // should've already been handled by keydown event
                        default:
                            this.write(text);
                            break;
                    }
                    break;
                case "line-buffered":
                    switch (text) {
                        case "\n":
                        case "\r":
                        case "\t":
                            // should've already been handled by keydown event
                            break;
                        default:
                            this.append_input_buffer(text);
                            break;
                    }
                    break;
            }
            ev.preventDefault();
            ev.stopPropagation();
        }

        private keydown(ev: KeyboardEvent) {
            if (ev.target instanceof HTMLElement && ev.target.tagName === "INPUT") return;
            if (ev.target instanceof HTMLElement && ev.target.tagName === "TEXTAREA") return;

            var key = "";
            if (ev.ctrlKey  ) key += "Ctrl+";
            if (ev.altKey   ) key += "Alt+";
            if (ev.shiftKey ) key += "Shift+";
            key += (ev.key || ev.code);

            const s = this.settings;
            switch (s.mode) {
                case "raw":
                    switch (key) {
                        case "Backspace":   this.write("\x08"); break;
                        case "Enter":       this.write("\n");   break;
                        case "NumpadEnter": this.write("\n");   break;
                        case "Tab":         this.write("\t");   break;
                        case "Esc":         this.write("\x1B"); break;
                        case "Escape":      this.write("\x1B"); break;
                        default:            return; // process no further
                    }
                    break;
                case "line-buffered":
                    switch (key) {
                        case "Backspace":
                            const b = this.get_input_buffer();
                            if (b.length > 0) this.set_input_buffer(b.substr(0, b.length-1));
                            // else TODO: some kind of alert?
                            break;
                        case "Enter":       this.submit_input_buffer(); break;
                        case "NumpadEnter": this.submit_input_buffer(); break;
                        case "Tab":         this.append_input_buffer("\t"); break;
                        case "Esc":         this.append_input_buffer("\x1B"); break;
                        case "Escape":      this.append_input_buffer("\x1B"); break;
                        default:            return; // process no further
                    }
                    break;
            }
            ev.preventDefault();
            ev.stopPropagation();
        }

        private inputchange(ev: Event) {
            if (!(ev.target instanceof HTMLElement)) return;

            if (ev instanceof KeyboardEvent && ev.type === "keypress") {
                var key = "";
                if (ev.ctrlKey  ) key += "Ctrl+";
                if (ev.altKey   ) key += "Alt+";
                if (ev.shiftKey ) key += "Shift+";
                key += (ev.key || ev.code);

                switch (key) {
                case "Enter":
                case "NumpadEnter":
                    ev.preventDefault();
                    ev.stopPropagation();
                    this.submit_input_buffer();
                    return;
                }
            }

            const target = ev.target;
            requestAnimationFrame(()=> {
                switch (target.tagName) {
                    case "INPUT":       this.set_input_buffer((target as HTMLInputElement).value); break;
                    case "TEXTAREA":    this.set_input_buffer((target as HTMLTextAreaElement).value); break;
                    default:            this.set_input_buffer((target as any).value || (target.textContent) || ""); break;
                }
            });
        }
    }
}
