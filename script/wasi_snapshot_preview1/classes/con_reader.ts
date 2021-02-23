namespace wasi_snapshot_preview1 {
    type Mode = "raw" | "linebuffered";

    interface ConReaderSettings {
        /**
         * * `"raw"`            - recieve each keyboard event on stdin immediately
         * * `"linebuffered"`   - recieve keyboard input on stdin once enter is pressed
         */
        mode:       Mode;

        /** Which HTML element to listen to keyboard events with */
        listen_to:  Document | HTMLElement;

        /** Which HTML element to preview input in.  Ignored for `mode` == `"raw"`. */
        input:      HTMLElement | null;

        /** How to echo stdin */
        echo:       (output: string) => void;
    }

    export class ConReader implements HandleAsync {
        readonly async: true = true;

        private readonly settings : ConReaderSettings;
        private readonly pending_io : { max: number, callback: ((input: number[]) => void) }[] = [];
        private buf : number[] = [];

        constructor(settings: ConReaderSettings) {
            console.assert(settings.input !== null || settings.mode === "raw");
            this.settings = settings;
            if (settings.listen_to instanceof Document) {
                settings.listen_to.addEventListener("keydown",  ev => this.keydown(ev));
                settings.listen_to.addEventListener("keypress", ev => this.keypress(ev));
            } else {
                settings.listen_to.addEventListener("keydown",  ev => this.keydown(ev));
                settings.listen_to.addEventListener("keypress", ev => this.keypress(ev));
            }
        }

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
            return new Promise((callback) => {
                this.pending_io.push({max, callback});
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
            while (this.buf.length > 0 && this.pending_io.length > 0) {
                const io = this.pending_io.shift();
                if (io === undefined) continue;
                const nread = Math.min(this.buf.length, io.max);
                const read = this.buf.slice(0, nread);
                const after = this.buf.slice(nread);
                this.buf = after;
                (io.callback)(read);
            }
        }

        private keypress(ev: KeyboardEvent) {
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
                case "linebuffered":
                    switch (text) {
                        case "\n":
                        case "\r":
                        case "\t":
                            // should've already been handled by keydown event
                            break;
                        default:
                            this.settings.input!.textContent += text;
                            break;
                    }
                    break;
            }
            ev.preventDefault();
            ev.stopPropagation();
        }

        private keydown(ev: KeyboardEvent) {
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
                case "linebuffered":
                    switch (key) {
                        case "Backspace":
                            if (!!s.input!.textContent) {
                                s.input!.textContent = s.input!.textContent.substr(0, s.input!.textContent.length-1);
                            }
                            // else TODO: some kind of alert?
                            break;
                        case "Enter":
                        case "NumpadEnter":
                            var buffer = (s.input!.textContent || "") + "\n";
                            s.input!.textContent = "";
                            this.write(buffer);
                            break;
                        case "Tab":     s.input!.textContent = (s.input!.textContent || "") + "\t"; break;
                        case "Esc":     s.input!.textContent = (s.input!.textContent || "") + "\x1B"; break;
                        case "Escape":  s.input!.textContent = (s.input!.textContent || "") + "\x1B"; break;
                        default:        return; // process no further
                    }
                    break;
            }
            ev.preventDefault();
            ev.stopPropagation();
        }
    }
}
