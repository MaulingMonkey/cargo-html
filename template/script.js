"use strict";
const asyncify_page_count = 1;
class Asyncifier {
    constructor() {
        this.resolve = undefined;
        this.reject = undefined;
        this.memory = undefined;
        this.exports = undefined;
        this.rewinding = false;
        this.unwinding = false;
        this.rewind_result = undefined;
        this.rewind_exception = undefined;
        this.asyncify_byte_idx = 0;
    }
    launch(exports) {
        if (this.resolve || this.reject)
            throw "Asyncifier.launch already executing an entry point";
        if (this.exports) {
            if (this.exports.memory != exports.memory)
                throw "Asyncifier.launch cannot switch memory imports";
        }
        else {
            const asyncify_page_idx = exports.memory.grow(asyncify_page_count);
            console.assert(asyncify_page_idx !== -1);
            this.asyncify_byte_idx = WASM_PAGE_SIZE * asyncify_page_idx;
        }
        this.memory = new MemoryLE(exports.memory);
        this.exports = exports;
        return new Promise((resolve, reject) => {
            this.resolve = resolve;
            this.reject = reject;
            this.restart_wasm();
        });
    }
    restart_wasm() {
        try {
            this.exports._start();
            if (this.unwinding) {
                this.unwinding = false;
                this.exports.asyncify_stop_unwind();
            }
            else {
                const r = this.resolve;
                this.resolve = undefined;
                this.reject = undefined;
                r();
            }
        }
        catch (e) {
            const r = this.reject;
            this.resolve = undefined;
            this.reject = undefined;
            r(e);
        }
    }
    asyncify(f, waiting) {
        if (this.exports === undefined)
            throw "Asyncifier.asyncify called before Asyncifier.launch";
        const exports = this.exports;
        if (!this.rewinding) {
            f().then((result) => {
                this.rewinding = true;
                this.rewind_result = result;
                this.rewind_exception = undefined;
                exports.asyncify_start_rewind(this.asyncify_byte_idx);
                this.restart_wasm();
            }, (error_reason) => {
                this.rewinding = true;
                this.rewind_result = undefined;
                this.rewind_exception = error_reason === undefined ? "undefined reason" : error_reason;
                exports.asyncify_start_rewind(this.asyncify_byte_idx);
                this.restart_wasm();
            });
            this.unwinding = true;
            const ctx = new Uint32Array(this.memory.memory.buffer, this.asyncify_byte_idx, 8);
            ctx[0] = this.asyncify_byte_idx + 8;
            ctx[1] = this.asyncify_byte_idx + (asyncify_page_count * WASM_PAGE_SIZE);
            exports.asyncify_start_unwind(this.asyncify_byte_idx);
            return waiting;
        }
        else {
            this.rewinding = false;
            exports.asyncify_stop_rewind();
            if (this.rewind_exception !== undefined) {
                throw this.rewind_exception;
            }
            else {
                return this.rewind_result;
            }
        }
        ;
    }
}
class DomTty {
    constructor(settings) {
        this.outbuf = "";
        this.color = undefined;
        this.background = undefined;
        this.underline_color = undefined;
        this.escape = settings.escape || "ansi";
        this.mode = settings.mode || "line-buffered";
        this.output = typeof settings.output === "string" ? requireElementById(settings.output) : settings.output;
        this.input = typeof settings.input === "string" ? requireElementById(settings.input) : settings.input;
        if (!this.output.contains(this.input))
            throw "DomTty expects the input preview element to be contained within the output element for cursor purpouses";
    }
    static new(settings) {
        if (settings.domtty === undefined)
            return undefined;
        return new DomTty(settings.domtty);
    }
    write(text, color_hint) {
        if (text === "")
            return;
        this.outbuf += text;
        this.process_outbuf(color_hint);
    }
    shutdown() {
        this.hide_cursor();
    }
    process_outbuf(color_hint) {
        var buf = this.outbuf;
        try {
            while (buf.length > 0) {
                {
                    const esc = buf.indexOf("\x1B");
                    if (esc === -1) {
                        this.out_raw(buf, color_hint);
                        buf = "";
                        return;
                    }
                    else if (esc > 0) {
                        this.out_raw(buf.substr(0, esc), color_hint);
                        buf = buf.substr(esc);
                    }
                }
                var m;
                if (null != (m = /^\x1B\[?25h/.exec(buf)))
                    this.show_cursor();
                else if (null != (m = /^\x1B\[?25l/.exec(buf)))
                    this.hide_cursor();
                else if (null != (m = /^\x1B\[(\d*)J/.exec(buf)))
                    this.erase_in_display(m[1]);
                else if (null != (m = /^\x1B\[([0-9;:]*)m/.exec(buf)))
                    this.out_sgr(m[1].split(/[;:]/));
                else if (null != (m = /^\x1B\[.*?[a-zA-Z]/.exec(buf))) {
                    console.warn("DomTty: unhandled escape sequence:", JSON.stringify(m[0]));
                    this.out_raw(m[0], color_hint);
                }
                else
                    break;
                console.assert(m.index === 0);
                buf = buf.substr(m[0].length);
            }
        }
        finally {
            this.outbuf = buf;
        }
    }
    out_raw(text, color_hint) {
        const autoscroll = this.output.scrollHeight - Math.abs(this.output.scrollTop) - 1 <= this.output.clientHeight;
        if (text.indexOf("\x07") !== -1)
            beep();
        if (this.color !== undefined || this.background !== undefined) {
            const span = document.createElement("span");
            span.textContent = text;
            if (this.color !== undefined)
                span.style.color = this.color;
            if (this.background !== undefined)
                span.style.backgroundColor = this.background;
            this.output.insertBefore(span, this.input);
        }
        else if (color_hint !== undefined) {
            const span = document.createElement("span");
            span.textContent = text;
            span.style.color = color_hint;
            this.output.insertBefore(span, this.input);
        }
        else {
            this.output.insertBefore(document.createTextNode(text), this.input);
        }
        if (autoscroll)
            this.output.scrollTop = this.output.scrollHeight + 1 - this.output.clientHeight;
    }
    out_sgr(sgrs) {
        var i;
        function parse_25_color() {
            switch (sgrs[i]) {
                case "2":
                    i += 4;
                    return undefined;
                case "5":
                    i += 2;
                    return undefined;
                default:
                    return undefined;
            }
        }
        for (i = 0; i < sgrs.length; ++i) {
            const sgr = sgrs[i];
            switch (sgr) {
                case "0":
                    this.color = undefined;
                    this.background = undefined;
                    this.underline_color = undefined;
                    break;
                case "1": break;
                case "2": break;
                case "3": break;
                case "4": break;
                case "5": break;
                case "6": break;
                case "7": break;
                case "8": break;
                case "9": break;
                case "10": break;
                case "11": break;
                case "12": break;
                case "13": break;
                case "14": break;
                case "15": break;
                case "16": break;
                case "17": break;
                case "18": break;
                case "19": break;
                case "20": break;
                case "21": break;
                case "22": break;
                case "23": break;
                case "24": break;
                case "25": break;
                case "26": break;
                case "27": break;
                case "28": break;
                case "29": break;
                case "30":
                    this.fg(Color.Black, false);
                    break;
                case "31":
                    this.fg(Color.Red, false);
                    break;
                case "32":
                    this.fg(Color.Green, false);
                    break;
                case "33":
                    this.fg(Color.Yellow, false);
                    break;
                case "34":
                    this.fg(Color.Blue, false);
                    break;
                case "35":
                    this.fg(Color.Magenta, false);
                    break;
                case "36":
                    this.fg(Color.Cyan, false);
                    break;
                case "37":
                    this.fg(Color.White, false);
                    break;
                case "38":
                    this.color = parse_25_color();
                    break;
                case "39":
                    this.color = undefined;
                    break;
                case "40":
                    this.bg(Color.Black, false);
                    break;
                case "41":
                    this.bg(Color.Red, false);
                    break;
                case "42":
                    this.bg(Color.Green, false);
                    break;
                case "43":
                    this.bg(Color.Yellow, false);
                    break;
                case "44":
                    this.bg(Color.Blue, false);
                    break;
                case "45":
                    this.bg(Color.Magenta, false);
                    break;
                case "46":
                    this.bg(Color.Cyan, false);
                    break;
                case "47":
                    this.bg(Color.White, false);
                    break;
                case "48":
                    this.background = parse_25_color();
                    break;
                case "49":
                    this.background = undefined;
                    break;
                case "50": break;
                case "51": break;
                case "52": break;
                case "53": break;
                case "54": break;
                case "55": break;
                case "58":
                    this.underline_color = parse_25_color();
                    break;
                case "59":
                    this.underline_color = undefined;
                    break;
                case "60": break;
                case "61": break;
                case "62": break;
                case "63": break;
                case "64": break;
                case "65": break;
                case "73": break;
                case "74": break;
                case "90":
                    this.fg(Color.Black, true);
                    break;
                case "91":
                    this.fg(Color.Red, true);
                    break;
                case "92":
                    this.fg(Color.Green, true);
                    break;
                case "93":
                    this.fg(Color.Yellow, true);
                    break;
                case "94":
                    this.fg(Color.Blue, true);
                    break;
                case "95":
                    this.fg(Color.Magenta, true);
                    break;
                case "96":
                    this.fg(Color.Cyan, true);
                    break;
                case "97":
                    this.fg(Color.White, true);
                    break;
                case "100":
                    this.bg(Color.Black, true);
                    break;
                case "101":
                    this.bg(Color.Red, true);
                    break;
                case "102":
                    this.bg(Color.Green, true);
                    break;
                case "103":
                    this.bg(Color.Yellow, true);
                    break;
                case "104":
                    this.bg(Color.Blue, true);
                    break;
                case "105":
                    this.bg(Color.Magenta, true);
                    break;
                case "106":
                    this.bg(Color.Cyan, true);
                    break;
                case "107":
                    this.bg(Color.White, true);
                    break;
            }
        }
    }
    show_cursor() {
        this.output.querySelectorAll(".cursor").forEach(c => c.style.display = "");
    }
    hide_cursor() {
        this.output.querySelectorAll(".cursor").forEach(c => c.style.display = "none");
    }
    erase_in_display(n) {
        const { input, output } = this;
        const cursor = output.querySelector(".cursor");
        switch (n) {
            case "":
            case "0":
                for (;;) {
                    const child = output.lastChild;
                    if (child === null || child === input || child.contains(input))
                        break;
                    child.remove();
                }
                break;
            case "1":
                for (;;) {
                    const child = output.firstChild;
                    if (child === null || child === input || child.contains(input))
                        break;
                    child.remove();
                }
                break;
            case "2":
            case "3":
                output.textContent = "";
                break;
        }
        if (!output.contains(input))
            output.appendChild(input);
        if (cursor && !output.contains(cursor))
            output.appendChild(cursor);
    }
    fg(color, bright) { this.color = this.vga(color, bright); }
    bg(color, bright) { this.background = this.vga(color, bright); }
    vga(color, bright) {
        if (!bright)
            switch (color) {
                case Color.Black: return "#000";
                case Color.Red: return "#A00";
                case Color.Green: return "#0A0";
                case Color.Yellow: return "#A50";
                case Color.Blue: return "#00A";
                case Color.Magenta: return "#A0A";
                case Color.Cyan: return "#0AA";
                case Color.White: return "#AAA";
            }
        else
            switch (color) {
                case Color.Black: return "#555";
                case Color.Red: return "#F55";
                case Color.Green: return "#5F5";
                case Color.Yellow: return "#FF5";
                case Color.Blue: return "#55F";
                case Color.Magenta: return "#F5F";
                case Color.Cyan: return "#5FF";
                case Color.White: return "#FFF";
            }
    }
}
function requireElementById(id) {
    let el = document.getElementById(id);
    if (!el)
        throw `no such element in document: #${id}`;
    return el;
}
function beep() {
    var snd = new Audio("data:audio/wav;base64,//uQRAAAAWMSLwUIYAAsYkXgoQwAEaYLWfkWgAI0wWs/ItAAAGDgYtAgAyN+QWaAAihwMWm4G8QQRDiMcCBcH3Cc+CDv/7xA4Tvh9Rz/y8QADBwMWgQAZG/ILNAARQ4GLTcDeIIIhxGOBAuD7hOfBB3/94gcJ3w+o5/5eIAIAAAVwWgQAVQ2ORaIQwEMAJiDg95G4nQL7mQVWI6GwRcfsZAcsKkJvxgxEjzFUgfHoSQ9Qq7KNwqHwuB13MA4a1q/DmBrHgPcmjiGoh//EwC5nGPEmS4RcfkVKOhJf+WOgoxJclFz3kgn//dBA+ya1GhurNn8zb//9NNutNuhz31f////9vt///z+IdAEAAAK4LQIAKobHItEIYCGAExBwe8jcToF9zIKrEdDYIuP2MgOWFSE34wYiR5iqQPj0JIeoVdlG4VD4XA67mAcNa1fhzA1jwHuTRxDUQ//iYBczjHiTJcIuPyKlHQkv/LHQUYkuSi57yQT//uggfZNajQ3Vmz+Zt//+mm3Wm3Q576v////+32///5/EOgAAADVghQAAAAA//uQZAUAB1WI0PZugAAAAAoQwAAAEk3nRd2qAAAAACiDgAAAAAAABCqEEQRLCgwpBGMlJkIz8jKhGvj4k6jzRnqasNKIeoh5gI7BJaC1A1AoNBjJgbyApVS4IDlZgDU5WUAxEKDNmmALHzZp0Fkz1FMTmGFl1FMEyodIavcCAUHDWrKAIA4aa2oCgILEBupZgHvAhEBcZ6joQBxS76AgccrFlczBvKLC0QI2cBoCFvfTDAo7eoOQInqDPBtvrDEZBNYN5xwNwxQRfw8ZQ5wQVLvO8OYU+mHvFLlDh05Mdg7BT6YrRPpCBznMB2r//xKJjyyOh+cImr2/4doscwD6neZjuZR4AgAABYAAAABy1xcdQtxYBYYZdifkUDgzzXaXn98Z0oi9ILU5mBjFANmRwlVJ3/6jYDAmxaiDG3/6xjQQCCKkRb/6kg/wW+kSJ5//rLobkLSiKmqP/0ikJuDaSaSf/6JiLYLEYnW/+kXg1WRVJL/9EmQ1YZIsv/6Qzwy5qk7/+tEU0nkls3/zIUMPKNX/6yZLf+kFgAfgGyLFAUwY//uQZAUABcd5UiNPVXAAAApAAAAAE0VZQKw9ISAAACgAAAAAVQIygIElVrFkBS+Jhi+EAuu+lKAkYUEIsmEAEoMeDmCETMvfSHTGkF5RWH7kz/ESHWPAq/kcCRhqBtMdokPdM7vil7RG98A2sc7zO6ZvTdM7pmOUAZTnJW+NXxqmd41dqJ6mLTXxrPpnV8avaIf5SvL7pndPvPpndJR9Kuu8fePvuiuhorgWjp7Mf/PRjxcFCPDkW31srioCExivv9lcwKEaHsf/7ow2Fl1T/9RkXgEhYElAoCLFtMArxwivDJJ+bR1HTKJdlEoTELCIqgEwVGSQ+hIm0NbK8WXcTEI0UPoa2NbG4y2K00JEWbZavJXkYaqo9CRHS55FcZTjKEk3NKoCYUnSQ0rWxrZbFKbKIhOKPZe1cJKzZSaQrIyULHDZmV5K4xySsDRKWOruanGtjLJXFEmwaIbDLX0hIPBUQPVFVkQkDoUNfSoDgQGKPekoxeGzA4DUvnn4bxzcZrtJyipKfPNy5w+9lnXwgqsiyHNeSVpemw4bWb9psYeq//uQZBoABQt4yMVxYAIAAAkQoAAAHvYpL5m6AAgAACXDAAAAD59jblTirQe9upFsmZbpMudy7Lz1X1DYsxOOSWpfPqNX2WqktK0DMvuGwlbNj44TleLPQ+Gsfb+GOWOKJoIrWb3cIMeeON6lz2umTqMXV8Mj30yWPpjoSa9ujK8SyeJP5y5mOW1D6hvLepeveEAEDo0mgCRClOEgANv3B9a6fikgUSu/DmAMATrGx7nng5p5iimPNZsfQLYB2sDLIkzRKZOHGAaUyDcpFBSLG9MCQALgAIgQs2YunOszLSAyQYPVC2YdGGeHD2dTdJk1pAHGAWDjnkcLKFymS3RQZTInzySoBwMG0QueC3gMsCEYxUqlrcxK6k1LQQcsmyYeQPdC2YfuGPASCBkcVMQQqpVJshui1tkXQJQV0OXGAZMXSOEEBRirXbVRQW7ugq7IM7rPWSZyDlM3IuNEkxzCOJ0ny2ThNkyRai1b6ev//3dzNGzNb//4uAvHT5sURcZCFcuKLhOFs8mLAAEAt4UWAAIABAAAAAB4qbHo0tIjVkUU//uQZAwABfSFz3ZqQAAAAAngwAAAE1HjMp2qAAAAACZDgAAAD5UkTE1UgZEUExqYynN1qZvqIOREEFmBcJQkwdxiFtw0qEOkGYfRDifBui9MQg4QAHAqWtAWHoCxu1Yf4VfWLPIM2mHDFsbQEVGwyqQoQcwnfHeIkNt9YnkiaS1oizycqJrx4KOQjahZxWbcZgztj2c49nKmkId44S71j0c8eV9yDK6uPRzx5X18eDvjvQ6yKo9ZSS6l//8elePK/Lf//IInrOF/FvDoADYAGBMGb7FtErm5MXMlmPAJQVgWta7Zx2go+8xJ0UiCb8LHHdftWyLJE0QIAIsI+UbXu67dZMjmgDGCGl1H+vpF4NSDckSIkk7Vd+sxEhBQMRU8j/12UIRhzSaUdQ+rQU5kGeFxm+hb1oh6pWWmv3uvmReDl0UnvtapVaIzo1jZbf/pD6ElLqSX+rUmOQNpJFa/r+sa4e/pBlAABoAAAAA3CUgShLdGIxsY7AUABPRrgCABdDuQ5GC7DqPQCgbbJUAoRSUj+NIEig0YfyWUho1VBBBA//uQZB4ABZx5zfMakeAAAAmwAAAAF5F3P0w9GtAAACfAAAAAwLhMDmAYWMgVEG1U0FIGCBgXBXAtfMH10000EEEEEECUBYln03TTTdNBDZopopYvrTTdNa325mImNg3TTPV9q3pmY0xoO6bv3r00y+IDGid/9aaaZTGMuj9mpu9Mpio1dXrr5HERTZSmqU36A3CumzN/9Robv/Xx4v9ijkSRSNLQhAWumap82WRSBUqXStV/YcS+XVLnSS+WLDroqArFkMEsAS+eWmrUzrO0oEmE40RlMZ5+ODIkAyKAGUwZ3mVKmcamcJnMW26MRPgUw6j+LkhyHGVGYjSUUKNpuJUQoOIAyDvEyG8S5yfK6dhZc0Tx1KI/gviKL6qvvFs1+bWtaz58uUNnryq6kt5RzOCkPWlVqVX2a/EEBUdU1KrXLf40GoiiFXK///qpoiDXrOgqDR38JB0bw7SoL+ZB9o1RCkQjQ2CBYZKd/+VJxZRRZlqSkKiws0WFxUyCwsKiMy7hUVFhIaCrNQsKkTIsLivwKKigsj8XYlwt/WKi2N4d//uQRCSAAjURNIHpMZBGYiaQPSYyAAABLAAAAAAAACWAAAAApUF/Mg+0aohSIRobBAsMlO//Kk4soosy1JSFRYWaLC4qZBYWFRGZdwqKiwkNBVmoWFSJkWFxX4FFRQWR+LsS4W/rFRb/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////VEFHAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAU291bmRib3kuZGUAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAMjAwNGh0dHA6Ly93d3cuc291bmRib3kuZGUAAAAAAAAAACU=");
    snd.play();
}
var Color;
(function (Color) {
    Color[Color["Black"] = 0] = "Black";
    Color[Color["Red"] = 1] = "Red";
    Color[Color["Green"] = 2] = "Green";
    Color[Color["Yellow"] = 3] = "Yellow";
    Color[Color["Blue"] = 4] = "Blue";
    Color[Color["Magenta"] = 5] = "Magenta";
    Color[Color["Cyan"] = 6] = "Cyan";
    Color[Color["White"] = 7] = "White";
})(Color || (Color = {}));
const WASM_PAGE_SIZE = (64 * 1024);
async function exec_base64_wasm(settings, wasm) {
    const determinism = settings.determinism || "nondeterministic";
    const domtty = DomTty.new(settings);
    const args = settings.args || [
        `${document.location.origin}${document.location.pathname}`,
        ...(document.location.search ? decodeURI(document.location.search).substr(1).split(' ') : [])
    ];
    const sleep = settings.sleep || "nondeterministic";
    const binary = atob(wasm);
    const typedarray = new Uint8Array(binary.length);
    for (var i = 0; i < binary.length; ++i) {
        typedarray[i] = binary.charCodeAt(i);
    }
    const compiled = await WebAssembly.compile(typedarray);
    if (false) {
        WebAssembly.Module.imports(compiled).forEach(function (imp) { console.log("import", imp); });
        WebAssembly.Module.exports(compiled).forEach(function (exp) { console.log("export", exp); });
    }
    const is_asyncified = !!!WebAssembly.Module.exports(compiled).find(exp => exp.name.startsWith("asyncify_") && exp.name === "function");
    const asyncifier = is_asyncified ? new Asyncifier() : undefined;
    if (!is_asyncified)
        console.warn("WASM module contains no asyncify_* symbols, async I/O won't be available.");
    const wasm_exports = {};
    const memory = new MemoryLE(undefined);
    const imports = {
        env: {},
        _cargo_html_shenannigans_do_not_use: {},
        wasi_snapshot_preview1: {},
    };
    wasi.nyi(imports);
    wasi.env(imports, memory, args, settings.env || {});
    wasi.random(imports, memory, settings.random || determinism);
    wasi.time(imports, memory, { sleep: sleep == "nondeterministic" ? (asyncifier || "busy-wait") : sleep, clock: settings.clock || determinism });
    wasi.signals(imports, memory, domtty, settings);
    if (asyncifier !== undefined)
        wasi.fds(imports, memory, asyncifier, domtty, settings);
    if (typeof __cargo_html_wasmbindgen_bundler_js !== "undefined") {
        Object.assign(imports, __cargo_html_wasmbindgen_bundler_js(_path => wasm_exports));
    }
    const inst = await WebAssembly.instantiate(compiled, imports);
    const exports = inst.exports;
    Object.assign(wasm_exports, exports);
    memory.memory = exports.memory;
    try {
        if (asyncifier) {
            await asyncifier.launch(exports);
        }
        else {
            exports._start();
        }
        imports.wasi_snapshot_preview1.proc_exit(0);
    }
    catch (e) {
        switch (e) {
            case "exit":
            case "fatal-signal":
            case "stop-signal":
                break;
            default:
                const trace_uncaught = wasi.TextStreamWriter.from_output(settings.trace_signal || settings.stderr || (domtty ? "dom" : "console-error"), "#F44", domtty);
                trace_uncaught?.io(`process terminated by uncaught JavaScript exception:\n${e}`);
                throw e;
        }
    }
    finally {
        domtty?.shutdown();
    }
}
function main(settings) {
    exec_base64_wasm(settings, "{BASE64_WASM32}");
}
class MemoryLE {
    constructor(memory) {
        this.memory = memory;
    }
    read_u8(ptr, offset) { return new DataView(this.memory.buffer).getUint8(ptr + offset); }
    read_u16(ptr, offset) { return new DataView(this.memory.buffer).getUint16(ptr + offset, true); }
    read_u32(ptr, offset) { return new DataView(this.memory.buffer).getUint32(ptr + offset, true); }
    read_u64(ptr, offset) { return new DataView(this.memory.buffer).getBigUint64(ptr + offset, true); }
    read_usize(ptr, offset) { return this.read_u32(ptr, offset); }
    read_ptr(ptr, offset) { return this.read_usize(ptr, offset); }
    read_u64_approx(ptr, offset) {
        let dv = new DataView(this.memory.buffer);
        let lo = dv.getUint32(ptr + offset + 0, true);
        let hi = dv.getUint32(ptr + offset + 4, true);
        return hi * 0x100000000 + lo;
    }
    read_u64_pair(ptr, offset) {
        let dv = new DataView(this.memory.buffer);
        let lo = dv.getUint32(ptr + offset + 0, true);
        let hi = dv.getUint32(ptr + offset + 4, true);
        return [lo, hi];
    }
    read_string(ptr, offset, size) { return new TextDecoder().decode(this.slice8(ptr, offset, size)); }
    write_u8(ptr, offset, value) { new DataView(this.memory.buffer).setUint8(ptr + offset, value); }
    write_u16(ptr, offset, value) { new DataView(this.memory.buffer).setUint16(ptr + offset, value, true); }
    write_u32(ptr, offset, value) { new DataView(this.memory.buffer).setUint32(ptr + offset, value, true); }
    write_u64(ptr, offset, value) { new DataView(this.memory.buffer).setBigUint64(ptr + offset, value, true); }
    write_usize(ptr, offset, value) { this.write_u32(ptr, offset, value); }
    write_ptr(ptr, offset, value) { this.write_usize(ptr, offset, value); }
    write_u64_pair(ptr, offset, [lo, hi]) {
        this.write_u32(ptr, offset + 0, lo);
        this.write_u32(ptr, offset + 4, hi);
    }
    slice(ptr, start, end) { return new DataView(this.memory.buffer, ptr + start, end - start); }
    slice8(ptr, start, end) { return new Uint8Array(this.memory.buffer, ptr + start, end - start); }
}
var io;
(function (io) {
    var memory;
    (function (memory) {
        class FileSystem {
            constructor() {
                this.next_node_id = 2;
                this._init = this.now();
                this.root = {
                    type: "dir",
                    node: 1,
                    children: {},
                    created_time: this._init,
                    last_access_time: this._init,
                    last_modified_time: this._init,
                    last_change_time: this._init,
                    listable: true,
                    readable: true,
                    writeable: true,
                };
            }
            init_dir(path) {
                console.assert(path.startsWith("/"));
                console.assert(path.endsWith("/"));
                let slash = 0;
                let next_slash = 0;
                let dir = this.root;
                for (; -1 !== (next_slash = path.indexOf("/", slash + 1)); slash = next_slash) {
                    let name = path.substring(slash + 1, next_slash);
                    const existing = dir.children[name];
                    if (existing === undefined) {
                        const now = this.now();
                        dir = dir.children[name] = {
                            type: "dir",
                            node: this.next_node_id++,
                            children: {},
                            created_time: now,
                            last_access_time: now,
                            last_modified_time: now,
                            last_change_time: now,
                            listable: true,
                            readable: true,
                            writeable: true,
                        };
                    }
                    else if (existing.type === "dir") {
                        dir = existing;
                    }
                    else {
                        throw `init_dir: \`${path.substring(0, next_slash)}\` is not a directory, unable to create \`${path}\``;
                    }
                }
                return dir;
            }
            init_file(path, base64) {
                console.assert(path.startsWith("/"));
                const name_start = path.lastIndexOf("/") + 1;
                const parent = this.init_dir(path.substr(0, name_start));
                const name = path.substring(name_start);
                const src = btoa(base64);
                const data = new Uint8Array(src.length);
                const length = data.length;
                for (let i = 0; i < length; ++i)
                    data[i] = src.charCodeAt(i);
                if (name in parent.children)
                    throw `init_file: \`${path}\` already exists`;
                const now = this.now();
                const file = parent.children[name] = {
                    type: "file",
                    node: this.next_node_id++,
                    data,
                    length,
                    created_time: now,
                    last_access_time: now,
                    last_modified_time: now,
                    last_change_time: now,
                    readers: 0,
                    writers: 0,
                    readable: true,
                    writeable: true,
                };
                return file;
            }
            now() { return 0n; }
            file_commit() { }
            sync() { }
        }
        memory.FileSystem = FileSystem;
    })(memory = io.memory || (io.memory = {}));
})(io || (io = {}));
var wasi;
(function (wasi) {
    class ConReader {
        constructor(settings) {
            this.async = true;
            this.pending_io = [];
            this.buf = [];
            this.fdflags = wasi.FDFLAGS_NONE;
            this.settings = settings;
            if (typeof settings.listen_to === "string") {
                const e = document.getElementById(settings.listen_to);
                if (!e)
                    throw `ConReader: no such element: #${settings.listen_to}`;
                e.addEventListener("keydown", ev => this.keydown(ev));
                e.addEventListener("keypress", ev => this.keypress(ev));
            }
            else if (settings.listen_to instanceof Document) {
                settings.listen_to.addEventListener("keydown", ev => this.keydown(ev));
                settings.listen_to.addEventListener("keypress", ev => this.keypress(ev));
            }
            else {
                settings.listen_to.addEventListener("keydown", ev => this.keydown(ev));
                settings.listen_to.addEventListener("keypress", ev => this.keypress(ev));
            }
            if (typeof settings.input === "string") {
                this.input = document.getElementById(settings.input);
                if (this.input === null)
                    throw `ConReader: no such element: #${settings.input}`;
            }
            else {
                this.input = settings.input;
                if (this.input === null && settings.mode !== "raw")
                    throw `ConReader: linebuffered mode requires an input element`;
            }
        }
        static try_create(settings) {
            try {
                return new ConReader(settings);
            }
            catch (e) {
                console.error(e);
                return undefined;
            }
        }
        debug() { return "ConReader"; }
        async fd_advise(_offset, _len, _advice) { throw wasi.ERRNO_SPIPE; }
        async fd_allocate(offset, len) { throw wasi.ERRNO_SPIPE; }
        async fd_close() { }
        async fd_datasync() { }
        async fd_fdstat_get() {
            return {
                filetype: wasi.FILETYPE_CHARACTER_DEVICE,
                flags: this.fdflags,
                rights_base: wasi.RIGHTS_ALL_PIPE,
                rights_inheriting: wasi.RIGHTS_NONE,
            };
        }
        async fd_fdstat_set_flags(fdflags) { this.fdflags = fdflags; }
        async fd_filestat_get() {
            return {
                dev: 0n,
                ino: 0n,
                filetype: wasi.FILETYPE_CHARACTER_DEVICE,
                nlink: 0n,
                size: 0n,
                access_time: 0n,
                modified_time: 0n,
                change_time: 0n,
            };
        }
        async fd_filestat_set_size(size) { throw wasi.ERRNO_SPIPE; }
        async fd_filestat_set_times(access_time, modified_time, fst_flags) { throw wasi.ERRNO_SPIPE; }
        async fd_read(iovec) {
            const read = await this.read(iovec.total_bytes());
            const nread = read.length;
            iovec.forEach8(buf => {
                const n = buf.length;
                for (let i = 0; i < n; ++i) {
                    const byte = read.shift();
                    if (byte === undefined)
                        return;
                    buf[i] = byte;
                }
            });
            return nread;
        }
        read(max) {
            return new Promise((resolve, reject) => {
                this.pending_io.push({ max, resolve, reject });
                this.dispatch();
            });
        }
        write(text) {
            (this.settings.echo)(text);
            var bytes = new TextEncoder().encode(text);
            for (var i = 0; i < bytes.length; ++i) {
                this.buf.push(bytes[i]);
            }
            this.dispatch();
        }
        dispatch() {
            while (this.pending_io.length > 0 && (this.buf.length > 0)) {
                const io = this.pending_io.shift();
                if (io === undefined)
                    continue;
                const nread = Math.min(this.buf.length, io.max);
                const read = this.buf.slice(0, nread);
                const after = this.buf.slice(nread);
                this.buf = after;
                (io.resolve)(read);
            }
            if (this.fdflags & wasi.FDFLAGS_NONBLOCK)
                for (;;) {
                    const io = this.pending_io.shift();
                    if (io === undefined)
                        return;
                    io.reject(wasi.ERRNO_AGAIN);
                }
        }
        keypress(ev) {
            var text = ev.char || String.fromCharCode(ev.charCode);
            if (text === "\r") {
                text = "\n";
            }
            switch (this.settings.mode) {
                case "raw":
                    switch (text) {
                        case "\n":
                        case "\r":
                        case "\t":
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
                            break;
                        default:
                            this.input.textContent += text;
                            break;
                    }
                    break;
            }
            ev.preventDefault();
            ev.stopPropagation();
        }
        keydown(ev) {
            var key = "";
            if (ev.ctrlKey)
                key += "Ctrl+";
            if (ev.altKey)
                key += "Alt+";
            if (ev.shiftKey)
                key += "Shift+";
            key += (ev.key || ev.code);
            const s = this.settings;
            switch (s.mode) {
                case "raw":
                    switch (key) {
                        case "Backspace":
                            this.write("\x08");
                            break;
                        case "Enter":
                            this.write("\n");
                            break;
                        case "NumpadEnter":
                            this.write("\n");
                            break;
                        case "Tab":
                            this.write("\t");
                            break;
                        case "Esc":
                            this.write("\x1B");
                            break;
                        case "Escape":
                            this.write("\x1B");
                            break;
                        default: return;
                    }
                    break;
                case "line-buffered":
                    switch (key) {
                        case "Backspace":
                            if (!!this.input.textContent) {
                                this.input.textContent = this.input.textContent.substr(0, this.input.textContent.length - 1);
                            }
                            break;
                        case "Enter":
                        case "NumpadEnter":
                            var buffer = (this.input.textContent || "") + "\n";
                            this.input.textContent = "";
                            this.write(buffer);
                            break;
                        case "Tab":
                            this.input.textContent = (this.input.textContent || "") + "\t";
                            break;
                        case "Esc":
                            this.input.textContent = (this.input.textContent || "") + "\x1B";
                            break;
                        case "Escape":
                            this.input.textContent = (this.input.textContent || "") + "\x1B";
                            break;
                        default: return;
                    }
                    break;
            }
            ev.preventDefault();
            ev.stopPropagation();
        }
    }
    wasi.ConReader = ConReader;
})(wasi || (wasi = {}));
var wasi;
(function (wasi) {
    class IovecArray {
        constructor(memory, iovs_ptr, iovs_size) {
            this.memory = memory;
            this.iovs_ptr = iovs_ptr;
            this.iovs_size = iovs_size;
        }
        total_bytes() {
            let n = 0;
            this.forEach8(b => n += b.byteLength);
            return n;
        }
        get8(iovs_idx) {
            console.assert((iovs_idx | 0) == iovs_idx);
            console.assert(0 <= iovs_idx);
            if (iovs_idx >= this.iovs_size)
                return undefined;
            var buf_ptr = this.memory.read_ptr(this.iovs_ptr, +8 * iovs_idx + 0);
            var buf_len = this.memory.read_usize(this.iovs_ptr, +8 * iovs_idx + 4);
            return this.memory.slice8(buf_ptr, +0, buf_len);
        }
        forEach8(each) {
            for (let i = 0; i < this.iovs_size; ++i)
                each(this.get8(i));
        }
    }
    wasi.IovecArray = IovecArray;
})(wasi || (wasi = {}));
var wasi;
(function (wasi) {
    class TextStreamWriter {
        constructor(io) {
            this.async = false;
            this.fdflags = wasi.FDFLAGS_NONE;
            this.io = io;
        }
        static from_output(output, color_hint, domtty) {
            switch (output) {
                case "badfd": return undefined;
                case "null": return new TextStreamWriter(_ => { });
                case "console-error": return new TextStreamWriter(text => console.error("%s", text));
                case "console-log": return new TextStreamWriter(text => console.log("%s", text));
                case "dom":
                    if (domtty === undefined)
                        throw "output === \"dom\", but no domtty was provided";
                    return new TextStreamWriter(text => domtty.write(text, color_hint));
            }
        }
        debug() { return "TextStreamWriter"; }
        fd_advise(_offset, _len, _advice) { throw wasi.ERRNO_SPIPE; }
        fd_allocate(offset, len) { throw wasi.ERRNO_SPIPE; }
        fd_close() { }
        fd_datasync() { }
        fd_fdstat_get() {
            return {
                filetype: wasi.FILETYPE_UNKNOWN,
                flags: this.fdflags,
                rights_base: wasi.RIGHTS_ALL_PIPE,
                rights_inheriting: wasi.RIGHTS_NONE,
            };
        }
        fd_fdstat_set_flags(fdflags) { this.fdflags = fdflags; }
        fd_filestat_get() {
            return {
                dev: 0n,
                ino: 0n,
                filetype: wasi.FILETYPE_UNKNOWN,
                nlink: 0n,
                size: 0n,
                access_time: 0n,
                modified_time: 0n,
                change_time: 0n,
            };
        }
        fd_filestat_set_size(size) { throw wasi.ERRNO_SPIPE; }
        fd_filestat_set_times(access_time, modified_time, fst_flags) { throw wasi.ERRNO_SPIPE; }
        fd_write(ciovec) {
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
    wasi.TextStreamWriter = TextStreamWriter;
})(wasi || (wasi = {}));
var wasi;
(function (wasi) {
    var fs;
    (function (fs_1) {
        class MemoryDirHandle {
            constructor(fs, dirs, prestat) {
                this.async = false;
                this.dirs = [];
                this.fdflags = wasi.FDFLAGS_NONE;
                const leaf = dirs[dirs.length - 1];
                if (leaf === undefined)
                    throw `MemoryDirHandle: at least one directory must be specified in array`;
                this.fs = fs;
                this.dirs = dirs;
                this.leaf = leaf;
                if (prestat !== undefined)
                    this.prestat_dir = new TextEncoder().encode(prestat + "\0");
            }
            debug() { return `MemoryDirHandle`; }
            fd_close() { }
            fd_advise(_offset, _len, _advice) { }
            fd_allocate(_offset, _len) { throw wasi.ERRNO_ISDIR; }
            fd_datasync() { this.fs.sync(); }
            fd_fdstat_set_flags(fdflags) { this.fdflags = fdflags; }
            fd_filestat_set_size(size) { throw wasi.ERRNO_ISDIR; }
            fd_sync() { this.fs.sync(); }
            fd_fdstat_get() {
                return {
                    filetype: wasi.FILETYPE_DIRECTORY,
                    flags: this.fdflags,
                    rights_base: wasi.RIGHTS_ALL_DIR,
                    rights_inheriting: wasi.RIGHTS_ALL,
                };
            }
            fd_filestat_get() {
                return {
                    dev: 0n,
                    ino: BigInt(this.leaf.node),
                    filetype: wasi.FILETYPE_DIRECTORY,
                    nlink: 0n,
                    size: 0n,
                    access_time: this.leaf.last_access_time,
                    modified_time: this.leaf.last_modified_time,
                    change_time: this.leaf.last_change_time,
                };
            }
            fd_filestat_set_times(access_time, modified_time, fst_flags) {
                const now = (fst_flags & (wasi.FSTFLAGS_ATIM_NOW | wasi.FSTFLAGS_MTIM_NOW)) ? this.fs.now() : 0n;
                if (fst_flags & wasi.FSTFLAGS_ATIM)
                    this.leaf.last_access_time = access_time;
                else if (fst_flags & wasi.FSTFLAGS_ATIM_NOW)
                    this.leaf.last_access_time = now;
                if (fst_flags & wasi.FSTFLAGS_MTIM)
                    this.leaf.last_modified_time = modified_time;
                else if (fst_flags & wasi.FSTFLAGS_MTIM_NOW)
                    this.leaf.last_modified_time = now;
            }
            fd_readdir(cookie, maxbytes) {
                if (maxbytes <= 0)
                    throw wasi.ERRNO_INVAL;
                if (cookie >= Number.MAX_SAFE_INTEGER)
                    throw wasi.ERRNO_INVAL;
                const r = [];
                const entries = Object.entries(this.leaf.children);
                const utf8 = new TextEncoder();
                for (let i = Number(cookie); (i < entries.length) && (maxbytes > 0); ++i) {
                    const [name, e] = entries[i];
                    var type;
                    switch (e.type) {
                        case "dir":
                            type = wasi.FILETYPE_DIRECTORY;
                            break;
                        case "file":
                            type = wasi.FILETYPE_REGULAR_FILE;
                            break;
                    }
                    r.push({
                        ino: 0n,
                        name: utf8.encode(name),
                        next: BigInt(i + 1),
                        type,
                    });
                    maxbytes -= wasi.DIRENT_SIZE + name.length;
                }
                return r;
            }
            path_create_directory(path) {
                const dirs = [...this.dirs];
                path.split("/").forEach((name, i, components) => {
                    if (i === components.length - 1) {
                        switch (name) {
                            case ".": throw wasi.ERRNO_EXIST;
                            case "..": throw wasi.ERRNO_EXIST;
                            default:
                                const dir = dirs[dirs.length - 1];
                                if (name in dir.children)
                                    throw wasi.ERRNO_EXIST;
                                if (!(dir.writeable))
                                    throw wasi.ERRNO_ROFS;
                                const now = this.fs.now();
                                dir.children[name] = {
                                    type: "dir",
                                    node: this.fs.next_node_id++,
                                    children: {},
                                    created_time: now,
                                    last_access_time: now,
                                    last_modified_time: now,
                                    last_change_time: now,
                                    listable: true,
                                    readable: true,
                                    writeable: true,
                                };
                                break;
                        }
                    }
                    else {
                        switch (name) {
                            case ".":
                                break;
                            case "..":
                                dirs.pop();
                                if (dirs.length === 0)
                                    throw wasi.ERRNO_NOENT;
                                break;
                            default:
                                const dir = dirs[dirs.length - 1];
                                const child = dir.children[name];
                                if (!child)
                                    throw wasi.ERRNO_NOENT;
                                if (child.type !== "dir")
                                    throw wasi.ERRNO_NOTDIR;
                                dirs.push(child);
                                break;
                        }
                    }
                });
            }
            path_remove_directory(path) { this.path_remove(path, "dir", wasi.ERRNO_NOTDIR); }
            path_unlink_file(path) { this.path_remove(path, "file", wasi.ERRNO_ISDIR); }
            path_remove(path, type, wrongtype) {
                const nodes = [...this.dirs];
                path.split("/").forEach((name, i, components) => {
                    switch (name) {
                        case ".":
                            break;
                        case "..":
                            nodes.pop();
                            if (nodes.length === 0)
                                throw wasi.ERRNO_NOENT;
                            break;
                        default:
                            const dir = nodes[nodes.length - 1];
                            if (dir.type !== "dir")
                                throw wasi.ERRNO_NOTDIR;
                            const child = dir.children[name];
                            if (!child)
                                throw wasi.ERRNO_NOENT;
                            nodes.push(child);
                            break;
                    }
                });
                const target = nodes.pop();
                const parent = nodes.pop();
                if (!target || !parent)
                    throw wasi.ERRNO_ACCESS;
                if (parent.type !== "dir")
                    throw wasi.ERRNO_NOTDIR;
                if (target.type !== type)
                    throw wrongtype;
                if (target.type === "dir" && Object.keys(target.children).length > 0)
                    throw wasi.ERRNO_NOTEMPTY;
                const children = Object.entries(parent.children);
                let removed = false;
                for (let i = 0; i < children.length; ++i) {
                    const [name, node] = children[i];
                    if (node === target) {
                        delete parent.children[name];
                        removed = true;
                    }
                }
                if (!removed) {
                    console.error("failed to remove %s (did the path `%s` escape the current directory and access a stale dir or something?)", type, path);
                    debugger;
                    throw wasi.ERRNO_IO;
                }
            }
            path_filestat_get(_flags, path) {
                const existing = this.path_open(_flags, path, wasi.OFLAGS_NONE, wasi.RIGHTS_FD_FILESTAT_GET, wasi.RIGHTS_NONE, wasi.FDFLAGS_NONE);
                try {
                    return existing.fd_filestat_get();
                }
                finally {
                    if (existing.fd_close)
                        existing.fd_close();
                }
            }
            path_filestat_set_times(flags, path, access_time, modified_time, fst_flags) {
                const existing = this.path_open(flags, path, wasi.OFLAGS_NONE, wasi.RIGHTS_FD_FILESTAT_SET_TIMES, wasi.RIGHTS_NONE, wasi.FDFLAGS_NONE);
                try {
                    return existing.fd_filestat_set_times(access_time, modified_time, fst_flags);
                }
                finally {
                    if (existing.fd_close)
                        existing.fd_close();
                }
            }
            path_open(dirflags, path, oflags, _fs_rights_base, _fs_rights_inheriting, fdflags) {
                const dirs = [...this.dirs];
                const follow_symlinks = !!(dirflags & wasi.LOOKUPFLAGS_SYMLINK_FOLLOW);
                const creat = !!(oflags & wasi.OFLAGS_CREAT);
                const directory = !!(oflags & wasi.OFLAGS_DIRECTORY);
                const excl = !!(oflags & wasi.OFLAGS_EXCL);
                const trunc = !!(oflags & wasi.OFLAGS_TRUNC);
                const append = !!(fdflags & wasi.FDFLAGS_APPEND);
                const nonblock = !!(fdflags & wasi.FDFLAGS_NONBLOCK);
                const dsync = !!(fdflags & wasi.FDFLAGS_DSYNC);
                const rsync = !!(fdflags & wasi.FDFLAGS_RSYNC);
                const sync = !!(fdflags & wasi.FDFLAGS_SYNC);
                const write = !!(_fs_rights_inheriting & wasi.RIGHTS_FD_WRITE);
                const components = path.split("/");
                for (let i = 0; i < components.length; ++i) {
                    const name = components[i];
                    if (i === components.length - 1) {
                        var n;
                        switch (name) {
                            case ".":
                                if (excl)
                                    throw wasi.ERRNO_EXIST;
                                n = dirs[dirs.length - 1];
                                break;
                            case "..":
                                dirs.pop();
                                if (dirs.length === 0)
                                    throw wasi.ERRNO_NOENT;
                                if (excl)
                                    throw wasi.ERRNO_EXIST;
                                n = dirs[dirs.length - 1];
                                break;
                            default:
                                const parent = dirs[dirs.length - 1];
                                const existing = parent.children[name];
                                if (existing) {
                                    if (excl)
                                        throw wasi.ERRNO_EXIST;
                                    if (directory && existing.type !== "dir")
                                        throw wasi.ERRNO_NOTDIR;
                                    n = existing;
                                }
                                else if (!creat)
                                    throw wasi.ERRNO_NOENT;
                                else if (!parent.writeable)
                                    throw wasi.ERRNO_ROFS;
                                else if (directory) {
                                    const now = this.fs.now();
                                    n = parent.children[name] = {
                                        type: "dir",
                                        node: this.fs.next_node_id++,
                                        children: {},
                                        created_time: now,
                                        last_access_time: now,
                                        last_modified_time: now,
                                        last_change_time: now,
                                        listable: true,
                                        readable: true,
                                        writeable: true,
                                    };
                                }
                                else {
                                    const now = this.fs.now();
                                    n = parent.children[name] = {
                                        type: "file",
                                        node: this.fs.next_node_id++,
                                        data: new Uint8Array(128),
                                        length: 0,
                                        created_time: now,
                                        last_access_time: now,
                                        last_modified_time: now,
                                        last_change_time: now,
                                        readable: true,
                                        writeable: true,
                                        readers: 0,
                                        writers: 0,
                                    };
                                }
                                break;
                        }
                        var handle;
                        switch (n.type) {
                            case "dir":
                                if (trunc)
                                    throw wasi.ERRNO_ISDIR;
                                if (append)
                                    throw wasi.ERRNO_ISDIR;
                                dirs.push(n);
                                handle = new MemoryDirHandle(this.fs, dirs);
                                break;
                            case "file":
                                if (directory)
                                    throw wasi.ERRNO_NOTDIR;
                                const h = new fs_1.MemoryFileHandle(this.fs, n, write);
                                if (trunc) {
                                    for (let k = 0; k < n.length; ++k)
                                        n.data[k] = 0;
                                    n.length = 0;
                                }
                                if (append)
                                    h.position = n.length;
                                handle = h;
                                break;
                        }
                        handle.fd_fdstat_set_flags(fdflags);
                        return handle;
                    }
                    else {
                        switch (name) {
                            case ".":
                                break;
                            case "..":
                                dirs.pop();
                                if (dirs.length === 0)
                                    throw wasi.ERRNO_NOENT;
                                break;
                            default:
                                const dir = dirs[dirs.length - 1];
                                const child = dir.children[name];
                                if (!child)
                                    throw wasi.ERRNO_NOENT;
                                if (child.type !== "dir")
                                    throw wasi.ERRNO_NOTDIR;
                                dirs.push(child);
                                break;
                        }
                    }
                }
                const d = new MemoryDirHandle(this.fs, dirs);
                d.fd_fdstat_set_flags(fdflags);
                return d;
            }
        }
        fs_1.MemoryDirHandle = MemoryDirHandle;
    })(fs = wasi.fs || (wasi.fs = {}));
})(wasi || (wasi = {}));
var wasi;
(function (wasi) {
    var fs;
    (function (fs_2) {
        class MemoryFileHandle {
            constructor(fs, file, write) {
                this.async = false;
                this.position = 0;
                this.blocking = true;
                this.fdflags = wasi.FDFLAGS_NONE;
                if (write && !file.writeable)
                    throw wasi.ERRNO_ROFS;
                if (write) {
                    if (!file.writeable)
                        throw wasi.ERRNO_ROFS;
                    if (file.writers || file.readers)
                        throw wasi.ERRNO_PERM;
                    ++file.writers;
                }
                else {
                    if (file.writers)
                        throw wasi.ERRNO_PERM;
                    ++file.readers;
                }
                this.fs = fs;
                this.file = file;
                this.write = write;
            }
            debug() { return `MemoryFileHandle`; }
            fd_close() {
                if (this.write) {
                    if (--this.file.writers === 0)
                        this.fs.file_commit();
                }
                else {
                    --this.file.readers;
                }
            }
            fd_advise(_offset, _len, _advice) { }
            fd_datasync() { this.fs.sync(); }
            fd_fdstat_set_flags(fdflags) { this.fdflags = fdflags; }
            fd_tell() { return BigInt(this.position); }
            fd_sync() { this.fs.sync(); }
            fd_allocate(offset, len) {
                if (!this.write)
                    throw wasi.ERRNO_BADF;
                const maxb = offset + len;
                if (maxb >= Number.MAX_SAFE_INTEGER)
                    throw wasi.ERRNO_FBIG;
                const max = Number(maxb);
                if (max > this.file.data.length) {
                    const next_data = new Uint8Array(Math.max(max, 2 * Math.max(128, this.file.data.length)));
                    for (let i = 0; i < this.file.data.length; ++i)
                        next_data[i] = this.file.data[i];
                    this.file.data = next_data;
                }
            }
            fd_fdstat_get() {
                return {
                    filetype: wasi.FILETYPE_DIRECTORY,
                    flags: this.fdflags,
                    rights_base: wasi.RIGHTS_ALL_FILE,
                    rights_inheriting: wasi.RIGHTS_NONE,
                };
            }
            fd_seek(offset, whence) {
                var abs;
                switch (whence) {
                    case wasi.WHENCE_SET:
                        abs = offset;
                        break;
                    case wasi.WHENCE_END:
                        abs = BigInt(this.file.length) + offset;
                        break;
                    case wasi.WHENCE_CUR:
                        abs = this.fd_tell() + offset;
                        break;
                    default: throw wasi.ERRNO_INVAL;
                }
                if (abs < 0n)
                    throw wasi.ERRNO_IO;
                if (abs >= BigInt(Number.MAX_SAFE_INTEGER))
                    throw wasi.ERRNO_FBIG;
                this.position = Number(abs);
                return abs;
            }
            fd_filestat_get() {
                return {
                    dev: 0n,
                    ino: BigInt(this.file.node),
                    filetype: wasi.FILETYPE_REGULAR_FILE,
                    nlink: 0n,
                    size: BigInt(this.file.length),
                    access_time: this.file.last_access_time,
                    modified_time: this.file.last_modified_time,
                    change_time: this.file.last_change_time,
                };
            }
            fd_filestat_set_size(size) {
                if (!this.write)
                    throw wasi.ERRNO_BADF;
                else if (size > BigInt(this.file.length))
                    this.fd_allocate(0n, size);
                else if (size < this.file.length) {
                    const smol = Number(size);
                    for (let i = smol; i < this.file.length; ++i)
                        this.file.data[i] = 0;
                    this.file.length = smol;
                }
            }
            fd_filestat_set_times(access_time, modified_time, fst_flags) {
                const now = (fst_flags & (wasi.FSTFLAGS_ATIM_NOW | wasi.FSTFLAGS_MTIM_NOW)) ? this.fs.now() : 0n;
                if (fst_flags & wasi.FSTFLAGS_ATIM)
                    this.file.last_access_time = access_time;
                else if (fst_flags & wasi.FSTFLAGS_ATIM_NOW)
                    this.file.last_access_time = now;
                if (fst_flags & wasi.FSTFLAGS_MTIM)
                    this.file.last_modified_time = modified_time;
                else if (fst_flags & wasi.FSTFLAGS_MTIM_NOW)
                    this.file.last_modified_time = now;
            }
            fd_read(iovec) {
                if (!this.file.readable)
                    throw wasi.ERRNO_NOTCAPABLE;
                let read = 0;
                iovec.forEach8(io => {
                    let n = Math.min(io.length, this.file.length - this.position);
                    for (let i = 0; i < n; ++i)
                        io[i] = this.file.data[i];
                    this.position += n;
                    read += n;
                });
                return read;
            }
            fd_write(ciovec) {
                if (!this.write)
                    throw wasi.ERRNO_NOTCAPABLE;
                if (this.fdflags & wasi.FDFLAGS_APPEND)
                    this.position = this.file.length;
                const total = Math.min(0xFFFFFFFF, ciovec.total_bytes());
                const max = this.position + total;
                if (max >= Number.MAX_SAFE_INTEGER)
                    throw wasi.ERRNO_FBIG;
                if (max > this.file.data.length) {
                    const next_data = new Uint8Array(Math.max(max, 2 * Math.max(128, this.file.data.length)));
                    for (let i = 0; i < this.file.data.length; ++i)
                        next_data[i] = this.file.data[i];
                    this.file.data = next_data;
                }
                this.file.length = Math.max(this.file.length, max);
                ciovec.forEach8(io => io.forEach(b => { if (this.position < max)
                    this.file.data[this.position++] = b; }));
                console.assert(this.position == max);
                return total;
            }
            fd_pread(iovec, offset) {
                if (!this.file.readable)
                    throw wasi.ERRNO_NOTCAPABLE;
                if (offset >= this.file.length)
                    return 0;
                const prev_pos = this.position;
                try {
                    this.position = Number(offset);
                    return this.fd_read(iovec);
                }
                finally {
                    this.position = prev_pos;
                }
            }
            fd_pwrite(iovec, offset) {
                if (!this.file.writeable)
                    throw wasi.ERRNO_NOTCAPABLE;
                if (offset >= Number.MAX_SAFE_INTEGER)
                    throw wasi.ERRNO_FBIG;
                const prev_pos = this.position;
                try {
                    this.position = Number(offset);
                    return this.fd_read(iovec);
                }
                finally {
                    this.position = prev_pos;
                }
            }
        }
        fs_2.MemoryFileHandle = MemoryFileHandle;
    })(fs = wasi.fs || (wasi.fs = {}));
})(wasi || (wasi = {}));
var wasi;
(function (wasi) {
    function env(i, memory, args, env) {
        const utf8 = new TextEncoder();
        const utf8_arg = args.map(arg => utf8.encode(`${arg}\0`));
        const utf8_env = Object.entries(env).map(([key, val]) => utf8.encode(`${key}=${val}\0`));
        const utf8_arg_total = utf8_arg.reduce((prev, s) => prev + s.length, 0);
        const utf8_env_total = utf8_env.reduce((prev, s) => prev + s.length, 0);
        i.wasi_snapshot_preview1.args_get = function args_get(argv, argv_buf) {
            let out = 0;
            utf8_arg.forEach((arg, arg_idx) => {
                memory.write_ptr(argv, +4 * arg_idx, (argv_buf + out));
                arg.forEach(byte => {
                    memory.write_u8(argv_buf, out, byte);
                    out += 1;
                });
            });
            return wasi.ERRNO_SUCCESS;
        };
        i.wasi_snapshot_preview1.args_sizes_get = function args_sizes_get(out_argc, out_argv_buf_size) {
            memory.write_usize(out_argc, +0, utf8_arg.length);
            memory.write_usize(out_argv_buf_size, +0, utf8_arg_total);
            return wasi.ERRNO_SUCCESS;
        };
        i.wasi_snapshot_preview1.environ_get = function environ_get(environ, environ_buf) {
            let out = 0;
            utf8_env.forEach((env, env_idx) => {
                memory.write_ptr(environ, +4 * env_idx, (environ_buf + out));
                env.forEach(byte => {
                    memory.write_u8(environ_buf, out, byte);
                    out += 1;
                });
            });
            return wasi.ERRNO_SUCCESS;
        };
        i.wasi_snapshot_preview1.environ_sizes_get = function environ_sizes_get(out_environc, out_environ_buf_size) {
            memory.write_usize(out_environc, +0, utf8_env.length);
            memory.write_usize(out_environ_buf_size, +0, utf8_env_total);
            return wasi.ERRNO_SUCCESS;
        };
    }
    wasi.env = env;
})(wasi || (wasi = {}));
var wasi;
(function (wasi) {
    function fds(i, memory, asyncifier, domtty, settings) {
        const trace = true;
        const FS = new io.memory.FileSystem();
        FS.now = () => {
            if (i._cargo_html_shenannigans_do_not_use.file_time_now === undefined)
                return 0n;
            else
                return i._cargo_html_shenannigans_do_not_use.file_time_now();
        };
        const root = FS.init_dir("/");
        const temp = FS.init_dir("/temp/");
        temp.listable = false;
        const home = FS.init_dir("/home/");
        const FDS = {
            3: { handle: new wasi.fs.MemoryDirHandle(FS, [root], "/"), rights_base: wasi.RIGHTS_ALL, rights_inherit: wasi.RIGHTS_ALL },
            4: { handle: new wasi.fs.MemoryDirHandle(FS, [root], "."), rights_base: wasi.RIGHTS_ALL, rights_inherit: wasi.RIGHTS_ALL },
        };
        const RIGHTS_CONIN = wasi.rights(wasi.RIGHTS_FD_FILESTAT_GET, wasi.RIGHTS_FD_READ);
        switch (settings.stdin || (domtty ? "dom" : "prompt")) {
            case "badfd": break;
            case "prompt": break;
            case "dom":
                const stdin = wasi.ConReader.try_create({
                    mode: settings.domtty?.mode || "line-buffered",
                    listen_to: settings.domtty?.listen || document,
                    input: settings.domtty?.input || "cargo-html-console-input",
                    echo: (text) => domtty ? domtty.write(text) : undefined,
                });
                if (stdin)
                    FDS[0] = { handle: stdin, rights_base: RIGHTS_CONIN, rights_inherit: wasi.RIGHTS_NONE };
                break;
        }
        const RIGHTS_CONOUT = wasi.rights(wasi.RIGHTS_FD_FILESTAT_GET, wasi.RIGHTS_FD_WRITE);
        const stdout = wasi.TextStreamWriter.from_output(settings.stdout || (domtty ? "dom" : "console-log"), "#FFF", domtty);
        const stderr = wasi.TextStreamWriter.from_output(settings.stdout || (domtty ? "dom" : "console-error"), "#F44", domtty);
        if (stdout)
            FDS[1] = { handle: stdout, rights_base: RIGHTS_CONOUT, rights_inherit: wasi.RIGHTS_NONE };
        if (stderr)
            FDS[2] = { handle: stderr, rights_base: RIGHTS_CONOUT, rights_inherit: wasi.RIGHTS_NONE };
        let _next_fd = 0x1000;
        function advance_fd() {
            ++_next_fd;
            if (_next_fd > 0x3FFFFFFF)
                _next_fd = 0x1000;
            return _next_fd ^ 0xFF;
        }
        function alloc_fd(entry) {
            var fd = 0;
            while ((fd = advance_fd()) in FDS) { }
            FDS[fd] = entry;
            return fd;
        }
        function get_io_caller_name() {
            const s = (new Error()).stack;
            if (!s)
                return "???";
            const m = /^\s*at ((fd|path)_[a-zA-Z_]*)/gm.exec(s);
            if (!m)
                return "???";
            return m[1];
        }
        function wrap_fd(fd, req_rights_base, op) {
            const name = trace ? get_io_caller_name() : undefined;
            return asyncifier.asyncify(async () => {
                const e = FDS[fd];
                if (e === undefined) {
                    if (trace)
                        console.error("%s(fd=%d, ...) failed: ERRNO_BADF", name, fd);
                    return wasi.ERRNO_BADF;
                }
                if ((e.rights_base & req_rights_base) !== req_rights_base)
                    return wasi._ERRNO_RIGHTS_FAILED;
                let ret;
                try {
                    ret = await op(e);
                }
                catch (errno) {
                    if (typeof errno === "number") {
                        ret = errno;
                    }
                    else {
                        throw errno;
                    }
                }
                if (trace && ret !== wasi.ERRNO_SUCCESS)
                    console.error("%s(fd=%d, entry=%s, ...) failed: ERRNO_%s", name, fd, e.handle.debug(), wasi.errno_string(ret));
                return ret;
            }, wasi.ERRNO_ASYNCIFY);
        }
        function wrap_path(fd, req_rights_base, _lookup, path_ptr, path_len, op) {
            const name = trace ? get_io_caller_name() : undefined;
            return asyncifier.asyncify(async () => {
                const path = memory.read_string(path_ptr, +0, path_len);
                const e = FDS[fd];
                if (e === undefined) {
                    if (trace)
                        console.error("%s(fd=%d, path=\"%s\", ...) failed: ERRNO_BADF", name, fd, path);
                    return wasi.ERRNO_BADF;
                }
                let ret;
                try {
                    ret = await op(e, path);
                }
                catch (errno) {
                    if (typeof errno === "number") {
                        ret = errno;
                    }
                    else {
                        throw errno;
                    }
                }
                if (trace && ret !== wasi.ERRNO_SUCCESS)
                    console.error("%s(fd=%d, path=\"%s\", ...) failed: ERRNO_%s", name, fd, path, wasi.errno_string(ret));
                return ret;
            }, wasi.ERRNO_ASYNCIFY);
        }
        i.wasi_snapshot_preview1.fd_advise = function fd_advise(fd, offset, len, advice) {
            return wrap_fd(fd, wasi.RIGHTS_FD_ADVISE, async (e) => {
                wasi.advice_validate(advice);
                const r = e.handle.fd_advise(offset, len, advice);
                if (e.handle.async)
                    await r;
                return wasi.ERRNO_SUCCESS;
            });
        };
        i.wasi_snapshot_preview1.fd_allocate = function fd_allocate(fd, offset, len) {
            return wrap_fd(fd, wasi.RIGHTS_FD_ALLOCATE, async (e) => {
                if (len === 0n)
                    throw wasi.ERRNO_INVAL;
                const r = e.handle.fd_allocate(offset, len);
                if (e.handle.async)
                    await r;
                return wasi.ERRNO_SUCCESS;
            });
        };
        i.wasi_snapshot_preview1.fd_close = function fd_close(fd) {
            return wrap_fd(fd, wasi.RIGHTS_NONE, async (e) => {
                const r = e.handle.fd_close();
                if (e.handle.async)
                    await r;
                delete FDS[fd];
                return wasi.ERRNO_SUCCESS;
            });
        };
        i.wasi_snapshot_preview1.fd_datasync = function fd_datasync(fd) {
            return wrap_fd(fd, wasi.RIGHTS_FD_DATASYNC, async (e) => {
                const r = e.handle.fd_datasync();
                if (e.handle.async)
                    await r;
                delete FDS[fd];
                return wasi.ERRNO_SUCCESS;
            });
        };
        i.wasi_snapshot_preview1.fd_fdstat_get = function fd_fdstat_get(fd, buf) {
            return wrap_fd(fd, wasi.RIGHTS_NONE, async (e) => {
                var stat;
                if (e.handle.async)
                    stat = await e.handle.fd_fdstat_get();
                else
                    stat = e.handle.fd_fdstat_get();
                stat = {
                    filetype: stat.filetype,
                    flags: stat.flags,
                    rights_base: (stat.rights_base & e.rights_base),
                    rights_inheriting: (stat.rights_inheriting & e.rights_inherit),
                };
                wasi.write_fdstat(memory, buf, 0, stat);
                return wasi.ERRNO_SUCCESS;
            });
        };
        i.wasi_snapshot_preview1.fd_fdstat_set_flags = function fd_fdstat_set_flags(fd, flags) {
            return wrap_fd(fd, wasi.RIGHTS_FD_FDSTAT_SET_FLAGS, async (e) => {
                const r = e.handle.fd_fdstat_set_flags(flags);
                if (e.handle.async)
                    await r;
                return wasi.ERRNO_SUCCESS;
            });
        };
        i.wasi_snapshot_preview1.fd_fdstat_set_rights = function fd_fdstat_set_rights(fd, rights_base, rights_inheriting) {
            return wrap_fd(fd, wasi.RIGHTS_NONE, async (e) => {
                if ((e.rights_base & rights_base) != rights_base)
                    return wasi.ERRNO_NOTCAPABLE;
                if ((e.rights_inherit & rights_inheriting) != rights_inheriting)
                    return wasi.ERRNO_NOTCAPABLE;
                e.rights_base = rights_base;
                e.rights_inherit = rights_inheriting;
                return wasi.ERRNO_SUCCESS;
            });
        };
        i.wasi_snapshot_preview1.fd_filestat_get = function fd_filestat_get(fd, buf) {
            return wrap_fd(fd, wasi.RIGHTS_FD_FILESTAT_GET, async (e) => {
                var stat;
                if (e.handle.async)
                    stat = await e.handle.fd_filestat_get();
                else
                    stat = e.handle.fd_filestat_get();
                wasi.write_filestat(memory, buf, 0, stat);
                return wasi.ERRNO_SUCCESS;
            });
        };
        i.wasi_snapshot_preview1.fd_filestat_set_size = function fd_filestat_set_size(fd, size) {
            return wrap_fd(fd, wasi.RIGHTS_FD_FILESTAT_SET_SIZE, async (e) => {
                const r = e.handle.fd_filestat_set_size(size);
                if (e.handle.async)
                    await r;
                return wasi.ERRNO_SUCCESS;
            });
        };
        i.wasi_snapshot_preview1.fd_filestat_set_times = function fd_filestat_set_times(fd, access_time, modified_time, fst_flags) {
            return wrap_fd(fd, wasi.RIGHTS_FD_FILESTAT_SET_TIMES, async (e) => {
                wasi.validate_fst_flags(fst_flags);
                const r = e.handle.fd_filestat_set_times(access_time, modified_time, fst_flags);
                if (e.handle.async)
                    await r;
                return wasi.ERRNO_SUCCESS;
            });
        };
        i.wasi_snapshot_preview1.fd_pread = function fd_pread(fd, iovec_array_ptr, iovec_array_len, offset, nread) {
            return wrap_fd(fd, wasi.rights(wasi.RIGHTS_FD_READ, wasi.RIGHTS_FD_SEEK), async (e) => {
                var read;
                if (e.handle.fd_pread === undefined)
                    return wasi.ERRNO_NOTCAPABLE;
                if (e.handle.async)
                    read = await e.handle.fd_pread(new wasi.IovecArray(memory, iovec_array_ptr, iovec_array_len), offset);
                else
                    read = e.handle.fd_pread(new wasi.IovecArray(memory, iovec_array_ptr, iovec_array_len), offset);
                memory.write_usize(nread, 0, read);
                return wasi.ERRNO_SUCCESS;
            });
        };
        i.wasi_snapshot_preview1.fd_prestat_dir_name = function fd_prestat_dir_name(fd, path, path_len) {
            return wrap_fd(fd, wasi.RIGHTS_NONE, async (e) => {
                if (e.handle.prestat_dir === undefined)
                    return wasi.ERRNO_NOTCAPABLE;
                const name = e.handle.prestat_dir;
                console.assert(name[name.length - 1] === 0);
                if (path_len < name.length)
                    return wasi.ERRNO_NAMETOOLONG;
                for (var i = 0; i < name.length; ++i)
                    memory.write_u8(path, i, name[i]);
                return wasi.ERRNO_SUCCESS;
            });
        };
        i.wasi_snapshot_preview1.fd_prestat_get = function fd_prestat_get(fd, buf) {
            return wrap_fd(fd, wasi.RIGHTS_NONE, async (e) => {
                if (e.handle.prestat_dir === undefined)
                    return wasi.ERRNO_NOTCAPABLE;
                const name = e.handle.prestat_dir;
                console.assert(name[name.length - 1] === 0);
                memory.write_u8(buf, 0, 0);
                memory.write_usize(buf, 4, name.length);
                return wasi.ERRNO_SUCCESS;
            });
        };
        i.wasi_snapshot_preview1.fd_pwrite = function fd_pwrite(fd, ciovec_array_ptr, ciovec_array_len, offset, nwritten) {
            return wrap_fd(fd, wasi.rights(wasi.RIGHTS_FD_WRITE, wasi.RIGHTS_FD_SEEK), async (e) => {
                var wrote;
                if (e.handle.fd_pwrite === undefined)
                    return wasi.ERRNO_NOTCAPABLE;
                if (e.handle.async)
                    wrote = await e.handle.fd_pwrite(new wasi.IovecArray(memory, ciovec_array_ptr, ciovec_array_len), offset);
                else
                    wrote = e.handle.fd_pwrite(new wasi.IovecArray(memory, ciovec_array_ptr, ciovec_array_len), offset);
                memory.write_usize(nwritten, 0, wrote);
                return wasi.ERRNO_SUCCESS;
            });
        };
        i.wasi_snapshot_preview1.fd_read = function fd_read(fd, iovec_array_ptr, iovec_array_len, nread_ptr) {
            return wrap_fd(fd, wasi.RIGHTS_FD_READ, async (e) => {
                if (e.handle.fd_read === undefined)
                    return wasi.ERRNO_NOTCAPABLE;
                const iovec = new wasi.IovecArray(memory, iovec_array_ptr, iovec_array_len);
                var nwritten = 0;
                if (e.handle.async)
                    nwritten = await e.handle.fd_read(iovec);
                else
                    nwritten = e.handle.fd_read(iovec);
                memory.write_usize(nread_ptr, 0, nwritten);
                return wasi.ERRNO_SUCCESS;
            });
        };
        i.wasi_snapshot_preview1.fd_readdir = function fd_readdir(fd, buf, buf_len, cookie, buf_used) {
            return wrap_fd(fd, wasi.RIGHTS_FD_READDIR, async (e) => {
                var dirents;
                if (e.handle.fd_readdir === undefined)
                    return wasi.ERRNO_NOTCAPABLE;
                if (e.handle.async)
                    dirents = await e.handle.fd_readdir(cookie, buf_len);
                else
                    dirents = e.handle.fd_readdir(cookie, buf_len);
                let used = 0;
                const dirent_header = new DataView(new ArrayBuffer(wasi.DIRENT_SIZE));
                dirents.forEach(src => {
                    if (buf_len <= 0)
                        return;
                    dirent_header.setBigUint64(0, src.next, true);
                    dirent_header.setBigUint64(8, src.ino, true);
                    dirent_header.setUint32(16, src.name.length, true);
                    dirent_header.setUint8(20, src.type);
                    var n = Math.min(buf_len, wasi.DIRENT_SIZE);
                    for (let i = 0; i < n; ++i)
                        memory.write_u8(buf, i, dirent_header.getUint8(i));
                    buf = (buf + n);
                    buf_len = (buf_len - n);
                    used += n;
                    var n = Math.min(buf_len, src.name.length);
                    for (let i = 0; i < n; ++i)
                        memory.write_u8(buf, i, src.name[i]);
                    buf = (buf + n);
                    buf_len = (buf_len - n);
                    used += n;
                });
                memory.write_usize(buf_used, +0, used);
                return wasi.ERRNO_SUCCESS;
            });
        };
        i.wasi_snapshot_preview1.fd_renumber = function fd_renumber(from, to) {
            return asyncifier.asyncify(async () => {
                if (!(from in FDS))
                    return wasi.ERRNO_BADF;
                const e = FDS[to];
                if (e !== undefined) {
                    const r = e.handle.fd_close();
                    if (e.handle.async)
                        await r;
                }
                FDS[to] = FDS[from];
                delete FDS[from];
                return wasi.ERRNO_SUCCESS;
            }, wasi.ERRNO_ASYNCIFY);
        };
        i.wasi_snapshot_preview1.fd_seek = function fd_seek(fd, offset, whence, new_offset) {
            return wrap_fd(fd, wasi.RIGHTS_NONE, async (e) => {
                const rights = ((offset === 0n) && (whence === wasi.WHENCE_CUR)) ? wasi.RIGHTS_FD_TELL : wasi.RIGHTS_FD_SEEK;
                if ((e.rights_base & rights) !== rights)
                    return wasi._ERRNO_RIGHTS_FAILED;
                var newoff;
                if (e.handle.fd_seek === undefined)
                    return wasi.ERRNO_NOTCAPABLE;
                if (e.handle.async)
                    newoff = await e.handle.fd_seek(offset, whence);
                else
                    newoff = e.handle.fd_seek(offset, whence);
                memory.write_u64(new_offset, 0, newoff);
                return wasi.ERRNO_SUCCESS;
            });
        };
        i.wasi_snapshot_preview1.fd_sync = function fd_sync(fd) {
            return wrap_fd(fd, wasi.RIGHTS_FD_SYNC, async (e) => {
                if (e.handle.fd_sync === undefined)
                    return wasi.ERRNO_NOTCAPABLE;
                const r = e.handle.fd_sync();
                if (e.handle.async)
                    await r;
                return wasi.ERRNO_SUCCESS;
            });
        };
        i.wasi_snapshot_preview1.fd_tell = function fd_tell(fd, offset) {
            return wrap_fd(fd, wasi.RIGHTS_FD_TELL, async (e) => {
                var newoff;
                if (e.handle.fd_tell === undefined)
                    return wasi.ERRNO_NOTCAPABLE;
                if (e.handle.async)
                    newoff = await e.handle.fd_tell();
                else
                    newoff = e.handle.fd_tell();
                memory.write_u64(offset, 0, newoff);
                return wasi.ERRNO_SUCCESS;
            });
        };
        i.wasi_snapshot_preview1.fd_write = function fd_write(fd, ciovec_array_ptr, ciovec_array_len, nwritten_ptr) {
            return wrap_fd(fd, wasi.RIGHTS_FD_WRITE, async (e) => {
                if (e.handle.fd_write === undefined)
                    return wasi.ERRNO_NOTCAPABLE;
                const ciovec = new wasi.IovecArray(memory, ciovec_array_ptr, ciovec_array_len);
                var nwritten = 0;
                if (e.handle.async)
                    nwritten = await e.handle.fd_write(ciovec);
                else
                    nwritten = e.handle.fd_write(ciovec);
                memory.write_usize(nwritten_ptr, 0, nwritten);
                return wasi.ERRNO_SUCCESS;
            });
        };
        i.wasi_snapshot_preview1.path_create_directory = function path_create_directory(fd, path_ptr, path_len) {
            return wrap_path(fd, wasi.RIGHTS_PATH_CREATE_DIRECTORY, undefined, path_ptr, path_len, async (e, path) => {
                if (e.handle.path_create_directory === undefined)
                    return wasi.ERRNO_NOTCAPABLE;
                const r = await e.handle.path_create_directory(path);
                if (e.handle.async)
                    await r;
                return wasi.ERRNO_SUCCESS;
            });
        };
        i.wasi_snapshot_preview1.path_filestat_get = function path_filestat_get(fd, flags, path_ptr, path_len, buf) {
            return wrap_path(fd, wasi.RIGHTS_PATH_FILESTAT_GET, flags, path_ptr, path_len, async (e, path) => {
                var stat;
                if (e.handle.path_filestat_get === undefined)
                    return wasi.ERRNO_NOTCAPABLE;
                if (e.handle.async)
                    stat = await e.handle.path_filestat_get(flags, path);
                else
                    stat = e.handle.path_filestat_get(flags, path);
                wasi.write_filestat(memory, buf, 0, stat);
                return wasi.ERRNO_SUCCESS;
            });
        };
        i.wasi_snapshot_preview1.path_filestat_set_times = function path_filestat_set_times(fd, flags, path_ptr, path_len, access_time, modified_time, fst_flags) {
            return wrap_path(fd, wasi.RIGHTS_PATH_FILESTAT_SET_TIMES, flags, path_ptr, path_len, async (e, path) => {
                if (e.handle.path_filestat_set_times === undefined)
                    return wasi.ERRNO_NOTCAPABLE;
                const r = e.handle.path_filestat_set_times(flags, path, access_time, modified_time, fst_flags);
                ;
                if (e.handle.async)
                    await r;
                return wasi.ERRNO_SUCCESS;
            });
        };
        i.wasi_snapshot_preview1.path_link = function path_link(old_fd, old_flags, old_path_ptr, old_path_len, new_fd, new_path_ptr, new_path_len) {
            return wrap_path(old_fd, wasi.RIGHTS_PATH_LINK_SOURCE, old_flags, old_path_ptr, old_path_len, async (old, old_path) => {
                if (old.handle.path_link === undefined)
                    return wasi.ERRNO_NOTCAPABLE;
                const new_path = memory.read_string(new_path_ptr, +0, new_path_len);
                const to = FDS[new_fd];
                if (to === undefined) {
                    if (trace)
                        console.error("path_link(old_fd=%d, old_path=\"%s\", new_fd=%d, new_path=\"%s\", ...) failed: ERRNO_BADF (new_fd is invalid)", old_fd, old_path, new_fd, new_path);
                    return wasi.ERRNO_BADF;
                }
                else if (!(to.rights_base & wasi.RIGHTS_PATH_LINK_TARGET)) {
                    return wasi._ERRNO_RIGHTS_FAILED;
                }
                else if (old.handle.async) {
                    await old.handle.path_link(old_flags, old_path, to.handle, new_path);
                }
                else if (to.handle.async) {
                    if (trace)
                        console.error("path_link(old_fd=%d, old_path=\"%s\", new_fd=%d, new_path=\"%s\", ...) failed: ERRNO_XDEV (new_fd is async, old_fd isn't)", old_fd, old_path, new_fd, new_path);
                    return wasi.ERRNO_XDEV;
                }
                else {
                    old.handle.path_link(old_flags, old_path, to.handle, new_path);
                }
                return wasi.ERRNO_SUCCESS;
            });
        };
        i.wasi_snapshot_preview1.path_open = function path_open(fd, dirflags, path_ptr, path_len, oflags, fs_rights_base, fs_rights_inheriting, fdflags, opened_fd) {
            return wrap_path(fd, wasi.RIGHTS_PATH_OPEN, dirflags, path_ptr, path_len, async (e, path) => {
                if (e.handle.path_open === undefined)
                    return wasi.ERRNO_NOTCAPABLE;
                if ((fdflags & wasi.FDFLAGS_DSYNC) && !(e.rights_base & wasi.RIGHTS_FD_DATASYNC))
                    return wasi._ERRNO_RIGHTS_FAILED;
                if ((fdflags & wasi.FDFLAGS_DSYNC) && !(e.rights_base & wasi.RIGHTS_FD_SYNC))
                    return wasi._ERRNO_RIGHTS_FAILED;
                if ((fdflags & wasi.FDFLAGS_RSYNC) && !(e.rights_base & wasi.RIGHTS_FD_SYNC))
                    return wasi._ERRNO_RIGHTS_FAILED;
                if ((oflags & wasi.OFLAGS_CREAT) && !(e.rights_base & wasi.RIGHTS_PATH_CREATE_FILE))
                    return wasi._ERRNO_RIGHTS_FAILED;
                if ((oflags & wasi.OFLAGS_TRUNC) && !(e.rights_base & wasi.RIGHTS_PATH_FILESTAT_SET_SIZE))
                    return wasi._ERRNO_RIGHTS_FAILED;
                var handle;
                if (e.handle.async)
                    handle = await e.handle.path_open(dirflags, path, oflags, fs_rights_base, fs_rights_inheriting, fdflags);
                else
                    handle = e.handle.path_open(dirflags, path, oflags, fs_rights_base, fs_rights_inheriting, fdflags);
                const out_fd = alloc_fd({ handle, rights_base: e.rights_inherit, rights_inherit: e.rights_inherit });
                memory.write_u32(opened_fd, +0, out_fd);
                return wasi.ERRNO_SUCCESS;
            });
        };
        i.wasi_snapshot_preview1.path_readlink = function path_readlink(fd, path_ptr, path_len, buf, buf_len, buf_used) {
            return wrap_path(fd, wasi.RIGHTS_PATH_READLINK, undefined, path_ptr, path_len, async (e, path) => {
                memory.write_usize(buf_used, 0, 0);
                var symlink;
                if (e.handle.path_readlink === undefined)
                    return wasi.ERRNO_NOTCAPABLE;
                if (e.handle.async)
                    symlink = await e.handle.path_readlink(path);
                else
                    symlink = e.handle.path_readlink(path);
                const r = new TextEncoder().encode(symlink);
                const n = Math.min(buf_len, r.length);
                for (let i = 0; i < n; ++i)
                    memory.write_u8(buf, i, r[i]);
                memory.write_usize(buf_used, 0, n);
                return wasi.ERRNO_SUCCESS;
            });
        };
        i.wasi_snapshot_preview1.path_remove_directory = function path_remove_directory(fd, path_ptr, path_len) {
            return wrap_path(fd, wasi.RIGHTS_PATH_REMOVE_DIRECTORY, undefined, path_ptr, path_len, async (e, path) => {
                if (e.handle.path_remove_directory === undefined)
                    return wasi.ERRNO_NOTCAPABLE;
                const r = e.handle.path_remove_directory(path);
                if (e.handle.async)
                    await r;
                return wasi.ERRNO_SUCCESS;
            });
        };
        i.wasi_snapshot_preview1.path_rename = function path_rename(old_fd, old_path_ptr, old_path_len, new_fd, new_path_ptr, new_path_len) {
            return wrap_path(old_fd, wasi.RIGHTS_PATH_RENAME_SOURCE, undefined, old_path_ptr, old_path_len, async (old, old_path) => {
                if (old.handle.path_rename === undefined)
                    return wasi.ERRNO_NOTCAPABLE;
                const new_path = memory.read_string(new_path_ptr, +0, new_path_len);
                const to = FDS[new_fd];
                if (to === undefined) {
                    if (trace)
                        console.error("path_rename(old_fd=%d, old_path=\"%s\", new_fd=%d, new_path=\"%s\", ...) failed: ERRNO_BADF (new_fd is invalid)", old_fd, old_path, new_fd, new_path);
                    return wasi.ERRNO_BADF;
                }
                else if (!(to.rights_base & wasi.RIGHTS_PATH_RENAME_TARGET)) {
                    return wasi._ERRNO_RIGHTS_FAILED;
                }
                else if (old.handle.async) {
                    await old.handle.path_rename(old_path, to.handle, new_path);
                }
                else if (to.handle.async) {
                    if (trace)
                        console.error("path_rename(old_fd=%d, old_path=\"%s\", new_fd=%d, new_path=\"%s\", ...) failed: ERRNO_XDEV (new_fd is async, old_fd isn't)", old_fd, old_path, new_fd, new_path);
                    return wasi.ERRNO_XDEV;
                }
                else {
                    old.handle.path_rename(old_path, to.handle, new_path);
                }
                return wasi.ERRNO_SUCCESS;
            });
        };
        i.wasi_snapshot_preview1.path_symlink = function path_symlink(old_path_ptr, old_path_len, fd, new_path_ptr, new_path_len) {
            return wrap_fd(fd, wasi.RIGHTS_PATH_SYMLINK, async (e) => {
                if (e.handle.path_symlink === undefined)
                    return wasi.ERRNO_NOTCAPABLE;
                const old_path = memory.read_string(old_path_ptr, +0, old_path_len);
                const new_path = memory.read_string(new_path_ptr, +0, new_path_len);
                const r = e.handle.path_symlink(old_path, new_path);
                if (e.handle.async)
                    await r;
                return wasi.ERRNO_SUCCESS;
            });
        };
        i.wasi_snapshot_preview1.path_unlink_file = function path_unlink_file(fd, path_ptr, path_len) {
            return wrap_path(fd, wasi.RIGHTS_PATH_UNLINK_FILE, undefined, path_ptr, path_len, async (e, path) => {
                if (e.handle.path_unlink_file === undefined)
                    return wasi.ERRNO_NOTCAPABLE;
                const r = e.handle.path_unlink_file(path);
                if (e.handle.async)
                    await r;
                return wasi.ERRNO_SUCCESS;
            });
        };
        i.wasi_snapshot_preview1.sock_recv = function sock_recv(fd, ri_data_ptr, ri_data_len, ri_flags, ro_datalen, ro_flags) {
            return wrap_fd(fd, wasi.RIGHTS_FD_READ, async (e) => {
                memory.write_usize(ro_datalen, +0, 0);
                memory.write_u16(ro_flags, +0, 0);
                if (e.handle.sock_recv === undefined)
                    return wasi.ERRNO_NOTSOCK;
                var r;
                if (e.handle.async)
                    r = await e.handle.sock_recv(new wasi.IovecArray(memory, ri_data_ptr, ri_data_len), ri_flags);
                else
                    r = e.handle.sock_recv(new wasi.IovecArray(memory, ri_data_ptr, ri_data_len), ri_flags);
                const [read, flags] = r;
                memory.write_usize(ro_datalen, +0, read);
                memory.write_u16(ro_flags, +0, flags);
                return wasi.ERRNO_SUCCESS;
            });
        };
        i.wasi_snapshot_preview1.sock_send = function sock_send(fd, si_data_ptr, si_data_len, si_flags, so_datalen) {
            return wrap_fd(fd, wasi.RIGHTS_FD_WRITE, async (e) => {
                memory.write_usize(so_datalen, +0, 0);
                if (e.handle.sock_send === undefined)
                    return wasi.ERRNO_NOTSOCK;
                var wrote;
                if (e.handle.async)
                    wrote = await e.handle.sock_send(new wasi.IovecArray(memory, si_data_ptr, si_data_len), si_flags);
                else
                    wrote = e.handle.sock_send(new wasi.IovecArray(memory, si_data_ptr, si_data_len), si_flags);
                memory.write_usize(so_datalen, +0, wrote);
                return wasi.ERRNO_SUCCESS;
            });
        };
        i.wasi_snapshot_preview1.sock_shutdown = function sock_shutdown(fd, how) {
            return wrap_fd(fd, wasi.RIGHTS_SOCK_SHUTDOWN, async (e) => {
                if (e.handle.sock_shutdown === undefined)
                    return wasi.ERRNO_NOTSOCK;
                const r = e.handle.sock_shutdown(how);
                if (e.handle.async)
                    await r;
                return wasi.ERRNO_SUCCESS;
            });
        };
    }
    wasi.fds = fds;
})(wasi || (wasi = {}));
var wasi;
(function (wasi) {
    function nyi(i) {
        function nyi() {
            debugger;
            return wasi.ERRNO_NOTCAPABLE;
        }
        Object.assign(i.wasi_snapshot_preview1, {
            args_get: function args_get() { return nyi(); },
            args_sizes_get: function args_sizes_get() { return nyi(); },
            environ_get: function environ_get() { return nyi(); },
            environ_sizes_get: function environ_sizes_get() { return nyi(); },
            clock_res_get: function clock_res_get() { return nyi(); },
            clock_time_get: function clock_time_get() { return nyi(); },
            fd_advise: function fd_advise() { return nyi(); },
            fd_allocate: function fd_allocate() { return nyi(); },
            fd_close: function fd_close() { return nyi(); },
            fd_datasync: function fd_datasync() { return nyi(); },
            fd_fdstat_get: function fd_fdstat_get() { return nyi(); },
            fd_fdstat_set_flags: function fd_fdstat_set_flags() { return nyi(); },
            fd_fdstat_set_rights: function fd_fdstat_set_rights() { return nyi(); },
            fd_filestat_get: function fd_filestat_get() { return nyi(); },
            fd_filestat_set_size: function fd_filestat_set_size() { return nyi(); },
            fd_filestat_set_times: function fd_filestat_set_times() { return nyi(); },
            fd_pread: function fd_pread() { return nyi(); },
            fd_prestat_get: function fd_prestat_get() { return nyi(); },
            fd_prestat_dir_name: function fd_prestat_dir_name() { return nyi(); },
            fd_pwrite: function fd_pwrite() { return nyi(); },
            fd_read: function fd_read() { return nyi(); },
            fd_readdir: function fd_readdir() { return nyi(); },
            fd_renumber: function fd_renumber() { return nyi(); },
            fd_seek: function fd_seek() { return nyi(); },
            fd_sync: function fd_sync() { return nyi(); },
            fd_tell: function fd_tell() { return nyi(); },
            fd_write: function fd_write() { return nyi(); },
            path_create_directory: function path_create_directory() { return nyi(); },
            path_filestat_get: function path_filestat_get() { return nyi(); },
            path_filestat_set_times: function path_filestat_set_times() { return nyi(); },
            path_link: function path_link() { return nyi(); },
            path_open: function path_open() { return nyi(); },
            path_readlink: function path_readlink() { return nyi(); },
            path_remove_directory: function path_remove_directory() { return nyi(); },
            path_rename: function path_rename() { return nyi(); },
            path_symlink: function path_symlink() { return nyi(); },
            path_unlink_file: function path_unlink_file() { return nyi(); },
            poll_oneoff: function poll_oneoff() { return nyi(); },
            proc_exit: function proc_exit() { throw "proc_exit nyi"; },
            proc_raise: function proc_raise() { return nyi(); },
            sched_yield: function sched_yield() { return nyi(); },
            random_get: function random_get() { return nyi(); },
            sock_recv: function sock_recv() { return nyi(); },
            sock_send: function sock_send() { return nyi(); },
            sock_shutdown: function sock_shutdown() { return nyi(); },
        });
    }
    wasi.nyi = nyi;
})(wasi || (wasi = {}));
var wasi;
(function (wasi) {
    function random(i, memory, style) {
        function random_get_crypto(buf, len) {
            self.crypto.getRandomValues(memory.slice8(buf, 0, len));
            return wasi.ERRNO_SUCCESS;
        }
        function insecure_random_get_math_random(buf, len) {
            for (var i = 0; i < len; ++i)
                memory.write_u8(buf, i, (0xFF & Math.floor(Math.random() * 0x100)));
            return wasi.ERRNO_SUCCESS;
        }
        switch (style) {
            case "disabled":
                break;
            case "insecure-nondeterministic":
                i.wasi_snapshot_preview1.random_get = ("crypto" in self) ? random_get_crypto : insecure_random_get_math_random;
                break;
            case "nondeterministic":
                console.assert("crypto" in self);
                i.wasi_snapshot_preview1.random_get = random_get_crypto;
                break;
        }
    }
    wasi.random = random;
})(wasi || (wasi = {}));
var wasi;
(function (wasi) {
    function signals(i, _memory, domtty, settings) {
        const trace_exit_0 = wasi.TextStreamWriter.from_output(settings.trace_exit_0 || settings.stdout || (domtty ? "dom" : "console-log"), "#888", domtty);
        const trace_exit_n = wasi.TextStreamWriter.from_output(settings.trace_exit_n || settings.stderr || (domtty ? "dom" : "console-error"), "#F44", domtty);
        const trace_signal = wasi.TextStreamWriter.from_output(settings.trace_signal || settings.stderr || (domtty ? "dom" : "console-error"), "#F44", domtty);
        function sig(sig, fatal) {
            trace_signal?.io(`process ${fatal ? "killed" : "stopped"} by signal SIG${sig}`);
            throw fatal ? "fatal-signal" : "stop-signal";
        }
        i.wasi_snapshot_preview1.proc_exit = function proc_exit(code) {
            if (code === 0)
                trace_exit_0?.io(`process exited with code ${code}`);
            else
                trace_exit_n?.io(`process exited with code ${code}`);
            throw "exit";
        };
        i.wasi_snapshot_preview1.proc_raise = function proc_raise(code) {
            switch (code) {
                case wasi.SIGNAL_NONE: return wasi.ERRNO_INVAL;
                case wasi.SIGNAL_HUP: sig("HUP", true);
                case wasi.SIGNAL_INT: sig("INT", true);
                case wasi.SIGNAL_QUIT: sig("QUIT", true);
                case wasi.SIGNAL_ILL: sig("ILL", true);
                case wasi.SIGNAL_TRAP:
                    const trap = settings.trap || "debugger";
                    if (trap === "fatal")
                        sig("TRAP", true);
                    console.error("SIGNAL_TRAP");
                    var s = Date.now();
                    debugger;
                    switch (trap) {
                        case "soft-debugger":
                            return wasi.ERRNO_SUCCESS;
                        case "debugger":
                            if (Date.now() - s > 15)
                                return wasi.ERRNO_SUCCESS;
                            sig("TRAP", true);
                        case "fatal-debugger":
                            sig("TRAP", true);
                    }
                case wasi.SIGNAL_ABRT: sig("ABRT", true);
                case wasi.SIGNAL_BUS: sig("BUS", true);
                case wasi.SIGNAL_FPE: sig("FPE", true);
                case wasi.SIGNAL_KILL: sig("KILL", true);
                case wasi.SIGNAL_USR1: sig("USR1", true);
                case wasi.SIGNAL_SEGV: sig("SEGV", true);
                case wasi.SIGNAL_USR2: sig("USR2", true);
                case wasi.SIGNAL_PIPE: return wasi.ERRNO_SUCCESS;
                case wasi.SIGNAL_ALRM: sig("ALRM", true);
                case wasi.SIGNAL_TERM: sig("TERM", true);
                case wasi.SIGNAL_CHLD: sig("CHLD", true);
                case wasi.SIGNAL_CONT: sig("CONT", true);
                case wasi.SIGNAL_STOP: sig("STOP", false);
                case wasi.SIGNAL_TSTP: sig("TSTP", false);
                case wasi.SIGNAL_TTIN: sig("TTIN", false);
                case wasi.SIGNAL_TTOU: sig("TTOU", false);
                case wasi.SIGNAL_URG: return wasi.ERRNO_SUCCESS;
                case wasi.SIGNAL_XCPU: sig("XCPU", true);
                case wasi.SIGNAL_XFSZ: sig("XFSZ", true);
                case wasi.SIGNAL_VTALRM: sig("VTALRM", true);
                case wasi.SIGNAL_PROF: sig("PROF", true);
                case wasi.SIGNAL_WINCH: return wasi.ERRNO_SUCCESS;
                case wasi.SIGNAL_POLL: sig("POLL", true);
                case wasi.SIGNAL_PWR: sig("PWR", true);
                case wasi.SIGNAL_SYS: sig("SYS", true);
            }
            return wasi.ERRNO_INVAL;
        };
    }
    wasi.signals = signals;
})(wasi || (wasi = {}));
var wasi;
(function (wasi) {
    const EVENTTYPE_CLOCK = 0;
    const EVENTTYPE_FD_READ = 1;
    const EVENTTYPE_FD_WRITE = 2;
    function sleep_ms_async(ms) {
        return new Promise(resolve => setTimeout(() => resolve(), ms));
    }
    function sleep_ns_async(ns) {
        return sleep_ms_async(ns / 1000 / 1000);
    }
    function sleep_ms_busy(ms) {
        var prev = undefined;
        while (ms > 0) {
            const now = Date.now();
            const dt = (prev === undefined) ? 0 : Math.max(0, now - prev);
            ms -= dt;
            prev = now;
        }
    }
    function sleep_ns_busy(ns) {
        return sleep_ms_busy(ns / 1000 / 1000);
    }
    function time(i, memory, { sleep, clock }) {
        var mono_total = 0;
        var prev_mono = 0;
        try {
            prev_mono = Date.now();
        }
        catch (e) { }
        console.log("sleep", sleep);
        console.log("clock", clock);
        switch (clock) {
            case "disabled":
            case "debugger":
                var first_break = false;
                i.wasi_snapshot_preview1.clock_res_get = function clock_res_get_disabled(_id, out_resolution) {
                    if (!first_break) {
                        console.error("clock_res_get: clock access has been disabled");
                        first_break = true;
                    }
                    if (clock === "debugger")
                        debugger;
                    return wasi.ERRNO_INVAL;
                };
                i.wasi_snapshot_preview1.clock_time_get = function clock_time_get_disabled(_id, precision, out_time) {
                    if (!first_break) {
                        console.error("clock_time_get: clock access has been disabled");
                        first_break = true;
                    }
                    if (clock === "debugger")
                        debugger;
                    return wasi.ERRNO_INVAL;
                };
                i._cargo_html_shenannigans_do_not_use.file_time_now = function file_time_now() {
                    if (!first_break) {
                        console.error("file time: clock access has been disabled");
                        first_break = true;
                    }
                    if (clock === "debugger")
                        debugger;
                    return 0n;
                };
                break;
            case "zero":
                i.wasi_snapshot_preview1.clock_res_get = function clock_res_get_disabled(id, out_resolution) {
                    wasi.validate_clockid(id);
                    memory.write_u64(out_resolution, 0, 0xffffffffffffffffn);
                    return wasi.ERRNO_SUCCESS;
                };
                i.wasi_snapshot_preview1.clock_time_get = function clock_time_get_disabled(id, precision, out_time) {
                    wasi.validate_clockid(id);
                    memory.write_u64(out_time, 0, 0n);
                    return wasi.ERRNO_SUCCESS;
                };
                i._cargo_html_shenannigans_do_not_use.file_time_now = () => 0n;
                break;
            case "nondeterministic":
                i.wasi_snapshot_preview1.clock_res_get = function clock_res_get_disabled(id, out_resolution) {
                    switch (id) {
                        case wasi.CLOCKID_MONOTONIC:
                        case wasi.CLOCKID_REALTIME:
                            memory.write_u64(out_resolution, 0, 1000000n);
                            return wasi.ERRNO_SUCCESS;
                        case wasi.CLOCKID_PROCESS_CPUTIME_ID:
                        case wasi.CLOCKID_THREAD_CPUTIME_ID:
                        default:
                            return wasi.ERRNO_INVAL;
                    }
                };
                i.wasi_snapshot_preview1.clock_time_get = function clock_time_get_disabled(id, _precision, out_time) {
                    var now;
                    try {
                        now = Date.now();
                    }
                    catch (e) {
                        return wasi.ERRNO_INVAL;
                    }
                    switch (id) {
                        case wasi.CLOCKID_MONOTONIC:
                            now = Date.now();
                            if (now > prev_mono)
                                mono_total += now - prev_mono;
                            prev_mono = now;
                            memory.write_u64(out_time, 0, 1000000n * BigInt(mono_total));
                            return wasi.ERRNO_SUCCESS;
                        case wasi.CLOCKID_REALTIME:
                            now = new Date().getTime();
                            memory.write_u64(out_time, 0, 1000000n * BigInt(now));
                            return wasi.ERRNO_SUCCESS;
                        case wasi.CLOCKID_PROCESS_CPUTIME_ID:
                        case wasi.CLOCKID_THREAD_CPUTIME_ID:
                        default:
                            return wasi.ERRNO_INVAL;
                    }
                };
                i._cargo_html_shenannigans_do_not_use.file_time_now = () => BigInt(new Date().getTime()) * 1000000n;
                break;
        }
        switch (sleep) {
            case "disabled":
                i.wasi_snapshot_preview1.sched_yield = function sched_yield_disabled() {
                    console.error("sched_yield: sleeping has been disabled");
                    debugger;
                    return wasi.ERRNO_NOTCAPABLE;
                };
                break;
            case "skip":
            case "busy-wait":
                i.wasi_snapshot_preview1.sched_yield = function sched_yield_skip() { return wasi.ERRNO_SUCCESS; };
                break;
            default:
                i.wasi_snapshot_preview1.sched_yield = function sched_yield_async() {
                    return sleep.asyncify(async () => {
                        await sleep_ms_async(0);
                        return wasi.ERRNO_SUCCESS;
                    }, wasi.ERRNO_ASYNCIFY);
                };
                break;
        }
        function parse_poll_oneoff(in_subs, out_events, in_nsubs, out_nevents_ptr) {
            const parsed = [];
            let out_nevents = 0;
            memory.write_usize(out_nevents_ptr, 0, out_nevents);
            for (var sub = 0; sub < in_nsubs; ++sub) {
                let sub_base = (in_subs + 48 * sub);
                let userdata = memory.read_u64_pair(sub_base, 0);
                let u_tag = memory.read_u8(sub_base, 8);
                const EVENTTYPE_CLOCK = 0;
                const EVENTTYPE_FD_READ = 1;
                const EVENTTYPE_FD_WRITE = 2;
                if (u_tag !== EVENTTYPE_CLOCK)
                    throw "only u_tag == EVENTTYPE_CLOCK currently supported";
                let u_u_clock_id = memory.read_u32(sub_base, 16);
                let u_u_clock_timeout = memory.read_u64_approx(sub_base, 24);
                let u_u_clock_precision = memory.read_u64_approx(sub_base, 32);
                let u_u_clock_flags = memory.read_u16(sub_base, 40);
                const SUBCLOCKFLAGS_SUBSCRIPTION_CLOCK_ABSTIME = 0x1;
                console.assert(u_u_clock_flags === 0, "u_u_clock_flags !== 0 not yet supported");
                let abs = (u_u_clock_flags & SUBCLOCKFLAGS_SUBSCRIPTION_CLOCK_ABSTIME) !== 0;
                if (abs)
                    throw "only relative sleeps currently supported";
                switch (u_u_clock_id) {
                    case wasi.CLOCKID_REALTIME:
                    case wasi.CLOCKID_MONOTONIC:
                        parsed.push({ type: "sleep", userdata, nanoseconds: u_u_clock_timeout });
                        break;
                    default:
                        throw "only CLOCKID_REALTIME | CLOCKID_MONOTONIC currently supported";
                }
            }
            return parsed;
        }
        function write_poll_oneoff(in_subs, out_events, in_nsubs, out_nevents_ptr, resolved) {
            console.assert(resolved.length === in_nsubs);
            for (var sub = 0; sub < in_nsubs; ++sub) {
                const r = resolved[sub];
                switch (r.type) {
                    case "sleep":
                        memory.write_u64_pair(out_events, 32 * sub + 0, r.userdata);
                        memory.write_u16(out_events, 32 * sub + 8, r.error);
                        memory.write_u8(out_events, 32 * sub + 10, EVENTTYPE_CLOCK);
                        break;
                    default:
                        const n = r.type;
                        break;
                }
            }
            memory.write_usize(out_nevents_ptr, 0, resolved.length);
            return wasi.ERRNO_SUCCESS;
        }
        switch (sleep) {
            case "disabled":
                i.wasi_snapshot_preview1.poll_oneoff = function poll_oneoff_disabled(in_subs, out_events, in_nsubs, out_nevents_ptr) {
                    console.error("poll_oneoff: sleeping has been disabled");
                    debugger;
                    return wasi.ERRNO_NOTCAPABLE;
                };
                break;
            case "skip":
                i.wasi_snapshot_preview1.poll_oneoff = function poll_oneoff_skip(in_subs, out_events, in_nsubs, out_nevents_ptr) {
                    try {
                        if (in_nsubs == 0)
                            return wasi.ERRNO_SUCCESS;
                        const parsed = parse_poll_oneoff(in_subs, out_events, in_nsubs, out_nevents_ptr);
                        const ns_to_sleep = Math.min(...parsed.map(p => p.nanoseconds));
                        const results = parsed.map(p => { return { type: "sleep", userdata: p.userdata, error: (ns_to_sleep >= p.nanoseconds) ? wasi.ERRNO_SUCCESS : wasi.ERRNO_AGAIN }; });
                        return write_poll_oneoff(in_subs, out_events, in_nsubs, out_nevents_ptr, results);
                    }
                    catch (e) {
                        debugger;
                        return wasi.ERRNO_NOTCAPABLE;
                    }
                };
                break;
            case "busy-wait":
                i.wasi_snapshot_preview1.poll_oneoff = function poll_oneoff_busy_wait(in_subs, out_events, in_nsubs, out_nevents_ptr) {
                    try {
                        if (in_nsubs == 0)
                            return wasi.ERRNO_SUCCESS;
                        const parsed = parse_poll_oneoff(in_subs, out_events, in_nsubs, out_nevents_ptr);
                        const ns_to_sleep = Math.min(...parsed.map(p => p.nanoseconds));
                        sleep_ns_busy(ns_to_sleep);
                        const results = parsed.map(p => { return { type: "sleep", userdata: p.userdata, error: (ns_to_sleep >= p.nanoseconds) ? wasi.ERRNO_SUCCESS : wasi.ERRNO_AGAIN }; });
                        return write_poll_oneoff(in_subs, out_events, in_nsubs, out_nevents_ptr, results);
                    }
                    catch (e) {
                        debugger;
                        return wasi.ERRNO_NOTCAPABLE;
                    }
                };
                break;
            default:
                i.wasi_snapshot_preview1.poll_oneoff = function poll_oneoff_async(in_subs, out_events, in_nsubs, out_nevents_ptr) {
                    return sleep.asyncify(async () => {
                        try {
                            if (in_nsubs == 0)
                                return wasi.ERRNO_SUCCESS;
                            const parsed = parse_poll_oneoff(in_subs, out_events, in_nsubs, out_nevents_ptr);
                            const ns_to_sleep = Math.min(...parsed.map(p => p.nanoseconds));
                            await sleep_ns_async(ns_to_sleep);
                            const results = parsed.map(p => { return { type: "sleep", userdata: p.userdata, error: (ns_to_sleep >= p.nanoseconds) ? wasi.ERRNO_SUCCESS : wasi.ERRNO_AGAIN }; });
                            return write_poll_oneoff(in_subs, out_events, in_nsubs, out_nevents_ptr, results);
                        }
                        catch (e) {
                            debugger;
                            return wasi.ERRNO_NOTCAPABLE;
                        }
                    }, wasi.ERRNO_ASYNCIFY);
                };
                break;
        }
    }
    wasi.time = time;
})(wasi || (wasi = {}));
var wasi;
(function (wasi) {
    wasi.ADVICE_NORMAL = 0;
    wasi.ADVICE_SEQUENTIAL = 1;
    wasi.ADVICE_RANDOM = 2;
    wasi.ADVICE_WILLNEED = 3;
    wasi.ADVICE_DONTNEED = 4;
    wasi.ADVICE_NOREUSE = 5;
    function advice_validate(advice) {
        if (!((0 <= advice) && (advice <= 5)))
            throw wasi.ERRNO_INVAL;
    }
    wasi.advice_validate = advice_validate;
})(wasi || (wasi = {}));
var wasi;
(function (wasi) {
    wasi.CLOCKID_REALTIME = 0;
    wasi.CLOCKID_MONOTONIC = 1;
    wasi.CLOCKID_PROCESS_CPUTIME_ID = 2;
    wasi.CLOCKID_THREAD_CPUTIME_ID = 3;
    function validate_clockid(id) {
        if (!(0 <= id) && (id <= 3))
            throw wasi.ERRNO_INVAL;
    }
    wasi.validate_clockid = validate_clockid;
})(wasi || (wasi = {}));
var wasi;
(function (wasi) {
    wasi.DIRENT_SIZE = 24;
    wasi.DIRENT_ALIGN = 8;
})(wasi || (wasi = {}));
var wasi;
(function (wasi) {
    wasi.ERRNO_SUCCESS = 0;
    wasi.ERRNO_2BIG = 1;
    wasi.ERRNO_ACCESS = 2;
    wasi.ERRNO_ADDRINUSE = 3;
    wasi.ERRNO_ADDRNOTAVAIL = 4;
    wasi.ERRNO_AFNOSUPPORT = 5;
    wasi.ERRNO_AGAIN = 6;
    wasi.ERRNO_ALREADY = 7;
    wasi.ERRNO_BADF = 8;
    wasi.ERRNO_BADMSG = 9;
    wasi.ERRNO_BUSY = 10;
    wasi.ERRNO_CANCELED = 11;
    wasi.ERRNO_CHILD = 12;
    wasi.ERRNO_CONNABORTED = 13;
    wasi.ERRNO_CONNREFUSED = 14;
    wasi.ERRNO_CONNRESET = 15;
    wasi.ERRNO_DEADLK = 16;
    wasi.ERRNO_DESTADDRREQ = 17;
    wasi.ERRNO_DOM = 18;
    wasi.ERRNO_DQUOT = 19;
    wasi.ERRNO_EXIST = 20;
    wasi.ERRNO_FAULT = 21;
    wasi.ERRNO_FBIG = 22;
    wasi.ERRNO_HOSTUNREACH = 23;
    wasi.ERRNO_IDRM = 24;
    wasi.ERRNO_ILSEQ = 25;
    wasi.ERRNO_INPROGRESS = 26;
    wasi.ERRNO_INTR = 27;
    wasi.ERRNO_INVAL = 28;
    wasi.ERRNO_IO = 29;
    wasi.ERRNO_ISCONN = 30;
    wasi.ERRNO_ISDIR = 31;
    wasi.ERRNO_LOOP = 32;
    wasi.ERRNO_MFILE = 33;
    wasi.ERRNO_MLINK = 34;
    wasi.ERRNO_MSGSIZE = 35;
    wasi.ERRNO_MULTIHOP = 36;
    wasi.ERRNO_NAMETOOLONG = 37;
    wasi.ERRNO_NETDOWN = 38;
    wasi.ERRNO_NETRESET = 39;
    wasi.ERRNO_NETUNREACH = 40;
    wasi.ERRNO_NFILE = 41;
    wasi.ERRNO_NOBUFS = 42;
    wasi.ERRNO_NODEV = 43;
    wasi.ERRNO_NOENT = 44;
    wasi.ERRNO_NOEXEC = 45;
    wasi.ERRNO_NOLCK = 46;
    wasi.ERRNO_NOLINK = 47;
    wasi.ERRNO_NOMEM = 48;
    wasi.ERRNO_NOMSG = 49;
    wasi.ERRNO_NOPROTOOPT = 50;
    wasi.ERRNO_NOSPC = 51;
    wasi.ERRNO_NOSYS = 52;
    wasi.ERRNO_NOTCONN = 53;
    wasi.ERRNO_NOTDIR = 54;
    wasi.ERRNO_NOTEMPTY = 55;
    wasi.ERRNO_NOTRECOVERABLE = 56;
    wasi.ERRNO_NOTSOCK = 57;
    wasi.ERRNO_NOTSUP = 58;
    wasi.ERRNO_NOTTY = 59;
    wasi.ERRNO_NXIO = 60;
    wasi.ERRNO_OVERFLOW = 61;
    wasi.ERRNO_OWNERDEAD = 62;
    wasi.ERRNO_PERM = 63;
    wasi.ERRNO_PIPE = 64;
    wasi.ERRNO_PROTO = 65;
    wasi.ERRNO_PROTONOSUPPORT = 66;
    wasi.ERRNO_PROTOTYPE = 67;
    wasi.ERRNO_RANGE = 68;
    wasi.ERRNO_ROFS = 69;
    wasi.ERRNO_SPIPE = 70;
    wasi.ERRNO_SRCH = 71;
    wasi.ERRNO_STALE = 72;
    wasi.ERRNO_TIMEDOUT = 73;
    wasi.ERRNO_TXTBSY = 74;
    wasi.ERRNO_XDEV = 75;
    wasi.ERRNO_NOTCAPABLE = 76;
    wasi.ERRNO_ASYNCIFY = 9001;
    wasi._ERRNO_RIGHTS_FAILED = wasi.ERRNO_NOTCAPABLE;
    wasi._ERRNO_FUNC_MISSING = wasi.ERRNO_NOTCAPABLE;
    function errno_string(errno) {
        switch (errno) {
            case wasi.ERRNO_SUCCESS: return "SUCCESS";
            case wasi.ERRNO_2BIG: return "2BIG";
            case wasi.ERRNO_ACCESS: return "ACCESS";
            case wasi.ERRNO_ADDRINUSE: return "ADDRINUSE";
            case wasi.ERRNO_ADDRNOTAVAIL: return "ADDRNOTAVAIL";
            case wasi.ERRNO_AFNOSUPPORT: return "AFNOSUPPORT";
            case wasi.ERRNO_AGAIN: return "AGAIN";
            case wasi.ERRNO_ALREADY: return "ALREADY";
            case wasi.ERRNO_BADF: return "BADF";
            case wasi.ERRNO_BADMSG: return "BADMSG";
            case wasi.ERRNO_BUSY: return "BUSY";
            case wasi.ERRNO_CANCELED: return "CANCELED";
            case wasi.ERRNO_CHILD: return "CHILD";
            case wasi.ERRNO_CONNABORTED: return "CONNABORTED";
            case wasi.ERRNO_CONNREFUSED: return "CONNREFUSED";
            case wasi.ERRNO_CONNRESET: return "CONNRESET";
            case wasi.ERRNO_DEADLK: return "DEADLK";
            case wasi.ERRNO_DESTADDRREQ: return "DESTADDRREQ";
            case wasi.ERRNO_DOM: return "DOM";
            case wasi.ERRNO_DQUOT: return "DQUOT";
            case wasi.ERRNO_EXIST: return "EXIST";
            case wasi.ERRNO_FAULT: return "FAULT";
            case wasi.ERRNO_FBIG: return "FBIG";
            case wasi.ERRNO_HOSTUNREACH: return "HOSTUNREACH";
            case wasi.ERRNO_IDRM: return "IDRM";
            case wasi.ERRNO_ILSEQ: return "ILSEQ";
            case wasi.ERRNO_INPROGRESS: return "INPROGRESS";
            case wasi.ERRNO_INTR: return "INTR";
            case wasi.ERRNO_INVAL: return "INVAL";
            case wasi.ERRNO_IO: return "IO";
            case wasi.ERRNO_ISCONN: return "ISCONN";
            case wasi.ERRNO_ISDIR: return "ISDIR";
            case wasi.ERRNO_LOOP: return "LOOP";
            case wasi.ERRNO_MFILE: return "MFILE";
            case wasi.ERRNO_MLINK: return "MLINK";
            case wasi.ERRNO_MSGSIZE: return "MSGSIZE";
            case wasi.ERRNO_MULTIHOP: return "MULTIHOP";
            case wasi.ERRNO_NAMETOOLONG: return "NAMETOOLONG";
            case wasi.ERRNO_NETDOWN: return "NETDOWN";
            case wasi.ERRNO_NETRESET: return "NETRESET";
            case wasi.ERRNO_NETUNREACH: return "NETUNREACH";
            case wasi.ERRNO_NFILE: return "NFILE";
            case wasi.ERRNO_NOBUFS: return "NOBUFS";
            case wasi.ERRNO_NODEV: return "NODEV";
            case wasi.ERRNO_NOENT: return "NOENT";
            case wasi.ERRNO_NOEXEC: return "NOEXEC";
            case wasi.ERRNO_NOLCK: return "NOLCK";
            case wasi.ERRNO_NOLINK: return "NOLINK";
            case wasi.ERRNO_NOMEM: return "NOMEM";
            case wasi.ERRNO_NOMSG: return "NOMSG";
            case wasi.ERRNO_NOPROTOOPT: return "NOPROTOOPT";
            case wasi.ERRNO_NOSPC: return "NOSPC";
            case wasi.ERRNO_NOSYS: return "NOSYS";
            case wasi.ERRNO_NOTCONN: return "NOTCONN";
            case wasi.ERRNO_NOTDIR: return "NOTDIR";
            case wasi.ERRNO_NOTEMPTY: return "NOTEMPTY";
            case wasi.ERRNO_NOTRECOVERABLE: return "NOTRECOVERABLE";
            case wasi.ERRNO_NOTSOCK: return "NOTSOCK";
            case wasi.ERRNO_NOTSUP: return "NOTSUP";
            case wasi.ERRNO_NOTTY: return "NOTTY";
            case wasi.ERRNO_NXIO: return "NXIO";
            case wasi.ERRNO_OVERFLOW: return "OVERFLOW";
            case wasi.ERRNO_OWNERDEAD: return "OWNERDEAD";
            case wasi.ERRNO_PERM: return "PERM";
            case wasi.ERRNO_PIPE: return "PIPE";
            case wasi.ERRNO_PROTO: return "PROTO";
            case wasi.ERRNO_PROTONOSUPPORT: return "PROTONOSUPPORT";
            case wasi.ERRNO_PROTOTYPE: return "PROTOTYPE";
            case wasi.ERRNO_RANGE: return "RANGE";
            case wasi.ERRNO_ROFS: return "ROFS";
            case wasi.ERRNO_SPIPE: return "SPIPE";
            case wasi.ERRNO_SRCH: return "SRCH";
            case wasi.ERRNO_STALE: return "STALE";
            case wasi.ERRNO_TIMEDOUT: return "TIMEDOUT";
            case wasi.ERRNO_TXTBSY: return "TXTBSY";
            case wasi.ERRNO_XDEV: return "XDEV";
            case wasi.ERRNO_NOTCAPABLE: return "NOTCAPABLE";
            case wasi.ERRNO_ASYNCIFY: return "ASYNCIFY";
        }
    }
    wasi.errno_string = errno_string;
})(wasi || (wasi = {}));
var wasi;
(function (wasi) {
    wasi.FDFLAGS_NONE = 0;
    wasi.FDFLAGS_APPEND = (1 << 0);
    wasi.FDFLAGS_DSYNC = (1 << 1);
    wasi.FDFLAGS_NONBLOCK = (1 << 2);
    wasi.FDFLAGS_RSYNC = (1 << 3);
    wasi.FDFLAGS_SYNC = (1 << 4);
})(wasi || (wasi = {}));
var wasi;
(function (wasi) {
    function write_fdstat(memory, ptr, off, fdstat) {
        memory.write_u8(ptr, off + 0, fdstat.filetype);
        memory.write_u16(ptr, off + 2, fdstat.flags);
        memory.write_u64(ptr, off + 8, fdstat.rights_base);
        memory.write_u64(ptr, off + 16, fdstat.rights_inheriting);
    }
    wasi.write_fdstat = write_fdstat;
})(wasi || (wasi = {}));
var wasi;
(function (wasi) {
    function write_filestat(memory, ptr, off, filestat) {
        memory.write_u64(ptr, off + 0, filestat.dev);
        memory.write_u64(ptr, off + 8, filestat.ino);
        memory.write_u8(ptr, off + 16, filestat.filetype);
        memory.write_u64(ptr, off + 24, filestat.nlink);
        memory.write_u64(ptr, off + 32, filestat.size);
        memory.write_u64(ptr, off + 40, filestat.access_time);
        memory.write_u64(ptr, off + 48, filestat.modified_time);
        memory.write_u64(ptr, off + 56, filestat.change_time);
    }
    wasi.write_filestat = write_filestat;
})(wasi || (wasi = {}));
var wasi;
(function (wasi) {
    wasi.FILETYPE_UNKNOWN = 0;
    wasi.FILETYPE_BLOCK_DEVICE = 1;
    wasi.FILETYPE_CHARACTER_DEVICE = 2;
    wasi.FILETYPE_DIRECTORY = 3;
    wasi.FILETYPE_REGULAR_FILE = 4;
    wasi.FILETYPE_SOCKET_DGRAM = 5;
    wasi.FILETYPE_SOCKET_STREAM = 6;
    wasi.FILETYPE_SYMBOLIC_LINK = 7;
})(wasi || (wasi = {}));
var wasi;
(function (wasi) {
    wasi.FSTFLAGS_ATIM = (1 << 0);
    wasi.FSTFLAGS_ATIM_NOW = (1 << 1);
    wasi.FSTFLAGS_MTIM = (1 << 2);
    wasi.FSTFLAGS_MTIM_NOW = (1 << 3);
    function validate_fst_flags(flags) {
        if ((flags & 0xF) !== flags)
            throw wasi.ERRNO_INVAL;
    }
    wasi.validate_fst_flags = validate_fst_flags;
})(wasi || (wasi = {}));
var wasi;
(function (wasi) {
    wasi.LOOKUPFLAGS_SYMLINK_FOLLOW = 1;
})(wasi || (wasi = {}));
var wasi;
(function (wasi) {
    wasi.OFLAGS_NONE = 0;
    wasi.OFLAGS_CREAT = (1 << 0);
    wasi.OFLAGS_DIRECTORY = (1 << 1);
    wasi.OFLAGS_EXCL = (1 << 2);
    wasi.OFLAGS_TRUNC = (1 << 3);
})(wasi || (wasi = {}));
var wasi;
(function (wasi) {
    wasi.RIFLAGS_RECV_PEEK = (1 << 0);
    wasi.RIFLAGS_RECV_WAITALL = (1 << 1);
})(wasi || (wasi = {}));
var wasi;
(function (wasi) {
    function rights(...rights) {
        let r = 0n;
        rights.forEach(r2 => {
            switch (typeof r2) {
                case "bigint":
                    r |= r2;
                    break;
                default:
                    console.error("BUG: invalid rights type");
                    debugger;
                    break;
            }
        });
        return r;
    }
    wasi.rights = rights;
    wasi.RIGHTS_NONE = 0n;
    wasi.RIGHTS_ALL = 0xffffffffffffffffn;
    wasi.RIGHTS_FD_DATASYNC = BigInt(1 << 0);
    wasi.RIGHTS_FD_READ = BigInt(1 << 1);
    wasi.RIGHTS_FD_SEEK = BigInt(1 << 2);
    wasi.RIGHTS_FD_FDSTAT_SET_FLAGS = BigInt(1 << 3);
    wasi.RIGHTS_FD_SYNC = BigInt(1 << 4);
    wasi.RIGHTS_FD_TELL = BigInt(1 << 5);
    wasi.RIGHTS_FD_WRITE = BigInt(1 << 6);
    wasi.RIGHTS_FD_ADVISE = BigInt(1 << 7);
    wasi.RIGHTS_FD_ALLOCATE = BigInt(1 << 8);
    wasi.RIGHTS_PATH_CREATE_DIRECTORY = BigInt(1 << 9);
    wasi.RIGHTS_PATH_CREATE_FILE = BigInt(1 << 10);
    wasi.RIGHTS_PATH_LINK_SOURCE = BigInt(1 << 11);
    wasi.RIGHTS_PATH_LINK_TARGET = BigInt(1 << 12);
    wasi.RIGHTS_PATH_OPEN = BigInt(1 << 13);
    wasi.RIGHTS_FD_READDIR = BigInt(1 << 14);
    wasi.RIGHTS_PATH_READLINK = BigInt(1 << 15);
    wasi.RIGHTS_PATH_RENAME_SOURCE = BigInt(1 << 16);
    wasi.RIGHTS_PATH_RENAME_TARGET = BigInt(1 << 17);
    wasi.RIGHTS_PATH_FILESTAT_GET = BigInt(1 << 18);
    wasi.RIGHTS_PATH_FILESTAT_SET_SIZE = BigInt(1 << 19);
    wasi.RIGHTS_PATH_FILESTAT_SET_TIMES = BigInt(1 << 20);
    wasi.RIGHTS_FD_FILESTAT_GET = BigInt(1 << 21);
    wasi.RIGHTS_FD_FILESTAT_SET_SIZE = BigInt(1 << 22);
    wasi.RIGHTS_FD_FILESTAT_SET_TIMES = BigInt(1 << 23);
    wasi.RIGHTS_PATH_SYMLINK = BigInt(1 << 24);
    wasi.RIGHTS_PATH_REMOVE_DIRECTORY = BigInt(1 << 25);
    wasi.RIGHTS_PATH_UNLINK_FILE = BigInt(1 << 26);
    wasi.RIGHTS_POLL_FD_READWRITE = BigInt(1 << 27);
    wasi.RIGHTS_SOCK_SHUTDOWN = BigInt(1 << 28);
    wasi.RIGHTS_ALL_DIR = rights(wasi.RIGHTS_FD_DATASYNC, wasi.RIGHTS_FD_FDSTAT_SET_FLAGS, wasi.RIGHTS_FD_FILESTAT_GET, wasi.RIGHTS_FD_FILESTAT_SET_TIMES, wasi.RIGHTS_FD_READDIR, wasi.RIGHTS_FD_SYNC, wasi.RIGHTS_PATH_CREATE_DIRECTORY, wasi.RIGHTS_PATH_CREATE_FILE, wasi.RIGHTS_PATH_FILESTAT_GET, wasi.RIGHTS_PATH_FILESTAT_SET_SIZE, wasi.RIGHTS_PATH_FILESTAT_SET_TIMES, wasi.RIGHTS_PATH_LINK_SOURCE, wasi.RIGHTS_PATH_LINK_TARGET, wasi.RIGHTS_PATH_OPEN, wasi.RIGHTS_PATH_READLINK, wasi.RIGHTS_PATH_REMOVE_DIRECTORY, wasi.RIGHTS_PATH_RENAME_SOURCE, wasi.RIGHTS_PATH_RENAME_TARGET, wasi.RIGHTS_PATH_SYMLINK, wasi.RIGHTS_PATH_UNLINK_FILE);
    wasi.RIGHTS_ALL_FILE = rights(wasi.RIGHTS_FD_ADVISE, wasi.RIGHTS_FD_ALLOCATE, wasi.RIGHTS_FD_DATASYNC, wasi.RIGHTS_FD_FDSTAT_SET_FLAGS, wasi.RIGHTS_FD_FILESTAT_GET, wasi.RIGHTS_FD_FILESTAT_SET_SIZE, wasi.RIGHTS_FD_FILESTAT_SET_TIMES, wasi.RIGHTS_FD_READ, wasi.RIGHTS_FD_READDIR, wasi.RIGHTS_FD_SEEK, wasi.RIGHTS_FD_SYNC, wasi.RIGHTS_FD_TELL, wasi.RIGHTS_FD_WRITE, wasi.RIGHTS_POLL_FD_READWRITE);
    wasi.RIGHTS_ALL_PIPE = rights(wasi.RIGHTS_FD_DATASYNC, wasi.RIGHTS_FD_FDSTAT_SET_FLAGS, wasi.RIGHTS_FD_READ, wasi.RIGHTS_FD_SYNC, wasi.RIGHTS_FD_WRITE, wasi.RIGHTS_POLL_FD_READWRITE);
})(wasi || (wasi = {}));
var wasi;
(function (wasi) {
    wasi.ROFLAGS_RECV_DATA_TRUNCATED = (1 << 0);
})(wasi || (wasi = {}));
var wasi;
(function (wasi) {
    wasi.SDFLAGS_NONE = 0;
    wasi.SDFLAGS_RD = (1 << 0);
    wasi.SDFLAGS_WR = (1 << 1);
})(wasi || (wasi = {}));
var wasi;
(function (wasi) {
    wasi.SIFLAGS_NONE = 0;
})(wasi || (wasi = {}));
var wasi;
(function (wasi) {
    wasi.SIGNAL_NONE = 0;
    wasi.SIGNAL_HUP = 1;
    wasi.SIGNAL_INT = 2;
    wasi.SIGNAL_QUIT = 3;
    wasi.SIGNAL_ILL = 4;
    wasi.SIGNAL_TRAP = 5;
    wasi.SIGNAL_ABRT = 6;
    wasi.SIGNAL_BUS = 7;
    wasi.SIGNAL_FPE = 8;
    wasi.SIGNAL_KILL = 9;
    wasi.SIGNAL_USR1 = 10;
    wasi.SIGNAL_SEGV = 11;
    wasi.SIGNAL_USR2 = 12;
    wasi.SIGNAL_PIPE = 13;
    wasi.SIGNAL_ALRM = 14;
    wasi.SIGNAL_TERM = 15;
    wasi.SIGNAL_CHLD = 16;
    wasi.SIGNAL_CONT = 17;
    wasi.SIGNAL_STOP = 18;
    wasi.SIGNAL_TSTP = 19;
    wasi.SIGNAL_TTIN = 20;
    wasi.SIGNAL_TTOU = 21;
    wasi.SIGNAL_URG = 22;
    wasi.SIGNAL_XCPU = 23;
    wasi.SIGNAL_XFSZ = 24;
    wasi.SIGNAL_VTALRM = 25;
    wasi.SIGNAL_PROF = 26;
    wasi.SIGNAL_WINCH = 27;
    wasi.SIGNAL_POLL = 28;
    wasi.SIGNAL_PWR = 29;
    wasi.SIGNAL_SYS = 30;
})(wasi || (wasi = {}));
var wasi;
(function (wasi) {
    wasi.WHENCE_SET = 0;
    wasi.WHENCE_CUR = 1;
    wasi.WHENCE_END = 2;
})(wasi || (wasi = {}));
