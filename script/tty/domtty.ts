class DomTty {
    public static new(settings: Settings): DomTty | undefined {
        if (settings.tty === undefined) return undefined;
        const root = document.getElementById("cargo-html-console");
        if (!root) return undefined;
        return new DomTty(settings.tty, root);
    }

    write(text: string, color_hint?: string) {
        if (text === "") return;
        this.outbuf += text;
        this.process_outbuf(color_hint);
    }

    shutdown() {
        document.querySelectorAll(".cargo-html-remove-on-shutdown").forEach(e => e.remove());
    }

    private escape  : OutputEscape;
    private mode    : InputMode;
    private output  : HTMLElement;
    private input   : HTMLElement;
    private outbuf  : string = "";

    private constructor(settings: TtySettings, root: HTMLElement) {
        this.escape = settings.escape   || "ansi";
        this.mode   = settings.mode     || "line-buffered";

        const input_buffer = document.createElement("span");
        input_buffer.classList.add("cargo-html-input-preview");
        input_buffer.id = "cargo-html-console-input"; // for ConReader / styles

        const input_cursor = document.createElement("span");
        input_cursor.classList.add("cursor"); // for styles
        input_cursor.textContent = "█";

        const input = this.input = document.createElement("span");
        input.classList.add("cargo-html-remove-on-shutdown");
        input.appendChild(input_buffer);
        input.appendChild(input_cursor);

        const output = this.output = document.createElement("div");
        output.setAttribute("class", "output");
        output.appendChild(input);

        const textarea = document.createElement("textarea");
        textarea.setAttribute("class",          "fg0 bg15 cargo-html-input-preview");
        textarea.setAttribute("autofocus",      "");
        textarea.setAttribute("autocapitalize", "off");
        textarea.setAttribute("autocorrect",    "off");
        textarea.setAttribute("autocomplete",   "off");
        textarea.setAttribute("spellcheck",     "false");
        textarea.setAttribute("rows",           "1");

        const button = document.createElement("button");
        button.setAttribute("class", "fg0 bg7 cargo-html-input-submit");
        button.textContent = "⏎";

        const footer = document.createElement("div");
        footer.setAttribute("class", "footer");
        footer.appendChild(textarea);
        footer.appendChild(button);

        root.textContent = ""; // remove any loading indicators
        root.appendChild(output);
        root.appendChild(footer);
    }

    private process_outbuf(color_hint?: string) {
        var buf = this.outbuf;
        try {
            while (buf.length > 0) {
                // https://en.wikipedia.org/wiki/ANSI_escape_code#Control_characters
                //
                // XXX: not handled:
                // [ ] Backspace reversing the cursor position
                // [ ] Tab aligning to an 8-character position
                // [ ] Form Feed doing anything
                // [ ] Carriage Return doing anything

                {
                    const esc = buf.indexOf("\x1B");
                    if (esc === -1) {
                        this.out_raw(buf, color_hint);
                        buf = "";
                        return;
                    } else if (esc > 0) {
                        this.out_raw(buf.substr(0, esc), color_hint);
                        buf = buf.substr(esc);
                        // continue
                    }
                }

                // https://en.wikipedia.org/wiki/ANSI_escape_code#Fe_Escape_sequences
                // XXX: not handled

                // https://en.wikipedia.org/wiki/ANSI_escape_code#CSI_(Control_Sequence_Introducer)_sequences
                //
                // XXX: not handled:
                // [ ] Cursor positioning commands
                // [ ] Erase commands
                // [ ] Scroll commands
                // [ ] HVP, AUX Port, DSR

                //const csi = /^\x1B\[?([0-9:;<=>?]*)([- !"#$%&'()*+,./]*)([@A-Z[\\\]^_])/
                const csi = /^\x1B\[?([\x30-\x3F]*)([\x20-\x2F]*)([\x40-\x7E])/.exec(buf);
                if (csi != null) {
                    const param         = csi[1];
                    const intermediate  = csi[2];
                    const final         = csi[3];
                    const params        = param.split(/[;:]/g);

                    switch (final) {
                        case "h": // high / enable
                            switch (param) {
                                case "25":      this.show_cursor(); break;
                                case "1049":    // TODO: enable alt screeen buffer
                                case "2004":    // TODO: enable bracketed paste mode
                                default:        this.unhandled_csi(csi, color_hint); break;
                            }
                            break;
                        case "l": // low / disable
                            switch (param) {
                                case "25":      this.hide_cursor(); break;
                                case "1049":    // TODO: disable alt screeen buffer
                                case "2004":    // TODO: disable bracketed paste mode
                                default:        this.unhandled_csi(csi, color_hint); break;
                            }
                            break;
                        case "A": this.move_cursor_to(Math.max(0, this.current_row_idx()-parseInt(param||"1")), this.current_col_idx()); break; // CUU / Cursor Up
                        case "B": this.move_cursor_to(Math.max(0, this.current_row_idx()+parseInt(param||"1")), this.current_col_idx()); break; // CUD / Cursor Down
                        case "C": this.move_cursor_to(this.current_row_idx(), Math.max(0, this.current_col_idx()+parseInt(param||"1"))); break; // CUF / Cursor Forward
                        case "D": this.move_cursor_to(this.current_row_idx(), Math.max(0, this.current_col_idx()-parseInt(param||"1"))); break; // CUB / Cursor Back
                        case "E": this.move_cursor_to(Math.max(0, this.current_row_idx()+parseInt(param||"1")), 0); break; // CNL / Cursor Next Line
                        case "F": this.move_cursor_to(Math.max(0, this.current_row_idx()-parseInt(param||"1")), 0); break; // CPL / Cursor Previous Line
                        case "G": this.move_cursor_to(this.current_row_idx(), Math.max(0, parseInt(param||"1")-1)); break; // CHA / Cursor Horizontal Absolute
                        case "H": this.move_cursor_to(parseInt(params[0]||"1")-1, parseInt(params[1]||"1")-1); break; // CUP / Cursor Position
                        case "J": this.erase_in_display(param); break;
                        //case "K": this.erase_in_line(param); break;
                        //case "S": this.scroll_up
                        //case "T": this.scroll_down
                        case "f": this.move_cursor_to(parseInt(params[0]||"1")-1, parseInt(params[1]||"1")-1); break; // HVP / Horizontal Vertical Position
                        case "m": this.out_sgr(params); break; // SGR / Select Graphics Rendition
                        //case "i": // AUX Port On/Off and other misc?
                        //case "n": // Device Status Report and other misc?
                        default:
                            this.unhandled_csi(csi, color_hint);
                            break;
                    }
                } else {
                    return; // incomplete sequence
                }

                console.assert(csi.index === 0);
                buf = buf.substr(csi[0].length);
            }
        } finally {
            this.outbuf = buf;
        }
    }

    private unhandled_csi(csi: RegExpExecArray, color_hint?: string) {
        console.warn("DomTty: unhandled CSI escape sequence:", JSON.stringify(csi[0]));
        this.out_raw(csi[0], color_hint); // invalid/unhandled escape sequence
    }

    private out_raw(text: string, color_hint?: string) {
        const autoscroll = this.output.scrollHeight - Math.abs(this.output.scrollTop) - 1 <= this.output.clientHeight;

        if (text.indexOf("\x07") !== -1) beep();

        const span = document.createElement("span");
        span.textContent = text;

        if (color_hint !== undefined) span.classList.add(color_hint);

        if (this.fg === undefined && this.bg === undefined) span.classList.add("default");

        const fg = this.fg || ".fg15";
        if      (fg === undefined)      {}
        else if (fg.startsWith("."))    span.classList.add(fg.substr(1));
        else                            span.style.color = fg; // truecolor?

        const bg = this.bg || ".bg0";
        if      (bg === undefined)      {}
        else if (bg.startsWith("."))    span.classList.add(bg.substr(1));
        else                            span.style.background = bg; // truecolor?

        this.output.insertBefore(span, this.input);

        if (autoscroll) this.output.scrollTop = this.output.scrollHeight + 1 - this.output.clientHeight;
    }

    private fg:                 string | undefined = undefined;
    private bg:                 string | undefined = undefined;
    private underline_color:    string | undefined = undefined;

    private out_sgr(sgrs: string[]) {
        // https://en.wikipedia.org/wiki/ANSI_escape_code#SGR_(Select_Graphic_Rendition)_parameters

        var i : number;

        function parse_25_color(): string | undefined {
            switch (sgrs[i]) {
                case "2":
                    i += 4; // "2;r;g;b"
                    return undefined; // TODO: implement properly
                case "5":
                    i += 2; // "5;n"
                    return undefined; // TODO: implement properly
                default: // invalid colorskip
                    return undefined; // TODO: log errors?
            }
        }

        for (i=0; i<sgrs.length; ++i) {
            const sgr = sgrs[i];
            switch (sgr) {
                case "0": // reset or normal
                    this.fg                 = undefined;
                    this.bg                 = undefined;
                    this.underline_color    = undefined;
                    break;
                case "1":  break; // bold or increased intensity
                case "2":  break; // faint or decreased intensity or dim
                case "3":  break; // italic
                case "4":  break; // underline
                case "5":  break; // slow blink
                case "6":  break; // rapid blink
                case "7":  break; // reverse video or invert
                case "8":  break; // conceal or hide
                case "9":  break; // crossed-out or strike
                case "10": break; // primary/default font
                case "11": break; // alternative font
                case "12": break; // alternative font
                case "13": break; // alternative font
                case "14": break; // alternative font
                case "15": break; // alternative font
                case "16": break; // alternative font
                case "17": break; // alternative font
                case "18": break; // alternative font
                case "19": break; // alternative font
                case "20": break; // "blackletter" font
                case "21": break; // double underlined or disable bold
                case "22": break; // reset intensity
                case "23": break; // reset italic/blackletter
                case "24": break; // reset underlined / double-underlined
                case "25": break; // reset blink
                case "26": break; // proportional spacing
                case "27": break; // reset reversed
                case "28": break; // reveal
                case "29": break; // reset crossout

                case "30": this.fg = ".fg0"; break;
                case "31": this.fg = ".fg1"; break;
                case "32": this.fg = ".fg2"; break;
                case "33": this.fg = ".fg3"; break;
                case "34": this.fg = ".fg4"; break;
                case "35": this.fg = ".fg5"; break;
                case "36": this.fg = ".fg6"; break;
                case "37": this.fg = ".fg7"; break;
                case "38": this.fg = parse_25_color(); break; // set foreground color
                case "39": this.fg = undefined; break; // default foreground color

                case "40": this.bg = ".bg0"; break;
                case "41": this.bg = ".bg1"; break;
                case "42": this.bg = ".bg2"; break;
                case "43": this.bg = ".bg3"; break;
                case "44": this.bg = ".bg4"; break;
                case "45": this.bg = ".bg5"; break;
                case "46": this.bg = ".bg6"; break;
                case "47": this.bg = ".bg7"; break;
                case "48": this.bg = parse_25_color(); break; // set background color
                case "49": this.bg = undefined; break; // default background color

                case "50": break; // reset proportional spacing
                case "51": break; // framed
                case "52": break; // encircled
                case "53": break; // overlined
                case "54": break; // reset framed/encircled
                case "55": break; // reset overlined
                // ...
                case "58": this.underline_color = parse_25_color(); break; // set underline color
                case "59": this.underline_color = undefined; break; // reset underline color

                case "60": break; // ideogram/rightside underline
                case "61": break; // ideogram/rightside double underline
                case "62": break; // ideogram over/leftside underline
                case "63": break; // ideogram over/leftside double underline
                case "64": break; // ideogram stress marking
                case "65": break; // reset ideogram effects
                // ...
                case "73": break; // superscript
                case "74": break; // subscript
                // ...
                case "90": this.fg = ".fg8";  break;
                case "91": this.fg = ".fg9";  break;
                case "92": this.fg = ".fg10"; break;
                case "93": this.fg = ".fg11"; break;
                case "94": this.fg = ".fg12"; break;
                case "95": this.fg = ".fg13"; break;
                case "96": this.fg = ".fg14"; break;
                case "97": this.fg = ".fg15"; break;
                // ...
                case "100": this.bg = ".bg8";  break;
                case "101": this.bg = ".bg9";  break;
                case "102": this.bg = ".bg10"; break;
                case "103": this.bg = ".bg11"; break;
                case "104": this.bg = ".bg12"; break;
                case "105": this.bg = ".bg13"; break;
                case "106": this.bg = ".bg14"; break;
                case "107": this.bg = ".bg15"; break;
            }
            // ...
        }
    }

    private show_cursor() {
        this.output.querySelectorAll(".cursor").forEach(c => (c as HTMLElement).style.display = "");
    }

    private hide_cursor() {
        this.output.querySelectorAll(".cursor").forEach(c => (c as HTMLElement).style.display = "none");
    }

    private current_row_idx(): number { return 0; } // TODO
    private current_col_idx(): number { return 0; } // TODO
    private move_cursor_to(rowIdx: number, colIdx: number) {} // TODO

    private erase_in_display(n: string) {
        const { input, output } = this;
        switch (n) {
            case "":
            case "0":
                // clear from cursor to end of screen
                for (;;) {
                    const child = output.lastChild;
                    if (child === null || child === input || child.contains(input)) break;
                    child.remove();
                }
                break;
            case "1":
                // clear from cursor to beginning of the screen
                for (;;) {
                    const child = output.firstChild;
                    if (child === null || child === input || child.contains(input)) break;
                    child.remove();
                }
                break;
            case "2": // clear entire screen
            case "3": // clear entire screen + erase scrollback buffer
                output.textContent = "";
                break;
        }
        if (!output.contains(input)) output.appendChild(input);
    }
}

function beep() {
    var snd = new Audio("data:audio/wav;base64,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qJrx4KOQjahZxWbcZgztj2c49nKmkId44S71j0c8eV9yDK6uPRzx5X18eDvjvQ6yKo9ZSS6l//8elePK/Lf//IInrOF/FvDoADYAGBMGb7FtErm5MXMlmPAJQVgWta7Zx2go+8xJ0UiCb8LHHdftWyLJE0QIAIsI+UbXu67dZMjmgDGCGl1H+vpF4NSDckSIkk7Vd+sxEhBQMRU8j/12UIRhzSaUdQ+rQU5kGeFxm+hb1oh6pWWmv3uvmReDl0UnvtapVaIzo1jZbf/pD6ElLqSX+rUmOQNpJFa/r+sa4e/pBlAABoAAAAA3CUgShLdGIxsY7AUABPRrgCABdDuQ5GC7DqPQCgbbJUAoRSUj+NIEig0YfyWUho1VBBBA//uQZB4ABZx5zfMakeAAAAmwAAAAF5F3P0w9GtAAACfAAAAAwLhMDmAYWMgVEG1U0FIGCBgXBXAtfMH10000EEEEEECUBYln03TTTdNBDZopopYvrTTdNa325mImNg3TTPV9q3pmY0xoO6bv3r00y+IDGid/9aaaZTGMuj9mpu9Mpio1dXrr5HERTZSmqU36A3CumzN/9Robv/Xx4v9ijkSRSNLQhAWumap82WRSBUqXStV/YcS+XVLnSS+WLDroqArFkMEsAS+eWmrUzrO0oEmE40RlMZ5+ODIkAyKAGUwZ3mVKmcamcJnMW26MRPgUw6j+LkhyHGVGYjSUUKNpuJUQoOIAyDvEyG8S5yfK6dhZc0Tx1KI/gviKL6qvvFs1+bWtaz58uUNnryq6kt5RzOCkPWlVqVX2a/EEBUdU1KrXLf40GoiiFXK///qpoiDXrOgqDR38JB0bw7SoL+ZB9o1RCkQjQ2CBYZKd/+VJxZRRZlqSkKiws0WFxUyCwsKiMy7hUVFhIaCrNQsKkTIsLivwKKigsj8XYlwt/WKi2N4d//uQRCSAAjURNIHpMZBGYiaQPSYyAAABLAAAAAAAACWAAAAApUF/Mg+0aohSIRobBAsMlO//Kk4soosy1JSFRYWaLC4qZBYWFRGZdwqKiwkNBVmoWFSJkWFxX4FFRQWR+LsS4W/rFRb/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////VEFHAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAU291bmRib3kuZGUAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAMjAwNGh0dHA6Ly93d3cuc291bmRib3kuZGUAAAAAAAAAACU=");
    snd.play();
}
