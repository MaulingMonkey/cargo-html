"use strict";
const ATOMIC_STDIN_FILLED = 0;
const ATOMIC_STDIN_CONSUMED = 1;
const ATOMIC_COUNT = 2;
const STDIN_BITS = 10;
const STDIN_COUNT = (1 << STDIN_BITS);
const STDIN_MASK = STDIN_COUNT - 1;
function exec_base64_wasm(init, wasm) {
    var memory;
    const stdin = new io.SharedCircularBuffer(init.stdin);
    const ERRNO_SUCCESS = 0;
    const ERRNO_2BIG = 1;
    const ERRNO_BADF = 8;
    const ERRNO_NOTCAPABLE = 76;
    function read_u8(ptr, offset) { return new DataView(memory.buffer).getUint8(ptr + offset); }
    function read_u16(ptr, offset) { return new DataView(memory.buffer).getUint16(ptr + offset, true); }
    function read_u32(ptr, offset) { return new DataView(memory.buffer).getUint32(ptr + offset, true); }
    function read_usize(ptr, offset) { return read_u32(ptr, offset); }
    function read_ptr(ptr, offset) { return read_usize(ptr, offset); }
    function read_u64_approx(ptr, offset) {
        let dv = new DataView(memory.buffer);
        let lo = dv.getUint32(ptr + offset + 0, true);
        let hi = dv.getUint32(ptr + offset + 4, true);
        return (hi * 0x100000000 + lo);
    }
    function read_u64_pair(ptr, offset) {
        let dv = new DataView(memory.buffer);
        let lo = dv.getUint32(ptr + offset + 0, true);
        let hi = dv.getUint32(ptr + offset + 4, true);
        return [lo, hi];
    }
    function write_u8(ptr, offset, value) { new DataView(memory.buffer).setUint8(ptr + offset, value); }
    function write_u16(ptr, offset, value) { new DataView(memory.buffer).setUint16(ptr + offset, value, true); }
    function write_u32(ptr, offset, value) { new DataView(memory.buffer).setUint32(ptr + offset, value, true); }
    function write_usize(ptr, offset, value) { write_u32(ptr, offset, value); }
    function write_ptr(ptr, offset, value) { write_usize(ptr, offset, value); }
    function write_u64_pair(ptr, offset, [lo, hi]) {
        write_u32(ptr, offset + 0, lo);
        write_u32(ptr, offset + 4, hi);
    }
    function slice(ptr, start, end) { return new DataView(memory.buffer, ptr + start, end - start); }
    function slice8(ptr, start, end) { return new Uint8Array(memory.buffer, ptr + start, end - start); }
    function sleep_ms(ms) {
        Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
    }
    function sleep_ns(ns) {
        sleep_ms(ns / 1000 / 1000);
    }
    function nyi() {
        debugger;
        return ERRNO_NOTCAPABLE;
    }
    function args_get() { return nyi(); }
    function args_sizes_get() { return nyi(); }
    function environ_get() { return nyi(); }
    function environ_sizes_get() { return nyi(); }
    function clock_res_get() { return nyi(); }
    function clock_time_get() { return nyi(); }
    function fd_advise() { return nyi(); }
    function fd_allocate() { return nyi(); }
    function fd_close() { return nyi(); }
    function fd_datasync() { return nyi(); }
    function fd_fdstat_get() { return nyi(); }
    function fd_fdstat_set_flags() { return nyi(); }
    function fd_fdstat_set_rights() { return nyi(); }
    function fd_filestat_get() { return nyi(); }
    function fd_filestat_set_size() { return nyi(); }
    function fd_filestat_set_times() { return nyi(); }
    function fd_pread() { return nyi(); }
    function fd_prestat_get() { return nyi(); }
    function fd_prestat_dir_name() { return nyi(); }
    function fd_pwrite() { return nyi(); }
    function fd_read(fd, iovec_array_ptr, iovec_array_len, nread_ptr) {
        var nread = 0;
        var errno = ERRNO_SUCCESS;
        for (var iovec_idx = 0; iovec_idx < iovec_array_len; ++iovec_idx) {
            var buf_ptr = read_ptr(iovec_array_ptr, 8 * iovec_idx + 0);
            var buf_len = read_usize(iovec_array_ptr, 8 * iovec_idx + 4);
            if (buf_len <= 0) {
                continue;
            }
            switch (fd) {
                case 0:
                    let read = stdin.try_read(buf_len);
                    for (var i = 0; i < read.length; ++i) {
                        var b = read[i];
                        work2dom.post({ kind: "console", text: new TextDecoder().decode(new Uint8Array([b])) });
                        write_u8(buf_ptr, i, b);
                    }
                    nread += read.length;
                    if (read.length < buf_len) {
                        write_usize(nread_ptr, 0, nread);
                        return errno;
                    }
                    break;
                default:
                    errno = ERRNO_BADF;
                    break;
            }
        }
        write_usize(nread_ptr, 0, nread);
        return errno;
    }
    function fd_readdir() { return nyi(); }
    function fd_renumber() { return nyi(); }
    function fd_seek() { return nyi(); }
    function fd_sync() { return nyi(); }
    function fd_tell() { return nyi(); }
    function fd_write(fd, ciovec_array_ptr, ciovec_array_len, nwritten_ptr) {
        var nwritten = 0;
        var errno = ERRNO_SUCCESS;
        var text = "";
        for (var ciovec_idx = 0; ciovec_idx < ciovec_array_len; ++ciovec_idx) {
            var buf_ptr = read_ptr(ciovec_array_ptr, 8 * ciovec_idx + 0);
            var buf_len = read_usize(ciovec_array_ptr, 8 * ciovec_idx + 4);
            switch (fd) {
                case 1:
                case 2:
                    text += new TextDecoder().decode(slice(buf_ptr, 0, buf_len));
                    nwritten += buf_len;
                    break;
                default:
                    errno = ERRNO_BADF;
                    break;
            }
        }
        if (text !== "") {
            work2dom.post({ kind: "console", text });
        }
        write_usize(nwritten_ptr, 0, nwritten);
        return errno;
    }
    function path_create_directory() { return nyi(); }
    function path_filestats_get() { return nyi(); }
    function path_filestat_set_times() { return nyi(); }
    function path_link() { return nyi(); }
    function path_open() { return nyi(); }
    function path_readlink() { return nyi(); }
    function path_remove_directory() { return nyi(); }
    function path_rename() { return nyi(); }
    function path_symlink() { return nyi(); }
    function path_unlink_file() { return nyi(); }
    function poll_oneoff(in_subs, out_events, in_nsubs, out_nevents_ptr) {
        let out_nevents = 0;
        write_usize(out_nevents_ptr, 0, out_nevents);
        if (in_nsubs == 0) {
            return ERRNO_SUCCESS;
        }
        if (in_nsubs > 1) {
            nyi();
            return ERRNO_2BIG;
        }
        for (var sub = 0; sub < in_nsubs; ++sub) {
            let sub_base = (in_subs + 48 * sub);
            let userdata = read_u64_pair(sub_base, 0);
            let u_tag = read_u8(sub_base, 8);
            const EVENTTYPE_CLOCK = 0;
            const EVENTTYPE_FD_READ = 1;
            const EVENTTYPE_FD_WRITE = 2;
            if (u_tag !== EVENTTYPE_CLOCK) {
                return nyi();
            }
            let u_u_clock_id = read_u32(sub_base, 16);
            const CLOCKID_REALTIME = 0;
            const CLOCKID_MONOTONIC = 1;
            const CLOCKID_PROCESS_CPUTIME_ID = 2;
            const CLOCKID_THREAD_CPUTIME_ID = 3;
            let u_u_clock_timeout = read_u64_approx(sub_base, 24);
            let u_u_clock_precision = read_u64_approx(sub_base, 32);
            let u_u_clock_flags = read_u16(sub_base, 40);
            const SUBCLOCKFLAGS_SUBSCRIPTION_CLOCK_ABSTIME = 0x1;
            console.assert(u_u_clock_flags === 0, "u_u_clock_flags !== 0 not yet supported");
            let abs = (u_u_clock_flags & SUBCLOCKFLAGS_SUBSCRIPTION_CLOCK_ABSTIME) !== 0;
            if (abs) {
                return nyi();
            }
            else {
                switch (u_u_clock_id) {
                    case CLOCKID_REALTIME:
                    case CLOCKID_MONOTONIC:
                        sleep_ns(u_u_clock_timeout);
                        write_u64_pair(out_events, 32 * out_nevents + 0, userdata);
                        write_u32(out_events, 32 * out_nevents + 8, 0);
                        write_u8(out_events, 32 * out_nevents + 10, u_tag);
                        out_nevents += 1;
                        write_usize(out_nevents_ptr, 0, out_nevents);
                        break;
                    default:
                        return nyi();
                }
            }
        }
        write_usize(out_nevents_ptr, 0, in_nsubs);
        return ERRNO_SUCCESS;
    }
    function proc_exit(code) {
        work2dom.post({ kind: "proc_exit", code });
        throw "exit";
    }
    function proc_raise() { return nyi(); }
    function sched_yield() {
        sleep_ns(1);
        return ERRNO_SUCCESS;
    }
    function random_get(buf, len) {
        if ("crypto" in self) {
            self.crypto.getRandomValues(slice8(buf, 0, len));
        }
        else {
            for (var i = 0; i < len; ++i) {
                write_u8(buf, i, (0xFF & Math.floor(Math.random() * 0x100)));
            }
        }
        return ERRNO_SUCCESS;
    }
    function sock_recv() { return nyi(); }
    function sock_send() { return nyi(); }
    function sock_shutdown() { return nyi(); }
    const imports = {
        wasi_snapshot_preview1: {
            args_get,
            args_sizes_get,
            environ_get,
            environ_sizes_get,
            clock_res_get,
            clock_time_get,
            fd_advise,
            fd_allocate,
            fd_close,
            fd_datasync,
            fd_fdstat_get,
            fd_fdstat_set_flags,
            fd_fdstat_set_rights,
            fd_filestat_get,
            fd_filestat_set_size,
            fd_filestat_set_times,
            fd_pread,
            fd_prestat_get,
            fd_prestat_dir_name,
            fd_pwrite,
            fd_read,
            fd_readdir,
            fd_renumber,
            fd_seek,
            fd_sync,
            fd_tell,
            fd_write,
            path_create_directory,
            path_filestats_get,
            path_filestat_set_times,
            path_link,
            path_open,
            path_readlink,
            path_remove_directory,
            path_rename,
            path_symlink,
            path_unlink_file,
            poll_oneoff,
            proc_exit,
            proc_raise,
            sched_yield,
            random_get,
            sock_recv,
            sock_send,
            sock_shutdown,
        },
    };
    const binary = atob(wasm);
    const typedarray = new Uint8Array(binary.length);
    for (var i = 0; i < binary.length; ++i) {
        typedarray[i] = binary.charCodeAt(i);
    }
    WebAssembly.compile(typedarray).then(function (m) {
        if (false) {
            WebAssembly.Module.imports(m).forEach(function (imp) {
                console.log("import", imp);
            });
            WebAssembly.Module.exports(m).forEach(function (exp) {
                console.log("export", exp);
            });
        }
        return WebAssembly.instantiate(m, imports);
    }).then(function (m) {
        memory = m.exports.memory;
        try {
            m.exports.main();
            proc_exit(0);
        }
        catch (e) {
            if (e !== "exit") {
                console.error(e);
                debugger;
                throw e;
            }
        }
        finally {
            self.close();
        }
    });
}
var main_dom_worker;
function main_dom() {
    const eCon = requireElementById("console");
    const eInput = requireElementById("console-input");
    const eCursor = requireElementById("console-cursor");
    const stdin = new io.SharedCircularBuffer(8192);
    const blob = new Blob(Array.prototype.map.call(document.querySelectorAll('script:not([data-js-worker=\'false\'])'), function (oScript) { return oScript.textContent; }), { type: 'text/javascript' });
    main_dom_worker = new Worker(window.URL.createObjectURL(blob));
    main_dom_worker.onmessage = function (e) {
        switch (e.data.kind) {
            case "console":
                eCon.insertBefore(document.createTextNode(e.data.text), eInput);
                break;
            case "proc_exit":
                var exit = document.createElement("span");
                exit.textContent = `\nprocess exited with code ${e.data.code}`;
                exit.style.color = e.data.code == 0 ? "#888" : "#C44";
                eCon.insertBefore(exit, eInput);
                eCon.removeChild(eCursor);
                break;
            default:
                console.error("unexpected event kind", e.data.kind);
                debugger;
                break;
        }
    };
    dom2work.post({
        kind: "init",
        stdin: stdin.sab,
    });
    const mode = function () { return "linebuffered"; }();
    document.addEventListener("keypress", function (e) {
        var text = e.char || String.fromCharCode(e.charCode);
        if (text === "\r") {
            text = "\n";
        }
        switch (mode) {
            case "raw":
                switch (text) {
                    case "\n":
                    case "\r":
                    case "\t":
                    default:
                        stdin.write_all(text);
                        break;
                }
                break;
            case "linebuffered":
                switch (text) {
                    case "\n":
                    case "\r":
                    case "\t":
                        break;
                    default:
                        eInput.textContent += text;
                        break;
                }
                break;
        }
        e.preventDefault();
        e.stopPropagation();
    });
    document.addEventListener("keydown", function (e) {
        var key = "";
        if (e.ctrlKey)
            key += "Ctrl+";
        if (e.altKey)
            key += "Alt+";
        if (e.shiftKey)
            key += "Shift+";
        key += (e.key || e.code);
        switch (mode) {
            case "raw":
                switch (key) {
                    case "Backspace":
                        stdin.write_all("\x08");
                        break;
                    case "Enter":
                        stdin.write_all("\n");
                        break;
                    case "NumpadEnter":
                        stdin.write_all("\n");
                        break;
                    case "Tab":
                        stdin.write_all("\t");
                        break;
                    case "Esc":
                        stdin.write_all("\x1B");
                        break;
                    case "Escape":
                        stdin.write_all("\x1B");
                        break;
                    default: return;
                }
                break;
            case "linebuffered":
                switch (key) {
                    case "Backspace":
                        if (!!eInput.textContent) {
                            eInput.textContent = eInput.textContent.substr(0, eInput.textContent.length - 1);
                        }
                        break;
                    case "Enter":
                    case "NumpadEnter":
                        var buffer = (eInput.textContent || "") + "\n";
                        eInput.textContent = "";
                        stdin.write_all(buffer);
                        break;
                    case "Tab":
                        eInput.textContent = (eInput.textContent || "") + "\t";
                        break;
                    case "Esc":
                        eInput.textContent = (eInput.textContent || "") + "\x1B";
                        break;
                    case "Escape":
                        eInput.textContent = (eInput.textContent || "") + "\x1B";
                        break;
                    default: return;
                }
                break;
        }
        e.preventDefault();
        e.stopPropagation();
    });
}
function requireElementById(id) {
    let el = document.getElementById(id);
    if (!el) {
        throw `no such element in document: #${id}`;
    }
    return el;
}
function main_worker() {
    self.onmessage = function (e) {
        switch (e.data.kind) {
            case "init":
                exec_base64_wasm(e.data, "{BASE64_WASM32}");
                break;
            default:
                console.error("unexpected event kind", e.data.kind);
                debugger;
                break;
        }
    };
}
var io;
(function (io) {
    const CAN_WAIT = "wait" in Atomics;
    const PRODUCED_IDX = 0;
    const CONSUMED_IDX = 1;
    class SharedCircularBuffer {
        constructor(length_or_existing) {
            if (typeof length_or_existing === "number") {
                const n = length_or_existing;
                console.assert(n === (n | 0), "length isn't an integer");
                console.assert(n > 0, "length must be positive");
                console.assert((n & (n - 1)) === 0, "length must be a power of 2");
                this.sab = new SharedArrayBuffer(n + 8);
            }
            else {
                console.assert(length_or_existing.byteLength > 8);
                this.sab = length_or_existing;
            }
        }
        write_all(data) {
            let bytes;
            if (typeof data === "string") {
                bytes = new TextEncoder().encode(data);
            }
            else {
                bytes = data;
            }
            const atomics = new Int32Array(this.sab, 0, 2);
            const memory = new Uint8Array(this.sab, 8);
            const mask = memory.length - 1;
            let pos = 0;
            let produced = atomics[PRODUCED_IDX];
            while (pos < bytes.length) {
                let consumed = Atomics.load(atomics, CONSUMED_IDX);
                let writeable = memory.length - (produced - consumed) | 0;
                if (writeable === 0) {
                    if (!CAN_WAIT) {
                        if (this.write_overflow === undefined) {
                            this.write_overflow = [];
                            setTimeout(() => {
                                let to_write = this.write_overflow;
                                this.write_overflow = undefined;
                                if (to_write !== undefined) {
                                    this.write_all(to_write);
                                }
                            }, 0);
                        }
                        const n = bytes.length - pos;
                        for (var i = 0; i < n; ++i) {
                            this.write_overflow.push(bytes[pos + i]);
                        }
                        return;
                    }
                    Atomics.wait(atomics, CONSUMED_IDX, consumed);
                    consumed = Atomics.load(atomics, CONSUMED_IDX);
                    writeable = memory.length - (produced - consumed) | 0;
                }
                console.assert(writeable > 0);
                const n = Math.min(writeable, bytes.length - pos);
                for (var i = 0; i < n; ++i) {
                    memory[(produced + i) & mask] = bytes[pos + i];
                }
                pos += n;
                produced = (produced + n) | 0;
                Atomics.store(atomics, PRODUCED_IDX, produced);
                Atomics.notify(atomics, PRODUCED_IDX, +Infinity);
            }
        }
        try_read(max) {
            const atomics = new Int32Array(this.sab, 0, 2);
            const memory = new Uint8Array(this.sab, 8);
            const mask = memory.length - 1;
            let consumed = atomics[CONSUMED_IDX];
            if (CAN_WAIT) {
                Atomics.wait(atomics, PRODUCED_IDX, consumed);
            }
            const produced = Atomics.load(atomics, PRODUCED_IDX);
            const read = Math.min(max, (produced - consumed) | 0);
            const buf = new Uint8Array(read);
            for (let i = 0; i < read; ++i) {
                buf[i] = memory[(consumed + i) & mask];
            }
            consumed = (consumed + read) | 0;
            Atomics.store(atomics, CONSUMED_IDX, consumed);
            Atomics.notify(atomics, CONSUMED_IDX, +Infinity);
            return buf;
        }
    }
    io.SharedCircularBuffer = SharedCircularBuffer;
})(io || (io = {}));
var dom2work;
(function (dom2work) {
    function post(data) {
        main_dom_worker.postMessage(data);
    }
    dom2work.post = post;
})(dom2work || (dom2work = {}));
var work2dom;
(function (work2dom) {
    function post(message) {
        self.postMessage(message);
    }
    work2dom.post = post;
})(work2dom || (work2dom = {}));
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2NyaXB0LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vc2NyaXB0L2NvbnN0YW50cy50cyIsIi4uL3NjcmlwdC9leGVjLXdhc20udHMiLCIuLi9zY3JpcHQvbWFpbi1kb20udHMiLCIuLi9zY3JpcHQvbWFpbi13b3JrZXIudHMiLCIuLi9zY3JpcHQvaW8vU2hhcmVkQ2lyY3VsYXJCdWZmZXIudHMiLCIuLi9zY3JpcHQvbWVzc2FnZXMvZG9tMndvcmsudHMiLCIuLi9zY3JpcHQvbWVzc2FnZXMvd29yazJkb20udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBLE1BQU0sbUJBQW1CLEdBQUssQ0FBQyxDQUFDO0FBQ2hDLE1BQU0scUJBQXFCLEdBQUcsQ0FBQyxDQUFDO0FBQ2hDLE1BQU0sWUFBWSxHQUFHLENBQUMsQ0FBQztBQUV2QixNQUFNLFVBQVUsR0FBRyxFQUFFLENBQUM7QUFDdEIsTUFBTSxXQUFXLEdBQUcsQ0FBQyxDQUFDLElBQUksVUFBVSxDQUFDLENBQUM7QUFDdEMsTUFBTSxVQUFVLEdBQUcsV0FBVyxHQUFDLENBQUMsQ0FBQztBQ05qQyxTQUFTLGdCQUFnQixDQUFDLElBQW1CLEVBQUUsSUFBWTtJQUN2RCxJQUFJLE1BQTJCLENBQUM7SUFXaEMsTUFBTSxLQUFLLEdBQUcsSUFBSSxFQUFFLENBQUMsb0JBQW9CLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDO0lBUXRELE1BQU0sYUFBYSxHQUFjLENBQUMsQ0FBQztJQUNuQyxNQUFNLFVBQVUsR0FBaUIsQ0FBQyxDQUFDO0lBQ25DLE1BQU0sVUFBVSxHQUFpQixDQUFDLENBQUM7SUFDbkMsTUFBTSxnQkFBZ0IsR0FBVyxFQUFFLENBQUM7SUFFcEMsU0FBUyxPQUFPLENBQUksR0FBUSxFQUFFLE1BQWMsSUFBYyxPQUFPLElBQUksUUFBUSxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQyxRQUFRLENBQUUsR0FBRyxHQUFHLE1BQU0sQ0FBYSxDQUFDLENBQUMsQ0FBQztJQUNuSSxTQUFTLFFBQVEsQ0FBRyxHQUFRLEVBQUUsTUFBYyxJQUFjLE9BQU8sSUFBSSxRQUFRLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDLFNBQVMsQ0FBQyxHQUFHLEdBQUcsTUFBTSxFQUFFLElBQUksQ0FBUSxDQUFDLENBQUMsQ0FBQztJQUNwSSxTQUFTLFFBQVEsQ0FBRyxHQUFRLEVBQUUsTUFBYyxJQUFjLE9BQU8sSUFBSSxRQUFRLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDLFNBQVMsQ0FBQyxHQUFHLEdBQUcsTUFBTSxFQUFFLElBQUksQ0FBUSxDQUFDLENBQUMsQ0FBQztJQUNwSSxTQUFTLFVBQVUsQ0FBQyxHQUFRLEVBQUUsTUFBYyxJQUFjLE9BQU8sUUFBUSxDQUFHLEdBQUcsRUFBRSxNQUFNLENBQVEsQ0FBQyxDQUFDLENBQUM7SUFDbEcsU0FBUyxRQUFRLENBQUcsR0FBUSxFQUFFLE1BQWMsSUFBYyxPQUFPLFVBQVUsQ0FBQyxHQUFHLEVBQUUsTUFBTSxDQUFRLENBQUMsQ0FBQyxDQUFDO0lBR2xHLFNBQVMsZUFBZSxDQUFHLEdBQVEsRUFBRSxNQUFjO1FBQy9DLElBQUksRUFBRSxHQUFHLElBQUksUUFBUSxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUNyQyxJQUFJLEVBQUUsR0FBRyxFQUFFLENBQUMsU0FBUyxDQUFDLEdBQUcsR0FBRyxNQUFNLEdBQUcsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDO1FBQzlDLElBQUksRUFBRSxHQUFHLEVBQUUsQ0FBQyxTQUFTLENBQUMsR0FBRyxHQUFHLE1BQU0sR0FBRyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFDOUMsT0FBTyxDQUFDLEVBQUUsR0FBRyxXQUFXLEdBQUcsRUFBRSxDQUFRLENBQUM7SUFDMUMsQ0FBQztJQUVELFNBQVMsYUFBYSxDQUFHLEdBQVEsRUFBRSxNQUFjO1FBQzdDLElBQUksRUFBRSxHQUFHLElBQUksUUFBUSxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUNyQyxJQUFJLEVBQUUsR0FBRyxFQUFFLENBQUMsU0FBUyxDQUFDLEdBQUcsR0FBRyxNQUFNLEdBQUcsQ0FBQyxFQUFFLElBQUksQ0FBUSxDQUFDO1FBQ3JELElBQUksRUFBRSxHQUFHLEVBQUUsQ0FBQyxTQUFTLENBQUMsR0FBRyxHQUFHLE1BQU0sR0FBRyxDQUFDLEVBQUUsSUFBSSxDQUFRLENBQUM7UUFDckQsT0FBTyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQztJQUNwQixDQUFDO0lBRUQsU0FBUyxRQUFRLENBQU8sR0FBUSxFQUFFLE1BQWMsRUFBRSxLQUFTLElBQVMsSUFBSSxRQUFRLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDLFFBQVEsQ0FBRSxHQUFHLEdBQUcsTUFBTSxFQUFFLEtBQUssQ0FBTyxDQUFDLENBQUMsQ0FBQztJQUN2SSxTQUFTLFNBQVMsQ0FBTSxHQUFRLEVBQUUsTUFBYyxFQUFFLEtBQVUsSUFBUSxJQUFJLFFBQVEsQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUMsU0FBUyxDQUFDLEdBQUcsR0FBRyxNQUFNLEVBQUUsS0FBSyxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUN2SSxTQUFTLFNBQVMsQ0FBTSxHQUFRLEVBQUUsTUFBYyxFQUFFLEtBQVUsSUFBUSxJQUFJLFFBQVEsQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUMsU0FBUyxDQUFDLEdBQUcsR0FBRyxNQUFNLEVBQUUsS0FBSyxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUN2SSxTQUFTLFdBQVcsQ0FBSSxHQUFRLEVBQUUsTUFBYyxFQUFFLEtBQVksSUFBTSxTQUFTLENBQUcsR0FBRyxFQUFFLE1BQU0sRUFBRSxLQUFZLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDN0csU0FBUyxTQUFTLENBQU0sR0FBUSxFQUFFLE1BQWMsRUFBRSxLQUFVLElBQVEsV0FBVyxDQUFDLEdBQUcsRUFBRSxNQUFNLEVBQUUsS0FBWSxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQzdHLFNBQVMsY0FB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SUNfU1RESU5fQ09OU1VNRUQgPSAxO1xyXG5jb25zdCBBVE9NSUNfQ09VTlQgPSAyO1xyXG5cclxuY29uc3QgU1RESU5fQklUUyA9IDEwO1xyXG5jb25zdCBTVERJTl9DT1VOVCA9ICgxIDw8IFNURElOX0JJVFMpO1xyXG5jb25zdCBTVERJTl9NQVNLID0gU1RESU5fQ09VTlQtMTtcclxuIiwiZnVuY3Rpb24gZXhlY19iYXNlNjRfd2FzbShpbml0OiBkb20yd29yay5Jbml0LCB3YXNtOiBzdHJpbmcpIHtcclxuICAgIHZhciBtZW1vcnkgOiBXZWJBc3NlbWJseS5NZW1vcnk7XHJcblxyXG4gICAgdHlwZSBGZCAgICAgPSBudW1iZXIgJiB7IF9ub3RfcmVhbDogXCJmZFwiOyB9XHJcbiAgICB0eXBlIEVycm5vICA9IG51bWJlciAmIHsgX25vdF9yZWFsOiBcImVycm5vXCI7IH1cclxuICAgIHR5cGUgcHRyICAgID0gbnVtYmVyICYgeyBfbm90X3JlYWw6IFwicHRyXCI7IH1cclxuICAgIHR5cGUgdTggICAgID0gbnVtYmVyICYgeyBfbm90X3JlYWw6IFwidThcIjsgfVxyXG4gICAgdHlwZSB1MTYgICAgPSBudW1iZXIgJiB7IF9ub3RfcmVhbDogXCJ1MTZcIjsgfVxyXG4gICAgdHlwZSB1MzIgICAgPSBudW1iZXIgJiB7IF9ub3RfcmVhbDogXCJ1MzJcIjsgfVxyXG4gICAgdHlwZSB1NjQgICAgPSBudW1iZXIgJiB7IF9ub3RfcmVhbDogXCJ1NjRcIjsgfSAvLyBYWFg6IG51bWJlciBvbmx5IGhhcyA1MiBiaXRzIG9mIHByZWNpc2lvblxyXG4gICAgdHlwZSB1c2l6ZSAgPSBudW1iZXIgJiB7IF9ub3RfcmVhbDogXCJ1c2l6ZVwiOyB9XHJcblxyXG4gICAgY29uc3Qgc3RkaW4gPSBuZXcgaW8uU2hhcmVkQ2lyY3VsYXJCdWZmZXIoaW5pdC5zdGRpbik7XHJcblxyXG4gICAgLy8gUmVmZXJlbmNlczpcclxuICAgIC8vIGh0dHBzOi8vZG9jcy5ycy93YXNpLXR5cGVzLzAuMS41L3NyYy93YXNpX3R5cGVzL2xpYi5ycy5odG1sXHJcbiAgICAvLyBodHRwczovL2RvY3MucnMvd2FzaS8wLjEwLjIrd2FzaS1zbmFwc2hvdC1wcmV2aWV3MS9zcmMvd2FzaS9saWJfZ2VuZXJhdGVkLnJzLmh0bWxcclxuICAgIC8vIGh0dHBzOi8vZ2l0aHViLmNvbS9XZWJBc3NlbWJseS9XQVNJL2Jsb2IvbWFpbi9waGFzZXMvc25hcHNob3QvZG9jcy5tZFxyXG5cclxuICAgIC8vIGh0dHBzOi8vZG9jcy5ycy93YXNpLzAuMTAuMit3YXNpLXNuYXBzaG90LXByZXZpZXcxL3NyYy93YXNpL2xpYl9nZW5lcmF0ZWQucnMuaHRtbCMyN1xyXG4gICAgY29uc3QgRVJSTk9fU1VDQ0VTUyAgICAgPSA8RXJybm8+MDtcclxuICAgIGNvbnN0IEVSUk5PXzJCSUcgICAgICAgID0gPEVycm5vPjE7XHJcbiAgICBjb25zdCBFUlJOT19CQURGICAgICAgICA9IDxFcnJubz44O1xyXG4gICAgY29uc3QgRVJSTk9fTk9UQ0FQQUJMRSAgPSA8RXJybm8+NzY7XHJcblxyXG4gICAgZnVuY3Rpb24gcmVhZF91OCggICBwdHI6IHB0ciwgb2Zmc2V0OiBudW1iZXIpOiB1OCAgICAgICB7IHJldHVybiBuZXcgRGF0YVZpZXcobWVtb3J5LmJ1ZmZlcikuZ2V0VWludDgoIHB0ciArIG9mZnNldCAgICAgICkgYXMgdTg7IH1cclxuICAgIGZ1bmN0aW9uIHJlYWRfdTE2KCAgcHRyOiBwdHIsIG9mZnNldDogbnVtYmVyKTogdTE2ICAgICAgeyByZXR1cm4gbmV3IERhdGFWaWV3KG1lbW9yeS5idWZmZXIpLmdldFVpbnQxNihwdHIgKyBvZmZzZXQsIHRydWUpIGFzIHUxNjsgfVxyXG4gICAgZnVuY3Rpb24gcmVhZF91MzIoICBwdHI6IHB0ciwgb2Zmc2V0OiBudW1iZXIpOiB1MzIgICAgICB7IHJldHVybiBuZXcgRGF0YVZpZXcobWVtb3J5LmJ1ZmZlcikuZ2V0VWludDMyKHB0ciArIG9mZnNldCwgdHJ1ZSkgYXMgdTMyOyB9XHJcbiAgICBmdW5jdGlvbiByZWFkX3VzaXplKHB0cjogcHRyLCBvZmZzZXQ6IG51bWJlcik6IHVzaXplICAgIHsgcmV0dXJuIHJlYWRfdTMyKCAgcHRyLCBvZmZzZXQpIGFzIGFueTsgfVxyXG4gICAgZnVuY3Rpb24gcmVhZF9wdHIoICBwdHI6IHB0ciwgb2Zmc2V0OiBudW1iZXIpOiBwdHIgICAgICB7IHJldHVybiByZWFkX3VzaXplKHB0ciwgb2Zmc2V0KSBhcyBhbnk7IH1cclxuXHJcbiAgICAvLyBYWFg6IGBudW1iZXJgIG9ubHkgZ3VhcmFudGVlcyA1Mi1iaXQgcHJlY2lzaW9uLCBzbyB0aGlzIGlzIHByZXR0eSBib2d1c1xyXG4gICAgZnVuY3Rpb24gcmVhZF91NjRfYXBwcm94KCAgcHRyOiBwdHIsIG9mZnNldDogbnVtYmVyKTogdTY0IHtcclxuICAgICAgICBsZXQgZHYgPSBuZXcgRGF0YVZpZXcobWVtb3J5LmJ1ZmZlcik7XHJcbiAgICAgICAgbGV0IGxvID0gZHYuZ2V0VWludDMyKHB0ciArIG9mZnNldCArIDAsIHRydWUpO1xyXG4gICAgICAgIGxldCBoaSA9IGR2LmdldFVpbnQzMihwdHIgKyBvZmZzZXQgKyA0LCB0cnVlKTtcclxuICAgICAgICByZXR1cm4gKGhpICogMHgxMDAwMDAwMDAgKyBsbykgYXMgdTY0O1xyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIHJlYWRfdTY0X3BhaXIoICBwdHI6IHB0ciwgb2Zmc2V0OiBudW1iZXIpOiBbdTMyLCB1MzJdIHtcclxuICAgICAgICBsZXQgZHYgPSBuZXcgRGF0YVZpZXcobWVtb3J5LmJ1ZmZlcik7XHJcbiAgICAgICAgbGV0IGxvID0gZHYuZ2V0VWludDMyKHB0ciArIG9mZnNldCArIDAsIHRydWUpIGFzIHUzMjtcclxuICAgICAgICBsZXQgaGkgPSBkdi5nZXRVaW50MzIocHRyICsgb2Zmc2V0ICsgNCwgdHJ1ZSkgYXMgdTMyO1xyXG4gICAgICAgIHJldHVybiBbbG8sIGhpXTtcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiB3cml0ZV91OCggICAgICBwdHI6IHB0ciwgb2Zmc2V0OiBudW1iZXIsIHZhbHVlOiB1OCAgICAgKSB7IG5ldyBEYXRhVmlldyhtZW1vcnkuYnVmZmVyKS5zZXRVaW50OCggcHRyICsgb2Zmc2V0LCB2YWx1ZSAgICAgICk7IH1cclxuICAgIGZ1bmN0aW9uIHdyaXRlX3UxNiggICAgIHB0cjogcHRyLCBvZmZzZXQ6IG51bWJlciwgdmFsdWU6IHUxNiAgICApIHsgbmV3IERhdGFWaWV3KG1lbW9yeS5idWZmZXIpLnNldFVpbnQxNihwdHIgKyBvZmZzZXQsIHZhbHVlLCB0cnVlKTsgfVxyXG4gICAgZnVuY3Rpb24gd3JpdGVfdTMyKCAgICAgcHRyOiBwdHIsIG9mZnNldDogbnVtYmVyLCB2YWx1ZTogdTMyICAgICkgeyBuZXcgRGF0YVZpZXcobWVtb3J5LmJ1ZmZlcikuc2V0VWludDMyKHB0ciArIG9mZnNldCwgdmFsdWUsIHRydWUpOyB9XHJcbiAgICBmdW5jdGlvbiB3cml0ZV91c2l6ZSggICBwdHI6IHB0ciwgb2Zmc2V0OiBudW1iZXIsIHZhbHVlOiB1c2l6ZSAgKSB7IHdyaXRlX3UzMiggIHB0ciwgb2Zmc2V0LCB2YWx1ZSBhcyBhbnkpOyB9XHJcbiAgICBmdW5jdGlvbiB3cml0ZV9wdHIoICAgICBwdHI6IHB0ciwgb2Zmc2V0OiBudW1iZXIsIHZhbHVlOiBwdHIgICAgKSB7IHdyaXRlX3VzaXplKHB0ciwgb2Zmc2V0LCB2YWx1ZSBhcyBhbnkpOyB9XHJcbiAgICBmdW5jdGlvbiB3cml0ZV91NjRfcGFpcihwdHI6IHB0ciwgb2Zmc2V0OiBudW1iZXIsIFtsbywgaGldOiBbdTMyLCB1MzJdKSB7XHJcbiAgICAgICAgd3JpdGVfdTMyKHB0ciwgb2Zmc2V0KzAsIGxvKTtcclxuICAgICAgICB3cml0ZV91MzIocHRyLCBvZmZzZXQrNCwgaGkpO1xyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIHNsaWNlKHB0cjogcHRyLCBzdGFydDogdXNpemUsIGVuZDogdXNpemUpOiBEYXRhVmlldyB7IHJldHVybiBuZXcgRGF0YVZpZXcobWVtb3J5LmJ1ZmZlciwgcHRyK3N0YXJ0LCBlbmQtc3RhcnQpOyB9XHJcbiAgICBmdW5jdGlvbiBzbGljZTgocHRyOiBwdHIsIHN0YXJ0OiB1c2l6ZSwgZW5kOiB1c2l6ZSk6IFVpbnQ4QXJyYXkgeyByZXR1cm4gbmV3IFVpbnQ4QXJyYXkobWVtb3J5LmJ1ZmZlciwgcHRyK3N0YXJ0LCBlbmQtc3RhcnQpOyB9XHJcblxyXG4gICAgZnVuY3Rpb24gc2xlZXBfbXMobXM6IG51bWJlcikge1xyXG4gICAgICAgIEF0b21pY3Mud2FpdChuZXcgSW50MzJBcnJheShuZXcgU2hhcmVkQXJyYXlCdWZmZXIoNCkpLCAwLCAwLCBtcyk7XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gc2xlZXBfbnMobnM6IG51bWJlcikge1xyXG4gICAgICAgIHNsZWVwX21zKG5zIC8gMTAwMCAvIDEwMDApO1xyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIG55aSgpOiBFcnJubyB7XHJcbiAgICAgICAgZGVidWdnZXI7XHJcbiAgICAgICAgcmV0dXJuIEVSUk5PX05PVENBUEFCTEU7XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gYXJnc19nZXQgICAgICAgICAgICAgICAgICAgKCk6IEVycm5vIHsgcmV0dXJuIG55aSgpOyB9XHJcbiAgICBmdW5jdGlvbiBhcmdzX3NpemVzX2dldCAgICAgICAgICAgICAoKTogRXJybm8geyByZXR1cm4gbnlpKCk7IH1cclxuICAgIGZ1bmN0aW9uIGVudmlyb25fZ2V0ICAgICAgICAgICAgICAgICgpOiBFcnJubyB7IHJldHVybiBueWkoKTsgfVxyXG4gICAgZnVuY3Rpb24gZW52aXJvbl9zaXplc19nZXQgICAgICAgICAgKCk6IEVycm5vIHsgcmV0dXJuIG55aSgpOyB9XHJcbiAgICBmdW5jdGlvbiBjbG9ja19yZXNfZ2V0ICAgICAgICAgICAgICAoKTogRXJybm8geyByZXR1cm4gbnlpKCk7IH1cclxuICAgIGZ1bmN0aW9uIGNsb2NrX3RpbWVfZ2V0ICAgICAgICAgICAgICgpOiBFcnJubyB7IHJldHVybiBueWkoKTsgfVxyXG4gICAgZnVuY3Rpb24gZmRfYWR2aXNlICAgICAgICAgICAgICAgICAgKCk6IEVycm5vIHsgcmV0dXJuIG55aSgpOyB9XHJcbiAgICBmdW5jdGlvbiBmZF9hbGxvY2F0ZSAgICAgICAgICAgICAgICAoKTogRXJybm8geyByZXR1cm4gbnlpKCk7IH1cclxuICAgIGZ1bmN0aW9uIGZkX2Nsb3NlICAgICAgICAgICAgICAgICAgICgpOiBFcnJubyB7IHJldHVybiBueWkoKTsgfVxyXG4gICAgZnVuY3Rpb24gZmRfZGF0YXN5bmMgICAgICAgICAgICAgICAgKCk6IEVycm5vIHsgcmV0dXJuIG55aSgpOyB9XHJcbiAgICBmdW5jdGlvbiBmZF9mZHN0YXRfZ2V0ICAgICAgICAgICAgICAoKTogRXJybm8geyByZXR1cm4gbnlpKCk7IH1cclxuICAgIGZ1bmN0aW9uIGZkX2Zkc3RhdF9zZXRfZmxhZ3MgICAgICAgICgpOiBFcnJubyB7IHJldHVybiBueWkoKTsgfVxyXG4gICAgZnVuY3Rpb24gZmRfZmRzdGF0X3NldF9yaWdodHMgICAgICAgKCk6IEVycm5vIHsgcmV0dXJuIG55aSgpOyB9XHJcbiAgICBmdW5jdGlvbiBmZF9maWxlc3RhdF9nZXQgICAgICAgICAgICAoKTogRXJybm8geyByZXR1cm4gbnlpKCk7IH1cclxuICAgIGZ1bmN0aW9uIGZkX2ZpbGVzdGF0X3NldF9zaXplICAgICAgICgpOiBFcnJubyB7IHJldHVybiBueWkoKTsgfVxyXG4gICAgZnVuY3Rpb24gZmRfZmlsZXN0YXRfc2V0X3RpbWVzICAgICAgKCk6IEVycm5vIHsgcmV0dXJuIG55aSgpOyB9XHJcbiAgICBmdW5jdGlvbiBmZF9wcmVhZCAgICAgICAgICAgICAgICAgICAoKTogRXJybm8geyByZXR1cm4gbnlpKCk7IH1cclxuICAgIGZ1bmN0aW9uIGZkX3ByZXN0YXRfZ2V0ICAgICAgICAgICAgICgpOiBFcnJubyB7IHJldHVybiBueWkoKTsgfVxyXG4gICAgZnVuY3Rpb24gZmRfcHJlc3RhdF9kaXJfbmFtZSAgICAgICAgKCk6IEVycm5vIHsgcmV0dXJuIG55aSgpOyB9XHJcbiAgICBmdW5jdGlvbiBmZF9wd3JpdGUgICAgICAgICAgICAgICAgICAoKTogRXJybm8geyByZXR1cm4gbnlpKCk7IH1cclxuXHJcbiAgICBmdW5jdGlvbiBmZF9yZWFkKGZkOiBGZCwgaW92ZWNfYXJyYXlfcHRyOiBwdHIsIGlvdmVjX2FycmF5X2xlbjogdXNpemUsIG5yZWFkX3B0cjogcHRyKTogRXJybm8ge1xyXG4gICAgICAgIC8vIGh0dHBzOi8vZG9jcy5ycy93YXNpLzAuMTAuMit3YXNpLXNuYXBzaG90LXByZXZpZXcxL3NyYy93YXNpL2xpYl9nZW5lcmF0ZWQucnMuaHRtbCMxNzU0XHJcblxyXG4gICAgICAgIHZhciBucmVhZCA9IDA7XHJcbiAgICAgICAgdmFyIGVycm5vID0gRVJSTk9fU1VDQ0VTUztcclxuXHJcbiAgICAgICAgZm9yICh2YXIgaW92ZWNfaWR4ID0gMDsgaW92ZWNfaWR4IDwgaW92ZWNfYXJyYXlfbGVuOyArK2lvdmVjX2lkeCkge1xyXG4gICAgICAgICAgICB2YXIgYnVmX3B0ciA9IHJlYWRfcHRyKGlvdmVjX2FycmF5X3B0ciwgOCAqIGlvdmVjX2lkeCArIDApO1xyXG4gICAgICAgICAgICB2YXIgYnVmX2xlbiA9IHJlYWRfdXNpemUoaW92ZWNfYXJyYXlfcHRyLCA4ICogaW92ZWNfaWR4ICsgNCk7XHJcbiAgICAgICAgICAgIGlmIChidWZfbGVuIDw9IDApIHsgY29udGludWU7IH1cclxuXHJcbiAgICAgICAgICAgIHN3aXRjaCAoZmQpIHtcclxuICAgICAgICAgICAgICAgIGNhc2UgMDogLy8gc3RkaW5cclxuICAgICAgICAgICAgICAgICAgICBsZXQgcmVhZCA9IHN0ZGluLnRyeV9yZWFkKGJ1Zl9sZW4pO1xyXG4gICAgICAgICAgICAgICAgICAgIGZvciAodmFyIGk9MDsgaTxyZWFkLmxlbmd0aDsgKytpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBiID0gcmVhZFtpXSBhcyB1ODtcclxuICAgICAgICAgICAgICAgICAgICAgICAgd29yazJkb20ucG9zdCh7IGtpbmQ6IFwiY29uc29sZVwiLCB0ZXh0OiBuZXcgVGV4dERlY29kZXIoKS5kZWNvZGUobmV3IFVpbnQ4QXJyYXkoW2JdKSkgfSk7IC8vIFhYWDogbG9jYWwgZWNob1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB3cml0ZV91OChidWZfcHRyLCBpLCBiKTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgbnJlYWQgKz0gcmVhZC5sZW5ndGg7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKHJlYWQubGVuZ3RoIDwgYnVmX2xlbikge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB3cml0ZV91c2l6ZShucmVhZF9wdHIsIDAsIG5yZWFkIGFzIHVzaXplKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGVycm5vO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgIGRlZmF1bHQ6XHJcbiAgICAgICAgICAgICAgICAgICAgZXJybm8gPSBFUlJOT19CQURGO1xyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB3cml0ZV91c2l6ZShucmVhZF9wdHIsIDAsIG5yZWFkIGFzIHVzaXplKTtcclxuICAgICAgICByZXR1cm4gZXJybm87XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gZmRfcmVhZGRpciAgICAgICAgICAgICAgICAgKCk6IEVycm5vIHsgcmV0dXJuIG55aSgpOyB9XHJcbiAgICBmdW5jdGlvbiBmZF9yZW51bWJlciAgICAgICAgICAgICAgICAoKTogRXJybm8geyByZXR1cm4gbnlpKCk7IH1cclxuICAgIGZ1bmN0aW9uIGZkX3NlZWsgICAgICAgICAgICAgICAgICAgICgpOiBFcnJubyB7IHJldHVybiBueWkoKTsgfVxyXG4gICAgZnVuY3Rpb24gZmRfc3luYyAgICAgICAgICAgICAgICAgICAgKCk6IEVycm5vIHsgcmV0dXJuIG55aSgpOyB9XHJcbiAgICBmdW5jdGlvbiBmZF90ZWxsICAgICAgICAgICAgICAgICAgICAoKTogRXJybm8geyByZXR1cm4gbnlpKCk7IH1cclxuXHJcbiAgICBmdW5jdGlvbiBmZF93cml0ZShmZDogRmQsIGNpb3ZlY19hcnJheV9wdHI6IHB0ciwgY2lvdmVjX2FycmF5X2xlbjogdXNpemUsIG53cml0dGVuX3B0cjogcHRyKTogRXJybm8ge1xyXG4gICAgICAgIC8vIGh0dHBzOi8vZG9jcy5ycy93YXNpLzAuMTAuMit3YXNpLXNuYXBzaG90LXByZXZpZXcxL3NyYy93YXNpL2xpYl9nZW5lcmF0ZWQucnMuaHRtbCMxNzk2XHJcbiAgICAgICAgLy8gaHR0cHM6Ly9ub2RlanMub3JnL2FwaS93YXNpLmh0bWxcclxuXHJcbiAgICAgICAgdmFyIG53cml0dGVuID0gMDtcclxuICAgICAgICB2YXIgZXJybm8gPSBFUlJOT19TVUNDRVNTO1xyXG5cclxuICAgICAgICB2YXIgdGV4dCA9IFwiXCI7XHJcbiAgICAgICAgZm9yICh2YXIgY2lvdmVjX2lkeCA9IDA7IGNpb3ZlY19pZHggPCBjaW92ZWNfYXJyYXlfbGVuOyArK2Npb3ZlY19pZHgpIHtcclxuICAgICAgICAgICAgdmFyIGJ1Zl9wdHIgPSByZWFkX3B0cihjaW92ZWNfYXJyYXlfcHRyLCA4ICogY2lvdmVjX2lkeCArIDApO1xyXG4gICAgICAgICAgICB2YXIgYnVmX2xlbiA9IHJlYWRfdXNpemUoY2lvdmVjX2FycmF5X3B0ciwgOCAqIGNpb3ZlY19pZHggKyA0KTtcclxuXHJcbiAgICAgICAgICAgIHN3aXRjaCAoZmQpIHtcclxuICAgICAgICAgICAgICAgIGNhc2UgMTogLy8gc3Rkb3V0XHJcbiAgICAgICAgICAgICAgICBjYXNlIDI6IC8vIHN0ZGVyclxyXG4gICAgICAgICAgICAgICAgICAgIHRleHQgKz0gbmV3IFRleHREZWNvZGVyKCkuZGVjb2RlKHNsaWNlKGJ1Zl9wdHIsIDAgYXMgdXNpemUsIGJ1Zl9sZW4pKTtcclxuICAgICAgICAgICAgICAgICAgICBud3JpdHRlbiArPSBidWZfbGVuO1xyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgZGVmYXVsdDpcclxuICAgICAgICAgICAgICAgICAgICBlcnJubyA9IEVSUk5PX0JBREY7XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmICh0ZXh0ICE9PSBcIlwiKSB7XHJcbiAgICAgICAgICAgIHdvcmsyZG9tLnBvc3QoeyBraW5kOiBcImNvbnNvbGVcIiwgdGV4dCB9KTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHdyaXRlX3VzaXplKG53cml0dGVuX3B0ciwgMCwgbndyaXR0ZW4gYXMgdXNpemUpO1xyXG4gICAgICAgIHJldHVybiBlcnJubztcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBwYXRoX2NyZWF0ZV9kaXJlY3RvcnkgICAgICAoKTogRXJybm8geyByZXR1cm4gbnlpKCk7IH1cclxuICAgIGZ1bmN0aW9uIHBhdGhfZmlsZXN0YXRzX2dldCAgICAgICAgICgpOiBFcnJubyB7IHJldHVybiBueWkoKTsgfVxyXG4gICAgZnVuY3Rpb24gcGF0aF9maWxlc3RhdF9zZXRfdGltZXMgICAgKCk6IEVycm5vIHsgcmV0dXJuIG55aSgpOyB9XHJcbiAgICBmdW5jdGlvbiBwYXRoX2xpbmsgICAgICAgICAgICAgICAgICAoKTogRXJybm8geyByZXR1cm4gbnlpKCk7IH1cclxuICAgIGZ1bmN0aW9uIHBhdGhfb3BlbiAgICAgICAgICAgICAgICAgICgpOiBFcnJubyB7IHJldHVybiBueWkoKTsgfVxyXG4gICAgZnVuY3Rpb24gcGF0aF9yZWFkbGluayAgICAgICAgICAgICAgKCk6IEVycm5vIHsgcmV0dXJuIG55aSgpOyB9XHJcbiAgICBmdW5jdGlvbiBwYXRoX3JlbW92ZV9kaXJlY3RvcnkgICAgICAoKTogRXJybm8geyByZXR1cm4gbnlpKCk7IH1cclxuICAgIGZ1bmN0aW9uIHBhdGhfcmVuYW1lICAgICAgICAgICAgICAgICgpOiBFcnJubyB7IHJldHVybiBueWkoKTsgfVxyXG4gICAgZnVuY3Rpb24gcGF0aF9zeW1saW5rICAgICAgICAgICAgICAgKCk6IEVycm5vIHsgcmV0dXJuIG55aSgpOyB9XHJcbiAgICBmdW5jdGlvbiBwYXRoX3VubGlua19maWxlICAgICAgICAgICAoKTogRXJybm8geyByZXR1cm4gbnlpKCk7IH1cclxuXHJcbiAgICBmdW5jdGlvbiBwb2xsX29uZW9mZihpbl9zdWJzOiBwdHIsIG91dF9ldmVudHM6IHB0ciwgaW5fbnN1YnM6IHVzaXplLCBvdXRfbmV2ZW50c19wdHI6IHB0cik6IEVycm5vIHtcclxuICAgICAgICAvLyBodHRwczovL2dpdGh1Yi5jb20vV2ViQXNzZW1ibHkvV0FTSS9ibG9iL21haW4vcGhhc2VzL3NuYXBzaG90L2RvY3MubWQjLXBvbGxfb25lb2ZmaW4tY29uc3Rwb2ludGVyc3Vic2NyaXB0aW9uLW91dC1wb2ludGVyZXZlbnQtbnN1YnNjcmlwdGlvbnMtc2l6ZS0tLWVycm5vLXNpemVcclxuICAgICAgICAvLyBodHRwczovL2RvY3MucnMvd2FzaS8wLjEwLjIrd2FzaS1zbmFwc2hvdC1wcmV2aWV3MS9zcmMvd2FzaS9saWJfZ2VuZXJhdGVkLnJzLmh0bWwjMTg5MlxyXG5cclxuICAgICAgICBsZXQgb3V0X25ldmVudHMgPSAwO1xyXG4gICAgICAgIHdyaXRlX3VzaXplKG91dF9uZXZlbnRzX3B0ciwgMCwgb3V0X25ldmVudHMgYXMgdXNpemUpO1xyXG5cclxuICAgICAgICBpZiAoaW5fbnN1YnMgPT0gMCkgeyByZXR1cm4gRVJSTk9fU1VDQ0VTUzsgfVxyXG4gICAgICAgIGlmIChpbl9uc3VicyA+IDEpIHsgbnlpKCk7IHJldHVybiBFUlJOT18yQklHOyB9XHJcblxyXG4gICAgICAgIGZvciAodmFyIHN1Yj0wOyBzdWI8aW5fbnN1YnM7ICsrc3ViKSB7XHJcbiAgICAgICAgICAgIGxldCBzdWJfYmFzZSA9IChpbl9zdWJzICsgNDggKiBzdWIpIGFzIHB0cjtcclxuXHJcbiAgICAgICAgICAgIGxldCB1c2VyZGF0YSAgICAgICAgPSByZWFkX3U2NF9wYWlyKHN1Yl9iYXNlLCAwKTtcclxuXHJcbiAgICAgICAgICAgIGxldCB1X3RhZyAgICAgICAgICAgPSByZWFkX3U4KCBzdWJfYmFzZSwgOCk7XHJcbiAgICAgICAgICAgIHR5cGUgRXZlbnR0eXBlID0gdTg7XHJcbiAgICAgICAgICAgIGNvbnN0IEVWRU5UVFlQRV9DTE9DSyAgICAgICA9IDxFdmVudHR5cGU+MDtcclxuICAgICAgICAgICAgY29uc3QgRVZFTlRUWVBFX0ZEX1JFQUQgICAgID0gPEV2ZW50dHlwZT4xO1xyXG4gICAgICAgICAgICBjb25zdCBFVkVOVFRZUEVfRkRfV1JJVEUgICAgPSA8RXZlbnR0eXBlPjI7XHJcbiAgICAgICAgICAgIGlmICh1X3RhZyAhPT0gRVZFTlRUWVBFX0NMT0NLKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gbnlpKCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgLy8gNyBieXRlcyBvZiBwYWRkaW5nXHJcblxyXG4gICAgICAgICAgICBsZXQgdV91X2Nsb2NrX2lkICAgID0gcmVhZF91MzIoc3ViX2Jhc2UsIDE2KTtcclxuICAgICAgICAgICAgdHlwZSBDbG9ja2lkID0gdTMyO1xyXG4gICAgICAgICAgICBjb25zdCBDTE9DS0lEX1JFQUxUSU1FICAgICAgICAgICAgICA9IDxDbG9ja2lkPjA7IC8vIFRoZSBjbG9jayBtZWFzdXJpbmcgcmVhbCB0aW1lLiBUaW1lIHZhbHVlIHplcm8gY29ycmVzcG9uZHMgd2l0aCAxOTcwLTAxLTAxVDAwOjAwOjAwWi5cclxuICAgICAgICAgICAgY29uc3QgQ0xPQ0tJRF9NT05PVE9OSUMgICAgICAgICAgICAgPSA8Q2xvY2tpZD4xOyAvLyBUaGUgc3RvcmUtd2lkZSBtb25vdG9uaWMgY2xvY2ssIHdoaWNoIGlzIGRlZmluZWQgYXMgYSBjbG9jayBtZWFzdXJpbmcgcmVhbCB0aW1lLCB3aG9zZSB2YWx1ZSBjYW5ub3QgYmUgYWRqdXN0ZWQgYW5kIHdoaWNoIGNhbm5vdCBoYXZlIG5lZ2F0aXZlIGNsb2NrIGp1bXBzLiBUaGUgZXBvY2ggb2YgdGhpcyBjbG9jayBpcyB1bmRlZmluZWQuIFRoZSBhYnNvbHV0ZSB0aW1lIHZhbHVlIG9mIHRoaXMgY2xvY2sgdGhlcmVmb3JlIGhhcyBubyBtZWFuaW5nLlxyXG4gICAgICAgICAgICBjb25zdCBDTE9DS0lEX1BST0NFU1NfQ1BVVElNRV9JRCAgICA9IDxDbG9ja2lkPjI7XHJcbiAgICAgICAgICAgIGNvbnN0IENMT0NLSURfVEhSRUFEX0NQVVRJTUVfSUQgICAgID0gPENsb2NraWQ+MztcclxuICAgICAgICAgICAgLy8gNCBieXRlcyBvZiBwYWRkaW5nXHJcblxyXG4gICAgICAgICAgICBsZXQgdV91X2Nsb2NrX3RpbWVvdXQgICA9IHJlYWRfdTY0X2FwcHJveChzdWJfYmFzZSwgMjQpO1xyXG4gICAgICAgICAgICBsZXQgdV91X2Nsb2NrX3ByZWNpc2lvbiA9IHJlYWRfdTY0X2FwcHJveChzdWJfYmFzZSwgMzIpO1xyXG5cclxuICAgICAgICAgICAgbGV0IHVfdV9jbG9ja19mbGFncyAgICAgPSByZWFkX3UxNihzdWJfYmFzZSwgNDApO1xyXG4gICAgICAgICAgICBjb25zdCBTVUJDTE9DS0ZMQUdTX1NVQlNDUklQVElPTl9DTE9DS19BQlNUSU1FICA9IDx1MTY+MHgxO1xyXG4gICAgICAgICAgICBjb25zb2xlLmFzc2VydCh1X3VfY2xvY2tfZmxhZ3MgPT09IDAsIFwidV91X2Nsb2NrX2ZsYWdzICE9PSAwIG5vdCB5ZXQgc3VwcG9ydGVkXCIpO1xyXG5cclxuICAgICAgICAgICAgbGV0IGFicyA9ICh1X3VfY2xvY2tfZmxhZ3MgJiBTVUJDTE9DS0ZMQUdTX1NVQlNDUklQVElPTl9DTE9DS19BQlNUSU1FKSAhPT0gMDtcclxuICAgICAgICAgICAgLy8gNiBieXRlcyBvZiBwYWRkaW5nXHJcblxyXG4gICAgICAgICAgICBpZiAoYWJzKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gbnlpKCk7XHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICBzd2l0Y2ggKHVfdV9jbG9ja19pZCkge1xyXG4gICAgICAgICAgICAgICAgICAgIGNhc2UgQ0xPQ0tJRF9SRUFMVElNRTpcclxuICAgICAgICAgICAgICAgICAgICBjYXNlIENMT0NLSURfTU9OT1RPTklDOlxyXG4gICAgICAgICAgICAgICAgICAgICAgICBzbGVlcF9ucyh1X3VfY2xvY2tfdGltZW91dCk7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBodHRwczovL2dpdGh1Yi5jb20vV2ViQXNzZW1ibHkvV0FTSS9ibG9iL21haW4vcGhhc2VzL3NuYXBzaG90L2RvY3MubWQjLWV2ZW50LXN0cnVjdFxyXG4gICAgICAgICAgICAgICAgICAgICAgICB3cml0ZV91NjRfcGFpciggb3V0X2V2ZW50cywgMzIgKiBvdXRfbmV2ZW50cyArICAwLCB1c2VyZGF0YSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHdyaXRlX3UzMiggICAgICBvdXRfZXZlbnRzLCAzMiAqIG91dF9uZXZlbnRzICsgIDgsIDAgYXMgdTMyKTsgLy8gZXJyb3JcclxuICAgICAgICAgICAgICAgICAgICAgICAgd3JpdGVfdTgoICAgICAgIG91dF9ldmVudHMsIDMyICogb3V0X25ldmVudHMgKyAxMCwgdV90YWcpOyAvLyB0eXBlXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIGZkX3JlYWR3cml0ZSBjYW4gYmUgc2tpcHBlZCBmb3IgY2xvY2tzXHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICBvdXRfbmV2ZW50cyArPSAxO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB3cml0ZV91c2l6ZShvdXRfbmV2ZW50c19wdHIsIDAsIG91dF9uZXZlbnRzIGFzIHVzaXplKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICAgICAgZGVmYXVsdDpcclxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIG55aSgpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB3cml0ZV91c2l6ZShvdXRfbmV2ZW50c19wdHIsIDAsIGluX25zdWJzKTtcclxuICAgICAgICByZXR1cm4gRVJSTk9fU1VDQ0VTUztcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBwcm9jX2V4aXQoY29kZTogbnVtYmVyKTogbmV2ZXIge1xyXG4gICAgICAgIC8vIGh0dHBzOi8vZG9jcy5ycy93YXNpLzAuMTAuMit3YXNpLXNuYXBzaG90LXByZXZpZXcxL3NyYy93YXNpL2xpYl9nZW5lcmF0ZWQucnMuaHRtbCMxOTAxXHJcbiAgICAgICAgd29yazJkb20ucG9zdCh7IGtpbmQ6IFwicHJvY19leGl0XCIsIGNvZGUgfSk7XHJcbiAgICAgICAgdGhyb3cgXCJleGl0XCI7XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gcHJvY19yYWlzZSAgICAgICAgICAgICAgICAgKCk6IEVycm5vIHsgcmV0dXJuIG55aSgpOyB9XHJcblxyXG4gICAgZnVuY3Rpb24gc2NoZWRfeWllbGQoKTogRXJybm8ge1xyXG4gICAgICAgIC8vIGh0dHBzOi8vZ2l0aHViLmNvbS9XZWJBc3NlbWJseS9XQVNJL2Jsb2IvbWFpbi9waGFzZXMvc25hcHNob3QvZG9jcy5tZCMtc2NoZWRfeWllbGQtLS1lcnJub1xyXG4gICAgICAgIC8vIGh0dHBzOi8vZG9jcy5ycy93YXNpLzAuMTAuMit3YXNpLXNuYXBzaG90LXByZXZpZXcxL3NyYy93YXNpL2xpYl9nZW5lcmF0ZWQucnMuaHRtbCMxOTA3XHJcbiAgICAgICAgc2xlZXBfbnMoMSk7XHJcbiAgICAgICAgcmV0dXJuIEVSUk5PX1NVQ0NFU1M7XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gcmFuZG9tX2dldChidWY6IHB0ciwgbGVuOiB1c2l6ZSk6IEVycm5vIHtcclxuICAgICAgICAvLyBodHRwczovL2dpdGh1Yi5jb20vV2ViQXNzZW1ibHkvV0FTSS9ibG9iL21haW4vcGhhc2VzL3NuYXBzaG90L2RvY3MubWQjLXJhbmRvbV9nZXRidWYtcG9pbnRlcnU4LWJ1Zl9sZW4tc2l6ZS0tLWVycm5vXHJcbiAgICAgICAgLy8gaHR0cHM6Ly9kb2NzLnJzL3dhc2kvMC4xMC4yK3dhc2ktc25hcHNob3QtcHJldmlldzEvc3JjL3dhc2kvbGliX2dlbmVyYXRlZC5ycy5odG1sIzE5MTRcclxuICAgICAgICBpZiAoXCJjcnlwdG9cIiBpbiBzZWxmKSB7XHJcbiAgICAgICAgICAgIHNlbGYuY3J5cHRvLmdldFJhbmRvbVZhbHVlcyhzbGljZTgoYnVmLCAwIGFzIHVzaXplLCBsZW4pKTtcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICBmb3IgKHZhciBpPTA7IGk8bGVuOyArK2kpIHtcclxuICAgICAgICAgICAgICAgIHdyaXRlX3U4KGJ1ZiwgaSwgKDB4RkYgJiBNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkqMHgxMDApKSBhcyB1OCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIEVSUk5PX1NVQ0NFU1M7XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gc29ja19yZWN2ICAgICAgICAgICAgICAgICAgKCk6IEVycm5vIHsgcmV0dXJuIG55aSgpOyB9XHJcbiAgICBmdW5jdGlvbiBzb2NrX3NlbmQgICAgICAgICAgICAgICAgICAoKTogRXJybm8geyByZXR1cm4gbnlpKCk7IH1cclxuICAgIGZ1bmN0aW9uIHNvY2tfc2h1dGRvd24gICAgICAgICAgICAgICgpOiBFcnJubyB7IHJldHVybiBueWkoKTsgfVxyXG5cclxuICAgIGNvbnN0IGltcG9ydHMgPSB7XHJcbiAgICAgICAgd2FzaV9zbmFwc2hvdF9wcmV2aWV3MToge1xyXG4gICAgICAgICAgICBhcmdzX2dldCxcclxuICAgICAgICAgICAgYXJnc19zaXplc19nZXQsXHJcbiAgICAgICAgICAgIGVudmlyb25fZ2V0LFxyXG4gICAgICAgICAgICBlbnZpcm9uX3NpemVzX2dldCxcclxuICAgICAgICAgICAgY2xvY2tfcmVzX2dldCxcclxuICAgICAgICAgICAgY2xvY2tfdGltZV9nZXQsXHJcbiAgICAgICAgICAgIGZkX2FkdmlzZSxcclxuICAgICAgICAgICAgZmRfYWxsb2NhdGUsXHJcbiAgICAgICAgICAgIGZkX2Nsb3NlLFxyXG4gICAgICAgICAgICBmZF9kYXRhc3luYyxcclxuICAgICAgICAgICAgZmRfZmRzdGF0X2dldCxcclxuICAgICAgICAgICAgZmRfZmRzdGF0X3NldF9mbGFncyxcclxuICAgICAgICAgICAgZmRfZmRzdGF0X3NldF9yaWdodHMsXHJcbiAgICAgICAgICAgIGZkX2ZpbGVzdGF0X2dldCxcclxuICAgICAgICAgICAgZmRfZmlsZXN0YXRfc2V0X3NpemUsXHJcbiAgICAgICAgICAgIGZkX2ZpbGVzdGF0X3NldF90aW1lcyxcclxuICAgICAgICAgICAgZmRfcHJlYWQsXHJcbiAgICAgICAgICAgIGZkX3ByZXN0YXRfZ2V0LFxyXG4gICAgICAgICAgICBmZF9wcmVzdGF0X2Rpcl9uYW1lLFxyXG4gICAgICAgICAgICBmZF9wd3JpdGUsXHJcbiAgICAgICAgICAgIGZkX3JlYWQsXHJcbiAgICAgICAgICAgIGZkX3JlYWRkaXIsXHJcbiAgICAgICAgICAgIGZkX3JlbnVtYmVyLFxyXG4gICAgICAgICAgICBmZF9zZWVrLFxyXG4gICAgICAgICAgICBmZF9zeW5jLFxyXG4gICAgICAgICAgICBmZF90ZWxsLFxyXG4gICAgICAgICAgICBmZF93cml0ZSxcclxuICAgICAgICAgICAgcGF0aF9jcmVhdGVfZGlyZWN0b3J5LFxyXG4gICAgICAgICAgICBwYXRoX2ZpbGVzdGF0c19nZXQsXHJcbiAgICAgICAgICAgIHBhdGhfZmlsZXN0YXRfc2V0X3RpbWVzLFxyXG4gICAgICAgICAgICBwYXRoX2xpbmssXHJcbiAgICAgICAgICAgIHBhdGhfb3BlbixcclxuICAgICAgICAgICAgcGF0aF9yZWFkbGluayxcclxuICAgICAgICAgICAgcGF0aF9yZW1vdmVfZGlyZWN0b3J5LFxyXG4gICAgICAgICAgICBwYXRoX3JlbmFtZSxcclxuICAgICAgICAgICAgcGF0aF9zeW1saW5rLFxyXG4gICAgICAgICAgICBwYXRoX3VubGlua19maWxlLFxyXG4gICAgICAgICAgICBwb2xsX29uZW9mZixcclxuICAgICAgICAgICAgcHJvY19leGl0LFxyXG4gICAgICAgICAgICBwcm9jX3JhaXNlLFxyXG4gICAgICAgICAgICBzY2hlZF95aWVsZCxcclxuICAgICAgICAgICAgcmFuZG9tX2dldCxcclxuICAgICAgICAgICAgc29ja19yZWN2LFxyXG4gICAgICAgICAgICBzb2NrX3NlbmQsXHJcbiAgICAgICAgICAgIHNvY2tfc2h1dGRvd24sXHJcbiAgICAgICAgfSxcclxuICAgIH07XHJcblxyXG4gICAgY29uc3QgYmluYXJ5ID0gYXRvYih3YXNtKTtcclxuICAgIGNvbnN0IHR5cGVkYXJyYXkgPSBuZXcgVWludDhBcnJheShiaW5hcnkubGVuZ3RoKTtcclxuICAgIGZvciAodmFyIGk9MDsgaTxiaW5hcnkubGVuZ3RoOyArK2kpIHsgdHlwZWRhcnJheVtpXSA9IGJpbmFyeS5jaGFyQ29kZUF0KGkpOyB9XHJcblxyXG4gICAgV2ViQXNzZW1ibHkuY29tcGlsZSh0eXBlZGFycmF5KS50aGVuKGZ1bmN0aW9uIChtKSB7XHJcbiAgICAgICAgaWYgKGZhbHNlKSB7XHJcbiAgICAgICAgICAgIFdlYkFzc2VtYmx5Lk1vZHVsZS5pbXBvcnRzKG0pLmZvckVhY2goZnVuY3Rpb24gKGltcCkge1xyXG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJpbXBvcnRcIiwgaW1wKTtcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIFdlYkFzc2VtYmx5Lk1vZHVsZS5leHBvcnRzKG0pLmZvckVhY2goZnVuY3Rpb24gKGV4cCkge1xyXG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJleHBvcnRcIiwgZXhwKTtcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiBXZWJBc3NlbWJseS5pbnN0YW50aWF0ZShtLCBpbXBvcnRzKTtcclxuICAgIH0pLnRoZW4oZnVuY3Rpb24gKG0pIHtcclxuICAgICAgICBtZW1vcnkgPSA8YW55Pm0uZXhwb3J0cy5tZW1vcnk7XHJcbiAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgKG0uZXhwb3J0cy5tYWluIGFzIGFueSkoKTtcclxuICAgICAgICAgICAgcHJvY19leGl0KDApO1xyXG4gICAgICAgIH0gY2F0Y2ggKGUpIHtcclxuICAgICAgICAgICAgaWYgKGUgIT09IFwiZXhpdFwiKSB7XHJcbiAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKGUpO1xyXG4gICAgICAgICAgICAgICAgZGVidWdnZXI7XHJcbiAgICAgICAgICAgICAgICB0aHJvdyBlO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSBmaW5hbGx5IHtcclxuICAgICAgICAgICAgc2VsZi5jbG9zZSgpO1xyXG4gICAgICAgIH1cclxuICAgIH0pO1xyXG59XHJcbiIsInZhciBtYWluX2RvbV93b3JrZXIgOiBXb3JrZXI7XHJcbmZ1bmN0aW9uIG1haW5fZG9tKCkge1xyXG4gICAgY29uc3QgZUNvbiAgICAgID0gcmVxdWlyZUVsZW1lbnRCeUlkKFwiY29uc29sZVwiKTtcclxuICAgIGNvbnN0IGVJbnB1dCAgICA9IHJlcXVpcmVFbGVtZW50QnlJZChcImNvbnNvbGUtaW5wdXRcIik7XHJcbiAgICBjb25zdCBlQ3Vyc29yICAgPSByZXF1aXJlRWxlbWVudEJ5SWQoXCJjb25zb2xlLWN1cnNvclwiKTtcclxuXHJcbiAgICBjb25zdCBzdGRpbiA9IG5ldyBpby5TaGFyZWRDaXJjdWxhckJ1ZmZlcig4MTkyKTtcclxuXHJcbiAgICAvLyBzcGF3biB3ZWIgd29ya2VyXHJcbiAgICBjb25zdCBibG9iID0gbmV3IEJsb2IoPEJsb2JQYXJ0W10+QXJyYXkucHJvdG90eXBlLm1hcC5jYWxsKGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3JBbGwoJ3NjcmlwdDpub3QoW2RhdGEtanMtd29ya2VyPVxcJ2ZhbHNlXFwnXSknKSwgZnVuY3Rpb24gKG9TY3JpcHQpIHsgcmV0dXJuIG9TY3JpcHQudGV4dENvbnRlbnQ7IH0pLHt0eXBlOiAndGV4dC9qYXZhc2NyaXB0J30pO1xyXG4gICAgbWFpbl9kb21fd29ya2VyID0gbmV3IFdvcmtlcih3aW5kb3cuVVJMLmNyZWF0ZU9iamVjdFVSTChibG9iKSk7XHJcbiAgICBtYWluX2RvbV93b3JrZXIub25tZXNzYWdlID0gZnVuY3Rpb24oZTogd29yazJkb20uRXZlbnQpIHtcclxuICAgICAgICBzd2l0Y2ggKGUuZGF0YS5raW5kKSB7XHJcbiAgICAgICAgICAgIGNhc2UgXCJjb25zb2xlXCI6XHJcbiAgICAgICAgICAgICAgICBlQ29uLmluc2VydEJlZm9yZShkb2N1bWVudC5jcmVhdGVUZXh0Tm9kZShlLmRhdGEudGV4dCksIGVJbnB1dCk7XHJcbiAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgY2FzZSBcInByb2NfZXhpdFwiOlxyXG4gICAgICAgICAgICAgICAgdmFyIGV4aXQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwic3BhblwiKTtcclxuICAgICAgICAgICAgICAgIGV4aXQudGV4dENvbnRlbnQgPSBgXFxucHJvY2VzcyBleGl0ZWQgd2l0aCBjb2RlICR7ZS5kYXRhLmNvZGV9YDtcclxuICAgICAgICAgICAgICAgIGV4aXQuc3R5bGUuY29sb3IgPSBlLmRhdGEuY29kZSA9PSAwID8gXCIjODg4XCIgOiBcIiNDNDRcIjtcclxuICAgICAgICAgICAgICAgIGVDb24uaW5zZXJ0QmVmb3JlKGV4aXQsIGVJbnB1dCk7XHJcbiAgICAgICAgICAgICAgICBlQ29uLnJlbW92ZUNoaWxkKGVDdXJzb3IpO1xyXG4gICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIGRlZmF1bHQ6XHJcbiAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKFwidW5leHBlY3RlZCBldmVudCBraW5kXCIsIGUuZGF0YS5raW5kKTtcclxuICAgICAgICAgICAgICAgIGRlYnVnZ2VyO1xyXG4gICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgfVxyXG4gICAgfTtcclxuICAgIGRvbTJ3b3JrLnBvc3Qoe1xyXG4gICAgICAgIGtpbmQ6IFwiaW5pdFwiLFxyXG4gICAgICAgIHN0ZGluOiBzdGRpbi5zYWIsXHJcbiAgICB9KTtcclxuXHJcbiAgICB0eXBlIE1vZGUgPSBcInJhd1wiIHwgXCJsaW5lYnVmZmVyZWRcIjtcclxuICAgIGNvbnN0IG1vZGUgPSBmdW5jdGlvbigpOiBNb2RlIHsgcmV0dXJuIFwibGluZWJ1ZmZlcmVkXCI7IH0oKTtcclxuICAgIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoXCJrZXlwcmVzc1wiLCBmdW5jdGlvbihlKSB7XHJcbiAgICAgICAgdmFyIHRleHQgPSBlLmNoYXIgfHwgU3RyaW5nLmZyb21DaGFyQ29kZShlLmNoYXJDb2RlKTtcclxuICAgICAgICBpZiAodGV4dCA9PT0gXCJcXHJcIikgeyB0ZXh0ID0gXCJcXG5cIjsgfVxyXG4gICAgICAgIHN3aXRjaCAobW9kZSkge1xyXG4gICAgICAgICAgICBjYXNlIFwicmF3XCI6XHJcbiAgICAgICAgICAgICAgICBzd2l0Y2ggKHRleHQpIHtcclxuICAgICAgICAgICAgICAgICAgICBjYXNlIFwiXFxuXCI6XHJcbiAgICAgICAgICAgICAgICAgICAgY2FzZSBcIlxcclwiOlxyXG4gICAgICAgICAgICAgICAgICAgIGNhc2UgXCJcXHRcIjpcclxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gc2hvdWxkJ3ZlIGFscmVhZHkgYmVlbiBoYW5kbGVkIGJ5IGtleWRvd24gZXZlbnRcclxuICAgICAgICAgICAgICAgICAgICBkZWZhdWx0OlxyXG4gICAgICAgICAgICAgICAgICAgICAgICBzdGRpbi53cml0ZV9hbGwodGV4dCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIGNhc2UgXCJsaW5lYnVmZmVyZWRcIjpcclxuICAgICAgICAgICAgICAgIHN3aXRjaCAodGV4dCkge1xyXG4gICAgICAgICAgICAgICAgICAgIGNhc2UgXCJcXG5cIjpcclxuICAgICAgICAgICAgICAgICAgICBjYXNlIFwiXFxyXCI6XHJcbiAgICAgICAgICAgICAgICAgICAgY2FzZSBcIlxcdFwiOlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBzaG91bGQndmUgYWxyZWFkeSBiZWVuIGhhbmRsZWQgYnkga2V5ZG93biBldmVudFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgICAgICBkZWZhdWx0OlxyXG4gICAgICAgICAgICAgICAgICAgICAgICBlSW5wdXQudGV4dENvbnRlbnQgKz0gdGV4dDtcclxuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICB9XHJcbiAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xyXG4gICAgICAgIGUuc3RvcFByb3BhZ2F0aW9uKCk7XHJcbiAgICB9KTtcclxuICAgIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoXCJrZXlkb3duXCIsIGZ1bmN0aW9uKGUpIHtcclxuICAgICAgICB2YXIga2V5ID0gXCJcIjtcclxuICAgICAgICBpZiAoZS5jdHJsS2V5ICAgKSBrZXkgKz0gXCJDdHJsK1wiO1xyXG4gICAgICAgIGlmIChlLmFsdEtleSAgICApIGtleSArPSBcIkFsdCtcIjtcclxuICAgICAgICBpZiAoZS5zaGlmdEtleSAgKSBrZXkgKz0gXCJTaGlmdCtcIjtcclxuICAgICAgICBrZXkgKz0gKGUua2V5IHx8IGUuY29kZSk7XHJcblxyXG4gICAgICAgIHN3aXRjaCAobW9kZSkge1xyXG4gICAgICAgICAgICBjYXNlIFwicmF3XCI6XHJcbiAgICAgICAgICAgICAgICBzd2l0Y2ggKGtleSkge1xyXG4gICAgICAgICAgICAgICAgICAgIGNhc2UgXCJCYWNrc3BhY2VcIjogICBzdGRpbi53cml0ZV9hbGwoXCJcXHgwOFwiKTsgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICAgICAgY2FzZSBcIkVudGVyXCI6ICAgICAgIHN0ZGluLndyaXRlX2FsbChcIlxcblwiKTsgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICAgICAgY2FzZSBcIk51bXBhZEVudGVyXCI6IHN0ZGluLndyaXRlX2FsbChcIlxcblwiKTsgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICAgICAgY2FzZSBcIlRhYlwiOiAgICAgICAgIHN0ZGluLndyaXRlX2FsbChcIlxcdFwiKTsgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICAgICAgY2FzZSBcIkVzY1wiOiAgICAgICAgIHN0ZGluLndyaXRlX2FsbChcIlxceDFCXCIpOyBicmVhaztcclxuICAgICAgICAgICAgICAgICAgICBjYXNlIFwiRXNjYXBlXCI6ICAgICAgc3RkaW4ud3JpdGVfYWxsKFwiXFx4MUJcIik7IGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgICAgIGRlZmF1bHQ6ICAgICAgICAgICAgcmV0dXJuOyAvLyBwcm9jZXNzIG5vIGZ1cnRoZXJcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICBjYXNlIFwibGluZWJ1ZmZlcmVkXCI6XHJcbiAgICAgICAgICAgICAgICBzd2l0Y2ggKGtleSkge1xyXG4gICAgICAgICAgICAgICAgICAgIGNhc2UgXCJCYWNrc3BhY2VcIjpcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCEhZUlucHV0LnRleHRDb250ZW50KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBlSW5wdXQudGV4dENvbnRlbnQgPSBlSW5wdXQudGV4dENvbnRlbnQuc3Vic3RyKDAsIGVJbnB1dC50ZXh0Q29udGVudC5sZW5ndGgtMSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gZWxzZSBUT0RPOiBzb21lIGtpbmQgb2YgYWxlcnQ/XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgICAgIGNhc2UgXCJFbnRlclwiOlxyXG4gICAgICAgICAgICAgICAgICAgIGNhc2UgXCJOdW1wYWRFbnRlclwiOlxyXG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgYnVmZmVyID0gKGVJbnB1dC50ZXh0Q29udGVudCB8fCBcIlwiKSArIFwiXFxuXCI7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGVJbnB1dC50ZXh0Q29udGVudCA9IFwiXCI7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHN0ZGluLndyaXRlX2FsbChidWZmZXIpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgICAgICBjYXNlIFwiVGFiXCI6ICAgICBlSW5wdXQudGV4dENvbnRlbnQgPSAoZUlucHV0LnRleHRDb250ZW50IHx8IFwiXCIpICsgXCJcXHRcIjsgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICAgICAgY2FzZSBcIkVzY1wiOiAgICAgZUlucHV0LnRleHRDb250ZW50ID0gKGVJbnB1dC50ZXh0Q29udGVudCB8fCBcIlwiKSArIFwiXFx4MUJcIjsgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICAgICAgY2FzZSBcIkVzY2FwZVwiOiAgZUlucHV0LnRleHRDb250ZW50ID0gKGVJbnB1dC50ZXh0Q29udGVudCB8fCBcIlwiKSArIFwiXFx4MUJcIjsgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICAgICAgZGVmYXVsdDogICAgICAgIHJldHVybjsgLy8gcHJvY2VzcyBubyBmdXJ0aGVyXHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICB9XHJcbiAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xyXG4gICAgICAgIGUuc3RvcFByb3BhZ2F0aW9uKCk7XHJcbiAgICB9KTtcclxufVxyXG5cclxuZnVuY3Rpb24gcmVxdWlyZUVsZW1lbnRCeUlkKGlkOiBzdHJpbmcpOiBIVE1MRWxlbWVudCB7XHJcbiAgICBsZXQgZWwgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChpZCk7XHJcbiAgICBpZiAoIWVsKSB7IHRocm93IGBubyBzdWNoIGVsZW1lbnQgaW4gZG9jdW1lbnQ6ICMke2lkfWA7IH1cclxuICAgIHJldHVybiBlbDtcclxufVxyXG4iLCJmdW5jdGlvbiBtYWluX3dvcmtlcigpIHtcclxuICAgIHNlbGYub25tZXNzYWdlID0gZnVuY3Rpb24oZTogZG9tMndvcmsuRXZlbnQpIHtcclxuICAgICAgICBzd2l0Y2ggKGUuZGF0YS5raW5kKSB7XHJcbiAgICAgICAgICAgIGNhc2UgXCJpbml0XCI6XHJcbiAgICAgICAgICAgICAgICBleGVjX2Jhc2U2NF93YXNtKGUuZGF0YSwgXCJ7QkFTRTY0X1dBU00zMn1cIik7XHJcbiAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgZGVmYXVsdDpcclxuICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoXCJ1bmV4cGVjdGVkIGV2ZW50IGtpbmRcIiwgZS5kYXRhLmtpbmQpO1xyXG4gICAgICAgICAgICAgICAgZGVidWdnZXI7XHJcbiAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICB9XHJcbiAgICB9O1xyXG59XHJcbiIsIm5hbWVzcGFjZSBpbyB7XHJcbiAgICBjb25zdCBDQU5fV0FJVCAgICAgID0gXCJ3YWl0XCIgaW4gQXRvbWljcztcclxuICAgIGNvbnN0IFBST0RVQ0VEX0lEWCAgPSAwO1xyXG4gICAgY29uc3QgQ09OU1VNRURfSURYICA9IDE7XHJcblxyXG4gICAgZXhwb3J0IGNsYXNzIFNoYXJlZENpcmN1bGFyQnVmZmVyIHtcclxuICAgICAgICByZWFkb25seSBzYWI6IFNoYXJlZEFycmF5QnVmZmVyO1xyXG4gICAgICAgIHdyaXRlX292ZXJmbG93PzogbnVtYmVyW107XHJcblxyXG4gICAgICAgIGNvbnN0cnVjdG9yKGxlbmd0aF9vcl9leGlzdGluZzogbnVtYmVyIHwgU2hhcmVkQXJyYXlCdWZmZXIpIHtcclxuICAgICAgICAgICAgaWYgKHR5cGVvZiBsZW5ndGhfb3JfZXhpc3RpbmcgPT09IFwibnVtYmVyXCIpIHtcclxuICAgICAgICAgICAgICAgIGNvbnN0IG4gPSBsZW5ndGhfb3JfZXhpc3Rpbmc7XHJcbiAgICAgICAgICAgICAgICBjb25zb2xlLmFzc2VydChuID09PSAobnwwKSwgXCJsZW5ndGggaXNuJ3QgYW4gaW50ZWdlclwiKTtcclxuICAgICAgICAgICAgICAgIGNvbnNvbGUuYXNzZXJ0KG4gPiAwLCBcImxlbmd0aCBtdXN0IGJlIHBvc2l0aXZlXCIpO1xyXG4gICAgICAgICAgICAgICAgY29uc29sZS5hc3NlcnQoKG4gJiAobi0xKSkgPT09IDAsIFwibGVuZ3RoIG11c3QgYmUgYSBwb3dlciBvZiAyXCIpO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5zYWIgPSBuZXcgU2hhcmVkQXJyYXlCdWZmZXIobiArIDgpO1xyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgY29uc29sZS5hc3NlcnQobGVuZ3RoX29yX2V4aXN0aW5nLmJ5dGVMZW5ndGggPiA4KTtcclxuICAgICAgICAgICAgICAgIHRoaXMuc2FiID0gbGVuZ3RoX29yX2V4aXN0aW5nO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvLyBtYXkgYmxvY2sgaWYgdGhlIGJ1ZmZlciBpcyBmdWxsXHJcbiAgICAgICAgd3JpdGVfYWxsKGRhdGE6IFVpbnQ4QXJyYXkgfCBudW1iZXJbXSB8IHN0cmluZykge1xyXG4gICAgICAgICAgICBsZXQgYnl0ZXMgOiBVaW50OEFycmF5IHwgbnVtYmVyW107XHJcbiAgICAgICAgICAgIGlmICh0eXBlb2YgZGF0YSA9PT0gXCJzdHJpbmdcIikge1xyXG4gICAgICAgICAgICAgICAgYnl0ZXMgPSBuZXcgVGV4dEVuY29kZXIoKS5lbmNvZGUoZGF0YSk7XHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICBieXRlcyA9IGRhdGE7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGNvbnN0IGF0b21pY3MgICA9IG5ldyBJbnQzMkFycmF5KHRoaXMuc2FiLCAwLCAyKTtcclxuICAgICAgICAgICAgY29uc3QgbWVtb3J5ICAgID0gbmV3IFVpbnQ4QXJyYXkodGhpcy5zYWIsIDgpO1xyXG4gICAgICAgICAgICBjb25zdCBtYXNrICAgICAgPSBtZW1vcnkubGVuZ3RoLTE7XHJcblxyXG4gICAgICAgICAgICBsZXQgcG9zID0gMDtcclxuICAgICAgICAgICAgbGV0IHByb2R1Y2VkID0gYXRvbWljc1tQUk9EVUNFRF9JRFhdO1xyXG4gICAgICAgICAgICB3aGlsZSAocG9zIDwgYnl0ZXMubGVuZ3RoKSB7XHJcbiAgICAgICAgICAgICAgICAvLyB3YWl0IGZvciBmcmVlIHNwYWNlXHJcbiAgICAgICAgICAgICAgICBsZXQgY29uc3VtZWQgPSBBdG9taWNzLmxvYWQoYXRvbWljcywgQ09OU1VNRURfSURYKTtcclxuICAgICAgICAgICAgICAgIGxldCB3cml0ZWFibGUgPSBtZW1vcnkubGVuZ3RoIC0gKHByb2R1Y2VkIC0gY29uc3VtZWQpfDA7XHJcbiAgICAgICAgICAgICAgICBpZiAod3JpdGVhYmxlID09PSAwKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKCFDQU5fV0FJVCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAodGhpcy53cml0ZV9vdmVyZmxvdyA9PT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLndyaXRlX292ZXJmbG93ID0gW107XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBsZXQgdG9fd3JpdGUgPSB0aGlzLndyaXRlX292ZXJmbG93O1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMud3JpdGVfb3ZlcmZsb3cgPSB1bmRlZmluZWQ7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHRvX3dyaXRlICE9PSB1bmRlZmluZWQpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy53cml0ZV9hbGwodG9fd3JpdGUpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0sIDApO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBuID0gYnl0ZXMubGVuZ3RoLXBvcztcclxuICAgICAgICAgICAgICAgICAgICAgICAgZm9yICh2YXIgaT0wOyBpPG47ICsraSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy53cml0ZV9vdmVyZmxvdy5wdXNoKGJ5dGVzW3BvcytpXSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICBBdG9taWNzLndhaXQoYXRvbWljcywgQ09OU1VNRURfSURYLCBjb25zdW1lZCk7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3VtZWQgPSBBdG9taWNzLmxvYWQoYXRvbWljcywgQ09OU1VNRURfSURYKTtcclxuICAgICAgICAgICAgICAgICAgICB3cml0ZWFibGUgPSBtZW1vcnkubGVuZ3RoIC0gKHByb2R1Y2VkIC0gY29uc3VtZWQpfDA7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBjb25zb2xlLmFzc2VydCh3cml0ZWFibGUgPiAwKTtcclxuXHJcbiAgICAgICAgICAgICAgICAvLyB3cml0ZSBkYXRhXHJcbiAgICAgICAgICAgICAgICBjb25zdCBuID0gTWF0aC5taW4od3JpdGVhYmxlLCBieXRlcy5sZW5ndGgtcG9zKTtcclxuICAgICAgICAgICAgICAgIGZvciAodmFyIGk9MDsgaTxuOyArK2kpIHtcclxuICAgICAgICAgICAgICAgICAgICBtZW1vcnlbKHByb2R1Y2VkK2kpJm1hc2tdID0gYnl0ZXNbcG9zK2ldO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgcG9zICs9IG47XHJcbiAgICAgICAgICAgICAgICBwcm9kdWNlZCA9IChwcm9kdWNlZCArIG4pfDA7XHJcbiAgICAgICAgICAgICAgICBBdG9taWNzLnN0b3JlKGF0b21pY3MsIFBST0RVQ0VEX0lEWCwgcHJvZHVjZWQpO1xyXG4gICAgICAgICAgICAgICAgQXRvbWljcy5ub3RpZnkoYXRvbWljcywgUFJPRFVDRURfSURYLCArSW5maW5pdHkpOyAvLyBvbmx5IG5lY2Vzc2FyeSBpZiB0YWxraW5nIHRvIGFub3RoZXIgd29ya2VyIHRocmVhZCwgYnV0IGhhcm1sZXNzIGlmIHRhbGtpbmcgdG8gYSBET00gdGhyZWFkXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIG1heSByZXR1cm4gMCBieXRlcyBpbiBET00vVUkgdGhyZWFkc1xyXG4gICAgICAgIHRyeV9yZWFkKG1heDogbnVtYmVyKTogVWludDhBcnJheSB7XHJcbiAgICAgICAgICAgIGNvbnN0IGF0b21pY3MgICA9IG5ldyBJbnQzMkFycmF5KHRoaXMuc2FiLCAwLCAyKTtcclxuICAgICAgICAgICAgY29uc3QgbWVtb3J5ICAgID0gbmV3IFVpbnQ4QXJyYXkodGhpcy5zYWIsIDgpO1xyXG4gICAgICAgICAgICBjb25zdCBtYXNrICAgICAgPSBtZW1vcnkubGVuZ3RoLTE7XHJcblxyXG4gICAgICAgICAgICBsZXQgY29uc3VtZWQgPSBhdG9taWNzW0NPTlNVTUVEX0lEWF07XHJcbiAgICAgICAgICAgIGlmIChDQU5fV0FJVCkgeyBBdG9taWNzLndhaXQoYXRvbWljcywgUFJPRFVDRURfSURYLCBjb25zdW1lZCk7IH1cclxuICAgICAgICAgICAgY29uc3QgcHJvZHVjZWQgPSBBdG9taWNzLmxvYWQoYXRvbWljcywgUFJPRFVDRURfSURYKTtcclxuICAgICAgICAgICAgY29uc3QgcmVhZCA9IE1hdGgubWluKG1heCwgKHByb2R1Y2VkLWNvbnN1bWVkKXwwKTtcclxuICAgICAgICAgICAgY29uc3QgYnVmID0gbmV3IFVpbnQ4QXJyYXkocmVhZCk7XHJcbiAgICAgICAgICAgIGZvciAobGV0IGk9MDsgaTxyZWFkOyArK2kpIHtcclxuICAgICAgICAgICAgICAgIGJ1ZltpXSA9IG1lbW9yeVsoY29uc3VtZWQraSkmbWFza107XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgY29uc3VtZWQgPSAoY29uc3VtZWQgKyByZWFkKXwwO1xyXG4gICAgICAgICAgICBBdG9taWNzLnN0b3JlKGF0b21pY3MsIENPTlNVTUVEX0lEWCwgY29uc3VtZWQpO1xyXG4gICAgICAgICAgICBBdG9taWNzLm5vdGlmeShhdG9taWNzLCBDT05TVU1FRF9JRFgsICtJbmZpbml0eSk7IC8vIG9ubHkgbmVjZXNzYXJ5IGlmIHRhbGtpbmcgdG8gYW5vdGhlciB3b3JrZXIgdGhyZWFkLCBidXQgaGFybWxlc3MgaWYgdGFsa2luZyB0byBhIERPTSB0aHJlYWRcclxuICAgICAgICAgICAgcmV0dXJuIGJ1ZjtcclxuICAgICAgICB9XHJcbiAgICB9XHJcbn1cclxuIiwibmFtZXNwYWNlIGRvbTJ3b3JrIHtcclxuICAgIGV4cG9ydCBpbnRlcmZhY2UgSW5pdCB7XHJcbiAgICAgICAga2luZDogICBcImluaXRcIjtcclxuICAgICAgICBzdGRpbjogIFNoYXJlZEFycmF5QnVmZmVyLFxyXG4gICAgfVxyXG5cclxuICAgIGludGVyZmFjZSBPdGhlciB7XHJcbiAgICAgICAga2luZDogXCJfb3RoZXJcIjtcclxuICAgIH1cclxuXHJcbiAgICB0eXBlIERhdGEgPSBJbml0IHwgT3RoZXI7XHJcblxyXG4gICAgZXhwb3J0IGludGVyZmFjZSBFdmVudCBleHRlbmRzIE1lc3NhZ2VFdmVudCB7XHJcbiAgICAgICAgcmVhZG9ubHkgZGF0YTogRGF0YTtcclxuICAgIH1cclxuXHJcbiAgICBleHBvcnQgZnVuY3Rpb24gcG9zdChkYXRhOiBEYXRhKSB7XHJcbiAgICAgICAgbWFpbl9kb21fd29ya2VyLnBvc3RNZXNzYWdlKGRhdGEpO1xyXG4gICAgfVxyXG59XHJcbiIsIm5hbWVzcGFjZSB3b3JrMmRvbSB7XHJcbiAgICBpbnRlcmZhY2UgQ29uc29sZSB7XHJcbiAgICAgICAga2luZDogICBcImNvbnNvbGVcIjtcclxuICAgICAgICB0ZXh0OiAgIHN0cmluZztcclxuICAgIH1cclxuXHJcbiAgICBpbnRlcmZhY2UgUHJvY0V4aXQge1xyXG4gICAgICAgIGtpbmQ6ICAgXCJwcm9jX2V4aXRcIjtcclxuICAgICAgICBjb2RlOiAgIG51bWJlcjtcclxuICAgIH1cclxuXHJcbiAgICBpbnRlcmZhY2UgT3RoZXIge1xyXG4gICAgICAgIGtpbmQ6ICAgXCJfb3RoZXJcIjtcclxuICAgIH1cclxuXHJcbiAgICB0eXBlIERhdGEgPSBDb25zb2xlIHwgUHJvY0V4aXQgfCBPdGhlcjtcclxuXHJcbiAgICBleHBvcnQgaW50ZXJmYWNlIEV2ZW50IGV4dGVuZHMgTWVzc2FnZUV2ZW50IHtcclxuICAgICAgICByZWFkb25seSBkYXRhOiBEYXRhO1xyXG4gICAgfVxyXG5cclxuICAgIGV4cG9ydCBmdW5jdGlvbiBwb3N0KG1lc3NhZ2U6IERhdGEpIHtcclxuICAgICAgICAvLyBodHRwczovL2RldmVsb3Blci5tb3ppbGxhLm9yZy9lbi1VUy9kb2NzL1dlYi9BUEkvRGVkaWNhdGVkV29ya2VyR2xvYmFsU2NvcGUvcG9zdE1lc3NhZ2Ugbm90XHJcbiAgICAgICAgLy8gaHR0cHM6Ly9kZXZlbG9wZXIubW96aWxsYS5vcmcvZW4tVVMvZG9jcy9XZWIvQVBJL1dpbmRvdy9wb3N0TWVzc2FnZVxyXG4gICAgICAgIChzZWxmIGFzIGFueSkucG9zdE1lc3NhZ2UobWVzc2FnZSk7XHJcbiAgICB9XHJcbn1cclxuIl19