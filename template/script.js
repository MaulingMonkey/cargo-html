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
    const eCursor = requireElementById("cursor");
    const stdin = new io.SharedCircularBuffer(8192);
    const blob = new Blob(Array.prototype.map.call(document.querySelectorAll('script:not([data-js-worker=\'false\'])'), function (oScript) { return oScript.textContent; }), { type: 'text/javascript' });
    main_dom_worker = new Worker(window.URL.createObjectURL(blob));
    main_dom_worker.onmessage = function (e) {
        switch (e.data.kind) {
            case "console":
                eCon.insertBefore(document.createTextNode(e.data.text), eCursor);
                break;
            case "proc_exit":
                var exit = document.createElement("span");
                exit.textContent = `\nprocess exited with code ${e.data.code}`;
                exit.style.color = e.data.code == 0 ? "#888" : "#C44";
                eCon.insertBefore(exit, eCursor);
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
    document.addEventListener("keypress", function (e) {
        var text = e.char || String.fromCharCode(e.charCode);
        if (text === "\r") {
            text = "\n";
        }
        stdin.write_all(text);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2NyaXB0LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vc2NyaXB0L2NvbnN0YW50cy50cyIsIi4uL3NjcmlwdC9leGVjLXdhc20udHMiLCIuLi9zY3JpcHQvbWFpbi1kb20udHMiLCIuLi9zY3JpcHQvbWFpbi13b3JrZXIudHMiLCIuLi9zY3JpcHQvaW8vU2hhcmVkQ2lyY3VsYXJCdWZmZXIudHMiLCIuLi9zY3JpcHQvbWVzc2FnZXMvZG9tMndvcmsudHMiLCIuLi9zY3JpcHQvbWVzc2FnZXMvd29yazJkb20udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBLE1BQU0sbUJBQW1CLEdBQUssQ0FBQyxDQUFDO0FBQ2hDLE1BQU0scUJBQXFCLEdBQUcsQ0FBQyxDQUFDO0FBQ2hDLE1BQU0sWUFBWSxHQUFHLENBQUMsQ0FBQztBQUV2QixNQUFNLFVBQVUsR0FBRyxFQUFFLENBQUM7QUFDdEIsTUFBTSxXQUFXLEdBQUcsQ0FBQyxDQUFDLElBQUksVUFBVSxDQUFDLENBQUM7QUFDdEMsTUFBTSxVQUFVLEdBQUcsV0FBVyxHQUFDLENBQUMsQ0FBQztBQ05qQyxTQUFTLGdCQUFnQixDQUFDLElBQW1CLEVBQUUsSUFBWTtJQUN2RCxJQUFJLE1BQTJCLENBQUM7SUFXaEMsTUFBTSxLQUFLLEdBQUcsSUFBSSxFQUFFLENBQUMsb0JBQW9CLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDO0lBUXRELE1BQU0sYUFBYSxHQUFjLENBQUMsQ0FBQztJQUNuQyxNQUFNLFVBQVUsR0FBaUIsQ0FBQyxDQUFDO0lBQ25DLE1BQU0sVUFBVSxHQUFpQixDQUFDLENBQUM7SUFDbkMsTUFBTSxnQkFBZ0IsR0FBVyxFQUFFLENBQUM7SUFFcEMsU0FBUyxPQUFPLENBQUksR0FBUSxFQUFFLE1BQWMsSUFBYyxPQUFPLElBQUksUUFBUSxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQyxRQUFRLENBQUUsR0FBRyxHQUFHLE1BQU0sQ0FBYSxDQUFDLENBQUMsQ0FBQztJQUNuSSxTQUFTLFFBQVEsQ0FBRyxHQUFRLEVBQUUsTUFBYyxJQUFjLE9BQU8sSUFBSSxRQUFRLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDLFNBQVMsQ0FBQyxHQUFHLEdBQUcsTUFBTSxFQUFFLElBQUksQ0FBUSxDQUFDLENBQUMsQ0FBQztJQUNwSSxTQUFTLFFBQVEsQ0FBRyxHQUFRLEVBQUUsTUFBYyxJQUFjLE9BQU8sSUFBSSxRQUFRLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDLFNBQVMsQ0FBQyxHQUFHLEdBQUcsTUFBTSxFQUFFLElBQUksQ0FBUSxDQUFDLENBQUMsQ0FBQztJQUNwSSxTQUFTLFVBQVUsQ0FBQyxHQUFRLEVBQUUsTUFBYyxJQUFjLE9BQU8sUUFBUSxDQUFHLEdBQUcsRUFBRSxNQUFNLENBQVEsQ0FBQyxDQUFDLENBQUM7SUFDbEcsU0FBUyxRQUFRLENBQUcsR0FBUSxFQUFFLE1BQWMsSUFBYyxPQUFPLFVBQVUsQ0FBQyxHQUFHLEVBQUUsTUFBTSxDQUFRLENBQUMsQ0FBQyxDQUFDO0lBR2xHLFNBQVMsZUFBZSxDQUFHLEdBQVEsRUFBRSxNQUFjO1FBQy9DLElBQUksRUFBRSxHQUFHLElBQUksUUFBUSxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUNyQyxJQUFJLEVBQUUsR0FBRyxFQUFFLENBQUMsU0FBUyxDQUFDLEdBQUcsR0FBRyxNQUFNLEdBQUcsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDO1FBQzlDLElBQUksRUFBRSxHQUFHLEVBQUUsQ0FBQyxTQUFTLENBQUMsR0FBRyxHQUFHLE1BQU0sR0FBRyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFDOUMsT0FBTyxDQUFDLEVBQUUsR0FBRyxXQUFXLEdBQUcsRUFBRSxDQUFRLENBQUM7SUFDMUMsQ0FBQztJQUVELFNBQVMsYUFBYSxDQUFHLEdBQVEsRUFBRSxNQUFjO1FBQzdDLElBQUksRUFBRSxHQUFHLElBQUksUUFBUSxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUNyQyxJQUFJLEVBQUUsR0FBRyxFQUFFLENBQUMsU0FBUyxDQUFDLEdBQUcsR0FBRyxNQUFNLEdBQUcsQ0FBQyxFQUFFLElBQUksQ0FBUSxDQUFDO1FBQ3JELElBQUksRUFBRSxHQUFHLEVBQUUsQ0FBQyxTQUFTLENBQUMsR0FBRyxHQUFHLE1BQU0sR0FBRyxDQUFDLEVBQUUsSUFBSSxDQUFRLENBQUM7UUFDckQsT0FBTyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQztJQUNwQixDQUFDO0lBRUQsU0FBUyxRQUFRLENBQU8sR0FBUSxFQUFFLE1BQWMsRUFBRSxLQUFTLElBQVMsSUFBSSxRQUFRLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDLFFBQVEsQ0FBRSxHQUFHLEdBQUcsTUFBTSxFQUFFLEtBQUssQ0FBTyxDQUFDLENBQUMsQ0FBQztJQUN2SSxTQUFTLFNBQVMsQ0FBTSxHQUFRLEVBQUUsTUFBYyxFQUFFLEtBQVUsSUFBUSxJQUFJLFFBQVEsQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUMsU0FBUyxDQUFDLEdBQUcsR0FBRyxNQUFNLEVBQUUsS0FBSyxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUN2SSxTQUFTLFNBQVMsQ0FBTSxHQUFRLEVBQUUsTUFBYyxFQUFFLEtBQVUsSUFBUSxJQUFJLFFBQVEsQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUMsU0FBUyxDQUFDLEdBQUcsR0FBRyxNQUFNLEVBQUUsS0FBSyxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUN2SSxTQUFTLFdBQVcsQ0FBSSxHQUFRLEVBQUUsTUFBYyxFQUFFLEtBQVksSUFBTSxTQUFTLENBQUcsR0FBRyxFQUFFLE1BQU0sRUFBRSxLQUFZLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDN0csU0FBUyxTQUFTLENBQU0sR0FBUSxFQUFFLE1BQWMsRUFBRSxLQUFVLElBQVEsV0FBVyxDQUFDLEdBQUcsRUFBRSxNQUFNLEVBQUUsS0FBWSxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQzdHLFNBQVMsY0FB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RCxPQUFPLEdBQUcsQ0FBQztRQUNmLENBQUM7S0FDSjtJQTVGWSx1QkFBb0IsdUJBNEZoQyxDQUFBO0FBQ0wsQ0FBQyxFQWxHUyxFQUFFLEtBQUYsRUFBRSxRQWtHWDtBQ2xHRCxJQUFVLFFBQVEsQ0FtQmpCO0FBbkJELFdBQVUsUUFBUTtJQWdCZCxTQUFnQixJQUFJLENBQUMsSUFBVTtRQUMzQixlQUFlLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxDQUFDO0lBQ3RDLENBQUM7SUFGZSxhQUFJLE9BRW5CLENBQUE7QUFDTCxDQUFDLEVBbkJTLFFBQVEsS0FBUixRQUFRLFFBbUJqQjtBQ25CRCxJQUFVLFFBQVEsQ0EwQmpCO0FBMUJELFdBQVUsUUFBUTtJQXFCZCxTQUFnQixJQUFJLENBQUMsT0FBYTtRQUc3QixJQUFZLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxDQUFDO0lBQ3ZDLENBQUM7SUFKZSxhQUFJLE9BSW5CLENBQUE7QUFDTCxDQUFDLEVBMUJTLFFBQVEsS0FBUixRQUFRLFFBMEJqQiIsInNvdXJjZXNDb250ZW50IjpbImNvbnN0IEFUT01JQ19TVERJTl9GSUxMRUQgICA9IDA7XHJcbmNvbnN0IEFUT01JQ19TVERJTl9DT05TVU1FRCA9IDE7XHJcbmNvbnN0IEFUT01JQ19DT1VOVCA9IDI7XHJcblxyXG5jb25zdCBTVERJTl9CSVRTID0gMTA7XHJcbmNvbnN0IFNURElOX0NPVU5UID0gKDEgPDwgU1RESU5fQklUUyk7XHJcbmNvbnN0IFNURElOX01BU0sgPSBTVERJTl9DT1VOVC0xO1xyXG4iLCJmdW5jdGlvbiBleGVjX2Jhc2U2NF93YXNtKGluaXQ6IGRvbTJ3b3JrLkluaXQsIHdhc206IHN0cmluZykge1xyXG4gICAgdmFyIG1lbW9yeSA6IFdlYkFzc2VtYmx5Lk1lbW9yeTtcclxuXHJcbiAgICB0eXBlIEZkICAgICA9IG51bWJlciAmIHsgX25vdF9yZWFsOiBcImZkXCI7IH1cclxuICAgIHR5cGUgRXJybm8gID0gbnVtYmVyICYgeyBfbm90X3JlYWw6IFwiZXJybm9cIjsgfVxyXG4gICAgdHlwZSBwdHIgICAgPSBudW1iZXIgJiB7IF9ub3RfcmVhbDogXCJwdHJcIjsgfVxyXG4gICAgdHlwZSB1OCAgICAgPSBudW1iZXIgJiB7IF9ub3RfcmVhbDogXCJ1OFwiOyB9XHJcbiAgICB0eXBlIHUxNiAgICA9IG51bWJlciAmIHsgX25vdF9yZWFsOiBcInUxNlwiOyB9XHJcbiAgICB0eXBlIHUzMiAgICA9IG51bWJlciAmIHsgX25vdF9yZWFsOiBcInUzMlwiOyB9XHJcbiAgICB0eXBlIHU2NCAgICA9IG51bWJlciAmIHsgX25vdF9yZWFsOiBcInU2NFwiOyB9IC8vIFhYWDogbnVtYmVyIG9ubHkgaGFzIDUyIGJpdHMgb2YgcHJlY2lzaW9uXHJcbiAgICB0eXBlIHVzaXplICA9IG51bWJlciAmIHsgX25vdF9yZWFsOiBcInVzaXplXCI7IH1cclxuXHJcbiAgICBjb25zdCBzdGRpbiA9IG5ldyBpby5TaGFyZWRDaXJjdWxhckJ1ZmZlcihpbml0LnN0ZGluKTtcclxuXHJcbiAgICAvLyBSZWZlcmVuY2VzOlxyXG4gICAgLy8gaHR0cHM6Ly9kb2NzLnJzL3dhc2ktdHlwZXMvMC4xLjUvc3JjL3dhc2lfdHlwZXMvbGliLnJzLmh0bWxcclxuICAgIC8vIGh0dHBzOi8vZG9jcy5ycy93YXNpLzAuMTAuMit3YXNpLXNuYXBzaG90LXByZXZpZXcxL3NyYy93YXNpL2xpYl9nZW5lcmF0ZWQucnMuaHRtbFxyXG4gICAgLy8gaHR0cHM6Ly9naXRodWIuY29tL1dlYkFzc2VtYmx5L1dBU0kvYmxvYi9tYWluL3BoYXNlcy9zbmFwc2hvdC9kb2NzLm1kXHJcblxyXG4gICAgLy8gaHR0cHM6Ly9kb2NzLnJzL3dhc2kvMC4xMC4yK3dhc2ktc25hcHNob3QtcHJldmlldzEvc3JjL3dhc2kvbGliX2dlbmVyYXRlZC5ycy5odG1sIzI3XHJcbiAgICBjb25zdCBFUlJOT19TVUNDRVNTICAgICA9IDxFcnJubz4wO1xyXG4gICAgY29uc3QgRVJSTk9fMkJJRyAgICAgICAgPSA8RXJybm8+MTtcclxuICAgIGNvbnN0IEVSUk5PX0JBREYgICAgICAgID0gPEVycm5vPjg7XHJcbiAgICBjb25zdCBFUlJOT19OT1RDQVBBQkxFICA9IDxFcnJubz43NjtcclxuXHJcbiAgICBmdW5jdGlvbiByZWFkX3U4KCAgIHB0cjogcHRyLCBvZmZzZXQ6IG51bWJlcik6IHU4ICAgICAgIHsgcmV0dXJuIG5ldyBEYXRhVmlldyhtZW1vcnkuYnVmZmVyKS5nZXRVaW50OCggcHRyICsgb2Zmc2V0ICAgICAgKSBhcyB1ODsgfVxyXG4gICAgZnVuY3Rpb24gcmVhZF91MTYoICBwdHI6IHB0ciwgb2Zmc2V0OiBudW1iZXIpOiB1MTYgICAgICB7IHJldHVybiBuZXcgRGF0YVZpZXcobWVtb3J5LmJ1ZmZlcikuZ2V0VWludDE2KHB0ciArIG9mZnNldCwgdHJ1ZSkgYXMgdTE2OyB9XHJcbiAgICBmdW5jdGlvbiByZWFkX3UzMiggIHB0cjogcHRyLCBvZmZzZXQ6IG51bWJlcik6IHUzMiAgICAgIHsgcmV0dXJuIG5ldyBEYXRhVmlldyhtZW1vcnkuYnVmZmVyKS5nZXRVaW50MzIocHRyICsgb2Zmc2V0LCB0cnVlKSBhcyB1MzI7IH1cclxuICAgIGZ1bmN0aW9uIHJlYWRfdXNpemUocHRyOiBwdHIsIG9mZnNldDogbnVtYmVyKTogdXNpemUgICAgeyByZXR1cm4gcmVhZF91MzIoICBwdHIsIG9mZnNldCkgYXMgYW55OyB9XHJcbiAgICBmdW5jdGlvbiByZWFkX3B0ciggIHB0cjogcHRyLCBvZmZzZXQ6IG51bWJlcik6IHB0ciAgICAgIHsgcmV0dXJuIHJlYWRfdXNpemUocHRyLCBvZmZzZXQpIGFzIGFueTsgfVxyXG5cclxuICAgIC8vIFhYWDogYG51bWJlcmAgb25seSBndWFyYW50ZWVzIDUyLWJpdCBwcmVjaXNpb24sIHNvIHRoaXMgaXMgcHJldHR5IGJvZ3VzXHJcbiAgICBmdW5jdGlvbiByZWFkX3U2NF9hcHByb3goICBwdHI6IHB0ciwgb2Zmc2V0OiBudW1iZXIpOiB1NjQge1xyXG4gICAgICAgIGxldCBkdiA9IG5ldyBEYXRhVmlldyhtZW1vcnkuYnVmZmVyKTtcclxuICAgICAgICBsZXQgbG8gPSBkdi5nZXRVaW50MzIocHRyICsgb2Zmc2V0ICsgMCwgdHJ1ZSk7XHJcbiAgICAgICAgbGV0IGhpID0gZHYuZ2V0VWludDMyKHB0ciArIG9mZnNldCArIDQsIHRydWUpO1xyXG4gICAgICAgIHJldHVybiAoaGkgKiAweDEwMDAwMDAwMCArIGxvKSBhcyB1NjQ7XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gcmVhZF91NjRfcGFpciggIHB0cjogcHRyLCBvZmZzZXQ6IG51bWJlcik6IFt1MzIsIHUzMl0ge1xyXG4gICAgICAgIGxldCBkdiA9IG5ldyBEYXRhVmlldyhtZW1vcnkuYnVmZmVyKTtcclxuICAgICAgICBsZXQgbG8gPSBkdi5nZXRVaW50MzIocHRyICsgb2Zmc2V0ICsgMCwgdHJ1ZSkgYXMgdTMyO1xyXG4gICAgICAgIGxldCBoaSA9IGR2LmdldFVpbnQzMihwdHIgKyBvZmZzZXQgKyA0LCB0cnVlKSBhcyB1MzI7XHJcbiAgICAgICAgcmV0dXJuIFtsbywgaGldO1xyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIHdyaXRlX3U4KCAgICAgIHB0cjogcHRyLCBvZmZzZXQ6IG51bWJlciwgdmFsdWU6IHU4ICAgICApIHsgbmV3IERhdGFWaWV3KG1lbW9yeS5idWZmZXIpLnNldFVpbnQ4KCBwdHIgKyBvZmZzZXQsIHZhbHVlICAgICAgKTsgfVxyXG4gICAgZnVuY3Rpb24gd3JpdGVfdTE2KCAgICAgcHRyOiBwdHIsIG9mZnNldDogbnVtYmVyLCB2YWx1ZTogdTE2ICAgICkgeyBuZXcgRGF0YVZpZXcobWVtb3J5LmJ1ZmZlcikuc2V0VWludDE2KHB0ciArIG9mZnNldCwgdmFsdWUsIHRydWUpOyB9XHJcbiAgICBmdW5jdGlvbiB3cml0ZV91MzIoICAgICBwdHI6IHB0ciwgb2Zmc2V0OiBudW1iZXIsIHZhbHVlOiB1MzIgICAgKSB7IG5ldyBEYXRhVmlldyhtZW1vcnkuYnVmZmVyKS5zZXRVaW50MzIocHRyICsgb2Zmc2V0LCB2YWx1ZSwgdHJ1ZSk7IH1cclxuICAgIGZ1bmN0aW9uIHdyaXRlX3VzaXplKCAgIHB0cjogcHRyLCBvZmZzZXQ6IG51bWJlciwgdmFsdWU6IHVzaXplICApIHsgd3JpdGVfdTMyKCAgcHRyLCBvZmZzZXQsIHZhbHVlIGFzIGFueSk7IH1cclxuICAgIGZ1bmN0aW9uIHdyaXRlX3B0ciggICAgIHB0cjogcHRyLCBvZmZzZXQ6IG51bWJlciwgdmFsdWU6IHB0ciAgICApIHsgd3JpdGVfdXNpemUocHRyLCBvZmZzZXQsIHZhbHVlIGFzIGFueSk7IH1cclxuICAgIGZ1bmN0aW9uIHdyaXRlX3U2NF9wYWlyKHB0cjogcHRyLCBvZmZzZXQ6IG51bWJlciwgW2xvLCBoaV06IFt1MzIsIHUzMl0pIHtcclxuICAgICAgICB3cml0ZV91MzIocHRyLCBvZmZzZXQrMCwgbG8pO1xyXG4gICAgICAgIHdyaXRlX3UzMihwdHIsIG9mZnNldCs0LCBoaSk7XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gc2xpY2UocHRyOiBwdHIsIHN0YXJ0OiB1c2l6ZSwgZW5kOiB1c2l6ZSk6IERhdGFWaWV3IHsgcmV0dXJuIG5ldyBEYXRhVmlldyhtZW1vcnkuYnVmZmVyLCBwdHIrc3RhcnQsIGVuZC1zdGFydCk7IH1cclxuICAgIGZ1bmN0aW9uIHNsaWNlOChwdHI6IHB0ciwgc3RhcnQ6IHVzaXplLCBlbmQ6IHVzaXplKTogVWludDhBcnJheSB7IHJldHVybiBuZXcgVWludDhBcnJheShtZW1vcnkuYnVmZmVyLCBwdHIrc3RhcnQsIGVuZC1zdGFydCk7IH1cclxuXHJcbiAgICBmdW5jdGlvbiBzbGVlcF9tcyhtczogbnVtYmVyKSB7XHJcbiAgICAgICAgQXRvbWljcy53YWl0KG5ldyBJbnQzMkFycmF5KG5ldyBTaGFyZWRBcnJheUJ1ZmZlcig0KSksIDAsIDAsIG1zKTtcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBzbGVlcF9ucyhuczogbnVtYmVyKSB7XHJcbiAgICAgICAgc2xlZXBfbXMobnMgLyAxMDAwIC8gMTAwMCk7XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gbnlpKCk6IEVycm5vIHtcclxuICAgICAgICBkZWJ1Z2dlcjtcclxuICAgICAgICByZXR1cm4gRVJSTk9fTk9UQ0FQQUJMRTtcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBhcmdzX2dldCAgICAgICAgICAgICAgICAgICAoKTogRXJybm8geyByZXR1cm4gbnlpKCk7IH1cclxuICAgIGZ1bmN0aW9uIGFyZ3Nfc2l6ZXNfZ2V0ICAgICAgICAgICAgICgpOiBFcnJubyB7IHJldHVybiBueWkoKTsgfVxyXG4gICAgZnVuY3Rpb24gZW52aXJvbl9nZXQgICAgICAgICAgICAgICAgKCk6IEVycm5vIHsgcmV0dXJuIG55aSgpOyB9XHJcbiAgICBmdW5jdGlvbiBlbnZpcm9uX3NpemVzX2dldCAgICAgICAgICAoKTogRXJybm8geyByZXR1cm4gbnlpKCk7IH1cclxuICAgIGZ1bmN0aW9uIGNsb2NrX3Jlc19nZXQgICAgICAgICAgICAgICgpOiBFcnJubyB7IHJldHVybiBueWkoKTsgfVxyXG4gICAgZnVuY3Rpb24gY2xvY2tfdGltZV9nZXQgICAgICAgICAgICAgKCk6IEVycm5vIHsgcmV0dXJuIG55aSgpOyB9XHJcbiAgICBmdW5jdGlvbiBmZF9hZHZpc2UgICAgICAgICAgICAgICAgICAoKTogRXJybm8geyByZXR1cm4gbnlpKCk7IH1cclxuICAgIGZ1bmN0aW9uIGZkX2FsbG9jYXRlICAgICAgICAgICAgICAgICgpOiBFcnJubyB7IHJldHVybiBueWkoKTsgfVxyXG4gICAgZnVuY3Rpb24gZmRfY2xvc2UgICAgICAgICAgICAgICAgICAgKCk6IEVycm5vIHsgcmV0dXJuIG55aSgpOyB9XHJcbiAgICBmdW5jdGlvbiBmZF9kYXRhc3luYyAgICAgICAgICAgICAgICAoKTogRXJybm8geyByZXR1cm4gbnlpKCk7IH1cclxuICAgIGZ1bmN0aW9uIGZkX2Zkc3RhdF9nZXQgICAgICAgICAgICAgICgpOiBFcnJubyB7IHJldHVybiBueWkoKTsgfVxyXG4gICAgZnVuY3Rpb24gZmRfZmRzdGF0X3NldF9mbGFncyAgICAgICAgKCk6IEVycm5vIHsgcmV0dXJuIG55aSgpOyB9XHJcbiAgICBmdW5jdGlvbiBmZF9mZHN0YXRfc2V0X3JpZ2h0cyAgICAgICAoKTogRXJybm8geyByZXR1cm4gbnlpKCk7IH1cclxuICAgIGZ1bmN0aW9uIGZkX2ZpbGVzdGF0X2dldCAgICAgICAgICAgICgpOiBFcnJubyB7IHJldHVybiBueWkoKTsgfVxyXG4gICAgZnVuY3Rpb24gZmRfZmlsZXN0YXRfc2V0X3NpemUgICAgICAgKCk6IEVycm5vIHsgcmV0dXJuIG55aSgpOyB9XHJcbiAgICBmdW5jdGlvbiBmZF9maWxlc3RhdF9zZXRfdGltZXMgICAgICAoKTogRXJybm8geyByZXR1cm4gbnlpKCk7IH1cclxuICAgIGZ1bmN0aW9uIGZkX3ByZWFkICAgICAgICAgICAgICAgICAgICgpOiBFcnJubyB7IHJldHVybiBueWkoKTsgfVxyXG4gICAgZnVuY3Rpb24gZmRfcHJlc3RhdF9nZXQgICAgICAgICAgICAgKCk6IEVycm5vIHsgcmV0dXJuIG55aSgpOyB9XHJcbiAgICBmdW5jdGlvbiBmZF9wcmVzdGF0X2Rpcl9uYW1lICAgICAgICAoKTogRXJybm8geyByZXR1cm4gbnlpKCk7IH1cclxuICAgIGZ1bmN0aW9uIGZkX3B3cml0ZSAgICAgICAgICAgICAgICAgICgpOiBFcnJubyB7IHJldHVybiBueWkoKTsgfVxyXG5cclxuICAgIGZ1bmN0aW9uIGZkX3JlYWQoZmQ6IEZkLCBpb3ZlY19hcnJheV9wdHI6IHB0ciwgaW92ZWNfYXJyYXlfbGVuOiB1c2l6ZSwgbnJlYWRfcHRyOiBwdHIpOiBFcnJubyB7XHJcbiAgICAgICAgLy8gaHR0cHM6Ly9kb2NzLnJzL3dhc2kvMC4xMC4yK3dhc2ktc25hcHNob3QtcHJldmlldzEvc3JjL3dhc2kvbGliX2dlbmVyYXRlZC5ycy5odG1sIzE3NTRcclxuXHJcbiAgICAgICAgdmFyIG5yZWFkID0gMDtcclxuICAgICAgICB2YXIgZXJybm8gPSBFUlJOT19TVUNDRVNTO1xyXG5cclxuICAgICAgICBmb3IgKHZhciBpb3ZlY19pZHggPSAwOyBpb3ZlY19pZHggPCBpb3ZlY19hcnJheV9sZW47ICsraW92ZWNfaWR4KSB7XHJcbiAgICAgICAgICAgIHZhciBidWZfcHRyID0gcmVhZF9wdHIoaW92ZWNfYXJyYXlfcHRyLCA4ICogaW92ZWNfaWR4ICsgMCk7XHJcbiAgICAgICAgICAgIHZhciBidWZfbGVuID0gcmVhZF91c2l6ZShpb3ZlY19hcnJheV9wdHIsIDggKiBpb3ZlY19pZHggKyA0KTtcclxuICAgICAgICAgICAgaWYgKGJ1Zl9sZW4gPD0gMCkgeyBjb250aW51ZTsgfVxyXG5cclxuICAgICAgICAgICAgc3dpdGNoIChmZCkge1xyXG4gICAgICAgICAgICAgICAgY2FzZSAwOiAvLyBzdGRpblxyXG4gICAgICAgICAgICAgICAgICAgIGxldCByZWFkID0gc3RkaW4udHJ5X3JlYWQoYnVmX2xlbik7XHJcbiAgICAgICAgICAgICAgICAgICAgZm9yICh2YXIgaT0wOyBpPHJlYWQubGVuZ3RoOyArK2kpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGIgPSByZWFkW2ldIGFzIHU4O1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB3b3JrMmRvbS5wb3N0KHsga2luZDogXCJjb25zb2xlXCIsIHRleHQ6IG5ldyBUZXh0RGVjb2RlcigpLmRlY29kZShuZXcgVWludDhBcnJheShbYl0pKSB9KTsgLy8gWFhYOiBsb2NhbCBlY2hvXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHdyaXRlX3U4KGJ1Zl9wdHIsIGksIGIpO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICBucmVhZCArPSByZWFkLmxlbmd0aDtcclxuICAgICAgICAgICAgICAgICAgICBpZiAocmVhZC5sZW5ndGggPCBidWZfbGVuKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHdyaXRlX3VzaXplKG5yZWFkX3B0ciwgMCwgbnJlYWQgYXMgdXNpemUpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gZXJybm87XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgZGVmYXVsdDpcclxuICAgICAgICAgICAgICAgICAgICBlcnJubyA9IEVSUk5PX0JBREY7XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHdyaXRlX3VzaXplKG5yZWFkX3B0ciwgMCwgbnJlYWQgYXMgdXNpemUpO1xyXG4gICAgICAgIHJldHVybiBlcnJubztcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBmZF9yZWFkZGlyICAgICAgICAgICAgICAgICAoKTogRXJybm8geyByZXR1cm4gbnlpKCk7IH1cclxuICAgIGZ1bmN0aW9uIGZkX3JlbnVtYmVyICAgICAgICAgICAgICAgICgpOiBFcnJubyB7IHJldHVybiBueWkoKTsgfVxyXG4gICAgZnVuY3Rpb24gZmRfc2VlayAgICAgICAgICAgICAgICAgICAgKCk6IEVycm5vIHsgcmV0dXJuIG55aSgpOyB9XHJcbiAgICBmdW5jdGlvbiBmZF9zeW5jICAgICAgICAgICAgICAgICAgICAoKTogRXJybm8geyByZXR1cm4gbnlpKCk7IH1cclxuICAgIGZ1bmN0aW9uIGZkX3RlbGwgICAgICAgICAgICAgICAgICAgICgpOiBFcnJubyB7IHJldHVybiBueWkoKTsgfVxyXG5cclxuICAgIGZ1bmN0aW9uIGZkX3dyaXRlKGZkOiBGZCwgY2lvdmVjX2FycmF5X3B0cjogcHRyLCBjaW92ZWNfYXJyYXlfbGVuOiB1c2l6ZSwgbndyaXR0ZW5fcHRyOiBwdHIpOiBFcnJubyB7XHJcbiAgICAgICAgLy8gaHR0cHM6Ly9kb2NzLnJzL3dhc2kvMC4xMC4yK3dhc2ktc25hcHNob3QtcHJldmlldzEvc3JjL3dhc2kvbGliX2dlbmVyYXRlZC5ycy5odG1sIzE3OTZcclxuICAgICAgICAvLyBodHRwczovL25vZGVqcy5vcmcvYXBpL3dhc2kuaHRtbFxyXG5cclxuICAgICAgICB2YXIgbndyaXR0ZW4gPSAwO1xyXG4gICAgICAgIHZhciBlcnJubyA9IEVSUk5PX1NVQ0NFU1M7XHJcblxyXG4gICAgICAgIHZhciB0ZXh0ID0gXCJcIjtcclxuICAgICAgICBmb3IgKHZhciBjaW92ZWNfaWR4ID0gMDsgY2lvdmVjX2lkeCA8IGNpb3ZlY19hcnJheV9sZW47ICsrY2lvdmVjX2lkeCkge1xyXG4gICAgICAgICAgICB2YXIgYnVmX3B0ciA9IHJlYWRfcHRyKGNpb3ZlY19hcnJheV9wdHIsIDggKiBjaW92ZWNfaWR4ICsgMCk7XHJcbiAgICAgICAgICAgIHZhciBidWZfbGVuID0gcmVhZF91c2l6ZShjaW92ZWNfYXJyYXlfcHRyLCA4ICogY2lvdmVjX2lkeCArIDQpO1xyXG5cclxuICAgICAgICAgICAgc3dpdGNoIChmZCkge1xyXG4gICAgICAgICAgICAgICAgY2FzZSAxOiAvLyBzdGRvdXRcclxuICAgICAgICAgICAgICAgIGNhc2UgMjogLy8gc3RkZXJyXHJcbiAgICAgICAgICAgICAgICAgICAgdGV4dCArPSBuZXcgVGV4dERlY29kZXIoKS5kZWNvZGUoc2xpY2UoYnVmX3B0ciwgMCBhcyB1c2l6ZSwgYnVmX2xlbikpO1xyXG4gICAgICAgICAgICAgICAgICAgIG53cml0dGVuICs9IGJ1Zl9sZW47XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICBkZWZhdWx0OlxyXG4gICAgICAgICAgICAgICAgICAgIGVycm5vID0gRVJSTk9fQkFERjtcclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKHRleHQgIT09IFwiXCIpIHtcclxuICAgICAgICAgICAgd29yazJkb20ucG9zdCh7IGtpbmQ6IFwiY29uc29sZVwiLCB0ZXh0IH0pO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgd3JpdGVfdXNpemUobndyaXR0ZW5fcHRyLCAwLCBud3JpdHRlbiBhcyB1c2l6ZSk7XHJcbiAgICAgICAgcmV0dXJuIGVycm5vO1xyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIHBhdGhfY3JlYXRlX2RpcmVjdG9yeSAgICAgICgpOiBFcnJubyB7IHJldHVybiBueWkoKTsgfVxyXG4gICAgZnVuY3Rpb24gcGF0aF9maWxlc3RhdHNfZ2V0ICAgICAgICAgKCk6IEVycm5vIHsgcmV0dXJuIG55aSgpOyB9XHJcbiAgICBmdW5jdGlvbiBwYXRoX2ZpbGVzdGF0X3NldF90aW1lcyAgICAoKTogRXJybm8geyByZXR1cm4gbnlpKCk7IH1cclxuICAgIGZ1bmN0aW9uIHBhdGhfbGluayAgICAgICAgICAgICAgICAgICgpOiBFcnJubyB7IHJldHVybiBueWkoKTsgfVxyXG4gICAgZnVuY3Rpb24gcGF0aF9vcGVuICAgICAgICAgICAgICAgICAgKCk6IEVycm5vIHsgcmV0dXJuIG55aSgpOyB9XHJcbiAgICBmdW5jdGlvbiBwYXRoX3JlYWRsaW5rICAgICAgICAgICAgICAoKTogRXJybm8geyByZXR1cm4gbnlpKCk7IH1cclxuICAgIGZ1bmN0aW9uIHBhdGhfcmVtb3ZlX2RpcmVjdG9yeSAgICAgICgpOiBFcnJubyB7IHJldHVybiBueWkoKTsgfVxyXG4gICAgZnVuY3Rpb24gcGF0aF9yZW5hbWUgICAgICAgICAgICAgICAgKCk6IEVycm5vIHsgcmV0dXJuIG55aSgpOyB9XHJcbiAgICBmdW5jdGlvbiBwYXRoX3N5bWxpbmsgICAgICAgICAgICAgICAoKTogRXJybm8geyByZXR1cm4gbnlpKCk7IH1cclxuICAgIGZ1bmN0aW9uIHBhdGhfdW5saW5rX2ZpbGUgICAgICAgICAgICgpOiBFcnJubyB7IHJldHVybiBueWkoKTsgfVxyXG5cclxuICAgIGZ1bmN0aW9uIHBvbGxfb25lb2ZmKGluX3N1YnM6IHB0ciwgb3V0X2V2ZW50czogcHRyLCBpbl9uc3ViczogdXNpemUsIG91dF9uZXZlbnRzX3B0cjogcHRyKTogRXJybm8ge1xyXG4gICAgICAgIC8vIGh0dHBzOi8vZ2l0aHViLmNvbS9XZWJBc3NlbWJseS9XQVNJL2Jsb2IvbWFpbi9waGFzZXMvc25hcHNob3QvZG9jcy5tZCMtcG9sbF9vbmVvZmZpbi1jb25zdHBvaW50ZXJzdWJzY3JpcHRpb24tb3V0LXBvaW50ZXJldmVudC1uc3Vic2NyaXB0aW9ucy1zaXplLS0tZXJybm8tc2l6ZVxyXG4gICAgICAgIC8vIGh0dHBzOi8vZG9jcy5ycy93YXNpLzAuMTAuMit3YXNpLXNuYXBzaG90LXByZXZpZXcxL3NyYy93YXNpL2xpYl9nZW5lcmF0ZWQucnMuaHRtbCMxODkyXHJcblxyXG4gICAgICAgIGxldCBvdXRfbmV2ZW50cyA9IDA7XHJcbiAgICAgICAgd3JpdGVfdXNpemUob3V0X25ldmVudHNfcHRyLCAwLCBvdXRfbmV2ZW50cyBhcyB1c2l6ZSk7XHJcblxyXG4gICAgICAgIGlmIChpbl9uc3VicyA9PSAwKSB7IHJldHVybiBFUlJOT19TVUNDRVNTOyB9XHJcbiAgICAgICAgaWYgKGluX25zdWJzID4gMSkgeyBueWkoKTsgcmV0dXJuIEVSUk5PXzJCSUc7IH1cclxuXHJcbiAgICAgICAgZm9yICh2YXIgc3ViPTA7IHN1Yjxpbl9uc3ViczsgKytzdWIpIHtcclxuICAgICAgICAgICAgbGV0IHN1Yl9iYXNlID0gKGluX3N1YnMgKyA0OCAqIHN1YikgYXMgcHRyO1xyXG5cclxuICAgICAgICAgICAgbGV0IHVzZXJkYXRhICAgICAgICA9IHJlYWRfdTY0X3BhaXIoc3ViX2Jhc2UsIDApO1xyXG5cclxuICAgICAgICAgICAgbGV0IHVfdGFnICAgICAgICAgICA9IHJlYWRfdTgoIHN1Yl9iYXNlLCA4KTtcclxuICAgICAgICAgICAgdHlwZSBFdmVudHR5cGUgPSB1ODtcclxuICAgICAgICAgICAgY29uc3QgRVZFTlRUWVBFX0NMT0NLICAgICAgID0gPEV2ZW50dHlwZT4wO1xyXG4gICAgICAgICAgICBjb25zdCBFVkVOVFRZUEVfRkRfUkVBRCAgICAgPSA8RXZlbnR0eXBlPjE7XHJcbiAgICAgICAgICAgIGNvbnN0IEVWRU5UVFlQRV9GRF9XUklURSAgICA9IDxFdmVudHR5cGU+MjtcclxuICAgICAgICAgICAgaWYgKHVfdGFnICE9PSBFVkVOVFRZUEVfQ0xPQ0spIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiBueWkoKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAvLyA3IGJ5dGVzIG9mIHBhZGRpbmdcclxuXHJcbiAgICAgICAgICAgIGxldCB1X3VfY2xvY2tfaWQgICAgPSByZWFkX3UzMihzdWJfYmFzZSwgMTYpO1xyXG4gICAgICAgICAgICB0eXBlIENsb2NraWQgPSB1MzI7XHJcbiAgICAgICAgICAgIGNvbnN0IENMT0NLSURfUkVBTFRJTUUgICAgICAgICAgICAgID0gPENsb2NraWQ+MDsgLy8gVGhlIGNsb2NrIG1lYXN1cmluZyByZWFsIHRpbWUuIFRpbWUgdmFsdWUgemVybyBjb3JyZXNwb25kcyB3aXRoIDE5NzAtMDEtMDFUMDA6MDA6MDBaLlxyXG4gICAgICAgICAgICBjb25zdCBDTE9DS0lEX01PTk9UT05JQyAgICAgICAgICAgICA9IDxDbG9ja2lkPjE7IC8vIFRoZSBzdG9yZS13aWRlIG1vbm90b25pYyBjbG9jaywgd2hpY2ggaXMgZGVmaW5lZCBhcyBhIGNsb2NrIG1lYXN1cmluZyByZWFsIHRpbWUsIHdob3NlIHZhbHVlIGNhbm5vdCBiZSBhZGp1c3RlZCBhbmQgd2hpY2ggY2Fubm90IGhhdmUgbmVnYXRpdmUgY2xvY2sganVtcHMuIFRoZSBlcG9jaCBvZiB0aGlzIGNsb2NrIGlzIHVuZGVmaW5lZC4gVGhlIGFic29sdXRlIHRpbWUgdmFsdWUgb2YgdGhpcyBjbG9jayB0aGVyZWZvcmUgaGFzIG5vIG1lYW5pbmcuXHJcbiAgICAgICAgICAgIGNvbnN0IENMT0NLSURfUFJPQ0VTU19DUFVUSU1FX0lEICAgID0gPENsb2NraWQ+MjtcclxuICAgICAgICAgICAgY29uc3QgQ0xPQ0tJRF9USFJFQURfQ1BVVElNRV9JRCAgICAgPSA8Q2xvY2tpZD4zO1xyXG4gICAgICAgICAgICAvLyA0IGJ5dGVzIG9mIHBhZGRpbmdcclxuXHJcbiAgICAgICAgICAgIGxldCB1X3VfY2xvY2tfdGltZW91dCAgID0gcmVhZF91NjRfYXBwcm94KHN1Yl9iYXNlLCAyNCk7XHJcbiAgICAgICAgICAgIGxldCB1X3VfY2xvY2tfcHJlY2lzaW9uID0gcmVhZF91NjRfYXBwcm94KHN1Yl9iYXNlLCAzMik7XHJcblxyXG4gICAgICAgICAgICBsZXQgdV91X2Nsb2NrX2ZsYWdzICAgICA9IHJlYWRfdTE2KHN1Yl9iYXNlLCA0MCk7XHJcbiAgICAgICAgICAgIGNvbnN0IFNVQkNMT0NLRkxBR1NfU1VCU0NSSVBUSU9OX0NMT0NLX0FCU1RJTUUgID0gPHUxNj4weDE7XHJcbiAgICAgICAgICAgIGNvbnNvbGUuYXNzZXJ0KHVfdV9jbG9ja19mbGFncyA9PT0gMCwgXCJ1X3VfY2xvY2tfZmxhZ3MgIT09IDAgbm90IHlldCBzdXBwb3J0ZWRcIik7XHJcblxyXG4gICAgICAgICAgICBsZXQgYWJzID0gKHVfdV9jbG9ja19mbGFncyAmIFNVQkNMT0NLRkxBR1NfU1VCU0NSSVBUSU9OX0NMT0NLX0FCU1RJTUUpICE9PSAwO1xyXG4gICAgICAgICAgICAvLyA2IGJ5dGVzIG9mIHBhZGRpbmdcclxuXHJcbiAgICAgICAgICAgIGlmIChhYnMpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiBueWkoKTtcclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIHN3aXRjaCAodV91X2Nsb2NrX2lkKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgY2FzZSBDTE9DS0lEX1JFQUxUSU1FOlxyXG4gICAgICAgICAgICAgICAgICAgIGNhc2UgQ0xPQ0tJRF9NT05PVE9OSUM6XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHNsZWVwX25zKHVfdV9jbG9ja190aW1lb3V0KTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIGh0dHBzOi8vZ2l0aHViLmNvbS9XZWJBc3NlbWJseS9XQVNJL2Jsb2IvbWFpbi9waGFzZXMvc25hcHNob3QvZG9jcy5tZCMtZXZlbnQtc3RydWN0XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHdyaXRlX3U2NF9wYWlyKCBvdXRfZXZlbnRzLCAzMiAqIG91dF9uZXZlbnRzICsgIDAsIHVzZXJkYXRhKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgd3JpdGVfdTMyKCAgICAgIG91dF9ldmVudHMsIDMyICogb3V0X25ldmVudHMgKyAgOCwgMCBhcyB1MzIpOyAvLyBlcnJvclxyXG4gICAgICAgICAgICAgICAgICAgICAgICB3cml0ZV91OCggICAgICAgb3V0X2V2ZW50cywgMzIgKiBvdXRfbmV2ZW50cyArIDEwLCB1X3RhZyk7IC8vIHR5cGVcclxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gZmRfcmVhZHdyaXRlIGNhbiBiZSBza2lwcGVkIGZvciBjbG9ja3NcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIG91dF9uZXZlbnRzICs9IDE7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHdyaXRlX3VzaXplKG91dF9uZXZlbnRzX3B0ciwgMCwgb3V0X25ldmVudHMgYXMgdXNpemUpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgICAgICBkZWZhdWx0OlxyXG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gbnlpKCk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHdyaXRlX3VzaXplKG91dF9uZXZlbnRzX3B0ciwgMCwgaW5fbnN1YnMpO1xyXG4gICAgICAgIHJldHVybiBFUlJOT19TVUNDRVNTO1xyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIHByb2NfZXhpdChjb2RlOiBudW1iZXIpOiBuZXZlciB7XHJcbiAgICAgICAgLy8gaHR0cHM6Ly9kb2NzLnJzL3dhc2kvMC4xMC4yK3dhc2ktc25hcHNob3QtcHJldmlldzEvc3JjL3dhc2kvbGliX2dlbmVyYXRlZC5ycy5odG1sIzE5MDFcclxuICAgICAgICB3b3JrMmRvbS5wb3N0KHsga2luZDogXCJwcm9jX2V4aXRcIiwgY29kZSB9KTtcclxuICAgICAgICB0aHJvdyBcImV4aXRcIjtcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBwcm9jX3JhaXNlICAgICAgICAgICAgICAgICAoKTogRXJybm8geyByZXR1cm4gbnlpKCk7IH1cclxuXHJcbiAgICBmdW5jdGlvbiBzY2hlZF95aWVsZCgpOiBFcnJubyB7XHJcbiAgICAgICAgLy8gaHR0cHM6Ly9naXRodWIuY29tL1dlYkFzc2VtYmx5L1dBU0kvYmxvYi9tYWluL3BoYXNlcy9zbmFwc2hvdC9kb2NzLm1kIy1zY2hlZF95aWVsZC0tLWVycm5vXHJcbiAgICAgICAgLy8gaHR0cHM6Ly9kb2NzLnJzL3dhc2kvMC4xMC4yK3dhc2ktc25hcHNob3QtcHJldmlldzEvc3JjL3dhc2kvbGliX2dlbmVyYXRlZC5ycy5odG1sIzE5MDdcclxuICAgICAgICBzbGVlcF9ucygxKTtcclxuICAgICAgICByZXR1cm4gRVJSTk9fU1VDQ0VTUztcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiByYW5kb21fZ2V0KGJ1ZjogcHRyLCBsZW46IHVzaXplKTogRXJybm8ge1xyXG4gICAgICAgIC8vIGh0dHBzOi8vZ2l0aHViLmNvbS9XZWJBc3NlbWJseS9XQVNJL2Jsb2IvbWFpbi9waGFzZXMvc25hcHNob3QvZG9jcy5tZCMtcmFuZG9tX2dldGJ1Zi1wb2ludGVydTgtYnVmX2xlbi1zaXplLS0tZXJybm9cclxuICAgICAgICAvLyBodHRwczovL2RvY3MucnMvd2FzaS8wLjEwLjIrd2FzaS1zbmFwc2hvdC1wcmV2aWV3MS9zcmMvd2FzaS9saWJfZ2VuZXJhdGVkLnJzLmh0bWwjMTkxNFxyXG4gICAgICAgIGlmIChcImNyeXB0b1wiIGluIHNlbGYpIHtcclxuICAgICAgICAgICAgc2VsZi5jcnlwdG8uZ2V0UmFuZG9tVmFsdWVzKHNsaWNlOChidWYsIDAgYXMgdXNpemUsIGxlbikpO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIGZvciAodmFyIGk9MDsgaTxsZW47ICsraSkge1xyXG4gICAgICAgICAgICAgICAgd3JpdGVfdTgoYnVmLCBpLCAoMHhGRiAmIE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSoweDEwMCkpIGFzIHU4KTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gRVJSTk9fU1VDQ0VTUztcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBzb2NrX3JlY3YgICAgICAgICAgICAgICAgICAoKTogRXJybm8geyByZXR1cm4gbnlpKCk7IH1cclxuICAgIGZ1bmN0aW9uIHNvY2tfc2VuZCAgICAgICAgICAgICAgICAgICgpOiBFcnJubyB7IHJldHVybiBueWkoKTsgfVxyXG4gICAgZnVuY3Rpb24gc29ja19zaHV0ZG93biAgICAgICAgICAgICAgKCk6IEVycm5vIHsgcmV0dXJuIG55aSgpOyB9XHJcblxyXG4gICAgY29uc3QgaW1wb3J0cyA9IHtcclxuICAgICAgICB3YXNpX3NuYXBzaG90X3ByZXZpZXcxOiB7XHJcbiAgICAgICAgICAgIGFyZ3NfZ2V0LFxyXG4gICAgICAgICAgICBhcmdzX3NpemVzX2dldCxcclxuICAgICAgICAgICAgZW52aXJvbl9nZXQsXHJcbiAgICAgICAgICAgIGVudmlyb25fc2l6ZXNfZ2V0LFxyXG4gICAgICAgICAgICBjbG9ja19yZXNfZ2V0LFxyXG4gICAgICAgICAgICBjbG9ja190aW1lX2dldCxcclxuICAgICAgICAgICAgZmRfYWR2aXNlLFxyXG4gICAgICAgICAgICBmZF9hbGxvY2F0ZSxcclxuICAgICAgICAgICAgZmRfY2xvc2UsXHJcbiAgICAgICAgICAgIGZkX2RhdGFzeW5jLFxyXG4gICAgICAgICAgICBmZF9mZHN0YXRfZ2V0LFxyXG4gICAgICAgICAgICBmZF9mZHN0YXRfc2V0X2ZsYWdzLFxyXG4gICAgICAgICAgICBmZF9mZHN0YXRfc2V0X3JpZ2h0cyxcclxuICAgICAgICAgICAgZmRfZmlsZXN0YXRfZ2V0LFxyXG4gICAgICAgICAgICBmZF9maWxlc3RhdF9zZXRfc2l6ZSxcclxuICAgICAgICAgICAgZmRfZmlsZXN0YXRfc2V0X3RpbWVzLFxyXG4gICAgICAgICAgICBmZF9wcmVhZCxcclxuICAgICAgICAgICAgZmRfcHJlc3RhdF9nZXQsXHJcbiAgICAgICAgICAgIGZkX3ByZXN0YXRfZGlyX25hbWUsXHJcbiAgICAgICAgICAgIGZkX3B3cml0ZSxcclxuICAgICAgICAgICAgZmRfcmVhZCxcclxuICAgICAgICAgICAgZmRfcmVhZGRpcixcclxuICAgICAgICAgICAgZmRfcmVudW1iZXIsXHJcbiAgICAgICAgICAgIGZkX3NlZWssXHJcbiAgICAgICAgICAgIGZkX3N5bmMsXHJcbiAgICAgICAgICAgIGZkX3RlbGwsXHJcbiAgICAgICAgICAgIGZkX3dyaXRlLFxyXG4gICAgICAgICAgICBwYXRoX2NyZWF0ZV9kaXJlY3RvcnksXHJcbiAgICAgICAgICAgIHBhdGhfZmlsZXN0YXRzX2dldCxcclxuICAgICAgICAgICAgcGF0aF9maWxlc3RhdF9zZXRfdGltZXMsXHJcbiAgICAgICAgICAgIHBhdGhfbGluayxcclxuICAgICAgICAgICAgcGF0aF9vcGVuLFxyXG4gICAgICAgICAgICBwYXRoX3JlYWRsaW5rLFxyXG4gICAgICAgICAgICBwYXRoX3JlbW92ZV9kaXJlY3RvcnksXHJcbiAgICAgICAgICAgIHBhdGhfcmVuYW1lLFxyXG4gICAgICAgICAgICBwYXRoX3N5bWxpbmssXHJcbiAgICAgICAgICAgIHBhdGhfdW5saW5rX2ZpbGUsXHJcbiAgICAgICAgICAgIHBvbGxfb25lb2ZmLFxyXG4gICAgICAgICAgICBwcm9jX2V4aXQsXHJcbiAgICAgICAgICAgIHByb2NfcmFpc2UsXHJcbiAgICAgICAgICAgIHNjaGVkX3lpZWxkLFxyXG4gICAgICAgICAgICByYW5kb21fZ2V0LFxyXG4gICAgICAgICAgICBzb2NrX3JlY3YsXHJcbiAgICAgICAgICAgIHNvY2tfc2VuZCxcclxuICAgICAgICAgICAgc29ja19zaHV0ZG93bixcclxuICAgICAgICB9LFxyXG4gICAgfTtcclxuXHJcbiAgICBjb25zdCBiaW5hcnkgPSBhdG9iKHdhc20pO1xyXG4gICAgY29uc3QgdHlwZWRhcnJheSA9IG5ldyBVaW50OEFycmF5KGJpbmFyeS5sZW5ndGgpO1xyXG4gICAgZm9yICh2YXIgaT0wOyBpPGJpbmFyeS5sZW5ndGg7ICsraSkgeyB0eXBlZGFycmF5W2ldID0gYmluYXJ5LmNoYXJDb2RlQXQoaSk7IH1cclxuXHJcbiAgICBXZWJBc3NlbWJseS5jb21waWxlKHR5cGVkYXJyYXkpLnRoZW4oZnVuY3Rpb24gKG0pIHtcclxuICAgICAgICBpZiAoZmFsc2UpIHtcclxuICAgICAgICAgICAgV2ViQXNzZW1ibHkuTW9kdWxlLmltcG9ydHMobSkuZm9yRWFjaChmdW5jdGlvbiAoaW1wKSB7XHJcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcImltcG9ydFwiLCBpbXApO1xyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgV2ViQXNzZW1ibHkuTW9kdWxlLmV4cG9ydHMobSkuZm9yRWFjaChmdW5jdGlvbiAoZXhwKSB7XHJcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcImV4cG9ydFwiLCBleHApO1xyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIFdlYkFzc2VtYmx5Lmluc3RhbnRpYXRlKG0sIGltcG9ydHMpO1xyXG4gICAgfSkudGhlbihmdW5jdGlvbiAobSkge1xyXG4gICAgICAgIG1lbW9yeSA9IDxhbnk+bS5leHBvcnRzLm1lbW9yeTtcclxuICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICAobS5leHBvcnRzLm1haW4gYXMgYW55KSgpO1xyXG4gICAgICAgICAgICBwcm9jX2V4aXQoMCk7XHJcbiAgICAgICAgfSBjYXRjaCAoZSkge1xyXG4gICAgICAgICAgICBpZiAoZSAhPT0gXCJleGl0XCIpIHtcclxuICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoZSk7XHJcbiAgICAgICAgICAgICAgICBkZWJ1Z2dlcjtcclxuICAgICAgICAgICAgICAgIHRocm93IGU7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9IGZpbmFsbHkge1xyXG4gICAgICAgICAgICBzZWxmLmNsb3NlKCk7XHJcbiAgICAgICAgfVxyXG4gICAgfSk7XHJcbn1cclxuIiwidmFyIG1haW5fZG9tX3dvcmtlciA6IFdvcmtlcjtcclxuZnVuY3Rpb24gbWFpbl9kb20oKSB7XHJcbiAgICBjb25zdCBlQ29uICAgICAgPSByZXF1aXJlRWxlbWVudEJ5SWQoXCJjb25zb2xlXCIpO1xyXG4gICAgY29uc3QgZUN1cnNvciAgID0gcmVxdWlyZUVsZW1lbnRCeUlkKFwiY3Vyc29yXCIpO1xyXG5cclxuICAgIGNvbnN0IHN0ZGluID0gbmV3IGlvLlNoYXJlZENpcmN1bGFyQnVmZmVyKDgxOTIpO1xyXG5cclxuICAgIC8vIHNwYXduIHdlYiB3b3JrZXJcclxuICAgIGNvbnN0IGJsb2IgPSBuZXcgQmxvYig8QmxvYlBhcnRbXT5BcnJheS5wcm90b3R5cGUubWFwLmNhbGwoZG9jdW1lbnQucXVlcnlTZWxlY3RvckFsbCgnc2NyaXB0Om5vdChbZGF0YS1qcy13b3JrZXI9XFwnZmFsc2VcXCddKScpLCBmdW5jdGlvbiAob1NjcmlwdCkgeyByZXR1cm4gb1NjcmlwdC50ZXh0Q29udGVudDsgfSkse3R5cGU6ICd0ZXh0L2phdmFzY3JpcHQnfSk7XHJcbiAgICBtYWluX2RvbV93b3JrZXIgPSBuZXcgV29ya2VyKHdpbmRvdy5VUkwuY3JlYXRlT2JqZWN0VVJMKGJsb2IpKTtcclxuICAgIG1haW5fZG9tX3dvcmtlci5vbm1lc3NhZ2UgPSBmdW5jdGlvbihlOiB3b3JrMmRvbS5FdmVudCkge1xyXG4gICAgICAgIHN3aXRjaCAoZS5kYXRhLmtpbmQpIHtcclxuICAgICAgICAgICAgY2FzZSBcImNvbnNvbGVcIjpcclxuICAgICAgICAgICAgICAgIGVDb24uaW5zZXJ0QmVmb3JlKGRvY3VtZW50LmNyZWF0ZVRleHROb2RlKGUuZGF0YS50ZXh0KSwgZUN1cnNvcik7XHJcbiAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgY2FzZSBcInByb2NfZXhpdFwiOlxyXG4gICAgICAgICAgICAgICAgdmFyIGV4aXQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwic3BhblwiKTtcclxuICAgICAgICAgICAgICAgIGV4aXQudGV4dENvbnRlbnQgPSBgXFxucHJvY2VzcyBleGl0ZWQgd2l0aCBjb2RlICR7ZS5kYXRhLmNvZGV9YDtcclxuICAgICAgICAgICAgICAgIGV4aXQuc3R5bGUuY29sb3IgPSBlLmRhdGEuY29kZSA9PSAwID8gXCIjODg4XCIgOiBcIiNDNDRcIjtcclxuICAgICAgICAgICAgICAgIGVDb24uaW5zZXJ0QmVmb3JlKGV4aXQsIGVDdXJzb3IpO1xyXG4gICAgICAgICAgICAgICAgZUNvbi5yZW1vdmVDaGlsZChlQ3Vyc29yKTtcclxuICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICBkZWZhdWx0OlxyXG4gICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcihcInVuZXhwZWN0ZWQgZXZlbnQga2luZFwiLCBlLmRhdGEua2luZCk7XHJcbiAgICAgICAgICAgICAgICBkZWJ1Z2dlcjtcclxuICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgIH1cclxuICAgIH07XHJcbiAgICBkb20yd29yay5wb3N0KHtcclxuICAgICAgICBraW5kOiBcImluaXRcIixcclxuICAgICAgICBzdGRpbjogc3RkaW4uc2FiLFxyXG4gICAgfSk7XHJcblxyXG4gICAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcihcImtleXByZXNzXCIsIGZ1bmN0aW9uKGUpIHtcclxuICAgICAgICB2YXIgdGV4dCA9IGUuY2hhciB8fCBTdHJpbmcuZnJvbUNoYXJDb2RlKGUuY2hhckNvZGUpO1xyXG4gICAgICAgIGlmICh0ZXh0ID09PSBcIlxcclwiKSB7IHRleHQgPSBcIlxcblwiOyB9XHJcbiAgICAgICAgc3RkaW4ud3JpdGVfYWxsKHRleHQpO1xyXG4gICAgfSk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHJlcXVpcmVFbGVtZW50QnlJZChpZDogc3RyaW5nKTogSFRNTEVsZW1lbnQge1xyXG4gICAgbGV0IGVsID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoaWQpO1xyXG4gICAgaWYgKCFlbCkgeyB0aHJvdyBgbm8gc3VjaCBlbGVtZW50IGluIGRvY3VtZW50OiAjJHtpZH1gOyB9XHJcbiAgICByZXR1cm4gZWw7XHJcbn1cclxuIiwiZnVuY3Rpb24gbWFpbl93b3JrZXIoKSB7XHJcbiAgICBzZWxmLm9ubWVzc2FnZSA9IGZ1bmN0aW9uKGU6IGRvbTJ3b3JrLkV2ZW50KSB7XHJcbiAgICAgICAgc3dpdGNoIChlLmRhdGEua2luZCkge1xyXG4gICAgICAgICAgICBjYXNlIFwiaW5pdFwiOlxyXG4gICAgICAgICAgICAgICAgZXhlY19iYXNlNjRfd2FzbShlLmRhdGEsIFwie0JBU0U2NF9XQVNNMzJ9XCIpO1xyXG4gICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIGRlZmF1bHQ6XHJcbiAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKFwidW5leHBlY3RlZCBldmVudCBraW5kXCIsIGUuZGF0YS5raW5kKTtcclxuICAgICAgICAgICAgICAgIGRlYnVnZ2VyO1xyXG4gICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgfVxyXG4gICAgfTtcclxufVxyXG4iLCJuYW1lc3BhY2UgaW8ge1xyXG4gICAgY29uc3QgQ0FOX1dBSVQgICAgICA9IFwid2FpdFwiIGluIEF0b21pY3M7XHJcbiAgICBjb25zdCBQUk9EVUNFRF9JRFggID0gMDtcclxuICAgIGNvbnN0IENPTlNVTUVEX0lEWCAgPSAxO1xyXG5cclxuICAgIGV4cG9ydCBjbGFzcyBTaGFyZWRDaXJjdWxhckJ1ZmZlciB7XHJcbiAgICAgICAgcmVhZG9ubHkgc2FiOiBTaGFyZWRBcnJheUJ1ZmZlcjtcclxuICAgICAgICB3cml0ZV9vdmVyZmxvdz86IG51bWJlcltdO1xyXG5cclxuICAgICAgICBjb25zdHJ1Y3RvcihsZW5ndGhfb3JfZXhpc3Rpbmc6IG51bWJlciB8IFNoYXJlZEFycmF5QnVmZmVyKSB7XHJcbiAgICAgICAgICAgIGlmICh0eXBlb2YgbGVuZ3RoX29yX2V4aXN0aW5nID09PSBcIm51bWJlclwiKSB7XHJcbiAgICAgICAgICAgICAgICBjb25zdCBuID0gbGVuZ3RoX29yX2V4aXN0aW5nO1xyXG4gICAgICAgICAgICAgICAgY29uc29sZS5hc3NlcnQobiA9PT0gKG58MCksIFwibGVuZ3RoIGlzbid0IGFuIGludGVnZXJcIik7XHJcbiAgICAgICAgICAgICAgICBjb25zb2xlLmFzc2VydChuID4gMCwgXCJsZW5ndGggbXVzdCBiZSBwb3NpdGl2ZVwiKTtcclxuICAgICAgICAgICAgICAgIGNvbnNvbGUuYXNzZXJ0KChuICYgKG4tMSkpID09PSAwLCBcImxlbmd0aCBtdXN0IGJlIGEgcG93ZXIgb2YgMlwiKTtcclxuICAgICAgICAgICAgICAgIHRoaXMuc2FiID0gbmV3IFNoYXJlZEFycmF5QnVmZmVyKG4gKyA4KTtcclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIGNvbnNvbGUuYXNzZXJ0KGxlbmd0aF9vcl9leGlzdGluZy5ieXRlTGVuZ3RoID4gOCk7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnNhYiA9IGxlbmd0aF9vcl9leGlzdGluZztcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8gbWF5IGJsb2NrIGlmIHRoZSBidWZmZXIgaXMgZnVsbFxyXG4gICAgICAgIHdyaXRlX2FsbChkYXRhOiBVaW50OEFycmF5IHwgbnVtYmVyW10gfCBzdHJpbmcpIHtcclxuICAgICAgICAgICAgbGV0IGJ5dGVzIDogVWludDhBcnJheSB8IG51bWJlcltdO1xyXG4gICAgICAgICAgICBpZiAodHlwZW9mIGRhdGEgPT09IFwic3RyaW5nXCIpIHtcclxuICAgICAgICAgICAgICAgIGJ5dGVzID0gbmV3IFRleHRFbmNvZGVyKCkuZW5jb2RlKGRhdGEpO1xyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgYnl0ZXMgPSBkYXRhO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBjb25zdCBhdG9taWNzICAgPSBuZXcgSW50MzJBcnJheSh0aGlzLnNhYiwgMCwgMik7XHJcbiAgICAgICAgICAgIGNvbnN0IG1lbW9yeSAgICA9IG5ldyBVaW50OEFycmF5KHRoaXMuc2FiLCA4KTtcclxuICAgICAgICAgICAgY29uc3QgbWFzayAgICAgID0gbWVtb3J5Lmxlbmd0aC0xO1xyXG5cclxuICAgICAgICAgICAgbGV0IHBvcyA9IDA7XHJcbiAgICAgICAgICAgIGxldCBwcm9kdWNlZCA9IGF0b21pY3NbUFJPRFVDRURfSURYXTtcclxuICAgICAgICAgICAgd2hpbGUgKHBvcyA8IGJ5dGVzLmxlbmd0aCkge1xyXG4gICAgICAgICAgICAgICAgLy8gd2FpdCBmb3IgZnJlZSBzcGFjZVxyXG4gICAgICAgICAgICAgICAgbGV0IGNvbnN1bWVkID0gQXRvbWljcy5sb2FkKGF0b21pY3MsIENPTlNVTUVEX0lEWCk7XHJcbiAgICAgICAgICAgICAgICBsZXQgd3JpdGVhYmxlID0gbWVtb3J5Lmxlbmd0aCAtIChwcm9kdWNlZCAtIGNvbnN1bWVkKXwwO1xyXG4gICAgICAgICAgICAgICAgaWYgKHdyaXRlYWJsZSA9PT0gMCkge1xyXG4gICAgICAgICAgICAgICAgICAgIGlmICghQ0FOX1dBSVQpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXMud3JpdGVfb3ZlcmZsb3cgPT09IHVuZGVmaW5lZCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy53cml0ZV9vdmVyZmxvdyA9IFtdO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbGV0IHRvX3dyaXRlID0gdGhpcy53cml0ZV9vdmVyZmxvdztcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLndyaXRlX292ZXJmbG93ID0gdW5kZWZpbmVkO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICh0b193cml0ZSAhPT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMud3JpdGVfYWxsKHRvX3dyaXRlKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9LCAwKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgbiA9IGJ5dGVzLmxlbmd0aC1wb3M7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGZvciAodmFyIGk9MDsgaTxuOyArK2kpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMud3JpdGVfb3ZlcmZsb3cucHVzaChieXRlc1twb3MraV0pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgQXRvbWljcy53YWl0KGF0b21pY3MsIENPTlNVTUVEX0lEWCwgY29uc3VtZWQpO1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN1bWVkID0gQXRvbWljcy5sb2FkKGF0b21pY3MsIENPTlNVTUVEX0lEWCk7XHJcbiAgICAgICAgICAgICAgICAgICAgd3JpdGVhYmxlID0gbWVtb3J5Lmxlbmd0aCAtIChwcm9kdWNlZCAtIGNvbnN1bWVkKXwwO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgY29uc29sZS5hc3NlcnQod3JpdGVhYmxlID4gMCk7XHJcblxyXG4gICAgICAgICAgICAgICAgLy8gd3JpdGUgZGF0YVxyXG4gICAgICAgICAgICAgICAgY29uc3QgbiA9IE1hdGgubWluKHdyaXRlYWJsZSwgYnl0ZXMubGVuZ3RoLXBvcyk7XHJcbiAgICAgICAgICAgICAgICBmb3IgKHZhciBpPTA7IGk8bjsgKytpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgbWVtb3J5Wyhwcm9kdWNlZCtpKSZtYXNrXSA9IGJ5dGVzW3BvcytpXTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIHBvcyArPSBuO1xyXG4gICAgICAgICAgICAgICAgcHJvZHVjZWQgPSAocHJvZHVjZWQgKyBuKXwwO1xyXG4gICAgICAgICAgICAgICAgQXRvbWljcy5zdG9yZShhdG9taWNzLCBQUk9EVUNFRF9JRFgsIHByb2R1Y2VkKTtcclxuICAgICAgICAgICAgICAgIEF0b21pY3Mubm90aWZ5KGF0b21pY3MsIFBST0RVQ0VEX0lEWCwgK0luZmluaXR5KTsgLy8gb25seSBuZWNlc3NhcnkgaWYgdGFsa2luZyB0byBhbm90aGVyIHdvcmtlciB0aHJlYWQsIGJ1dCBoYXJtbGVzcyBpZiB0YWxraW5nIHRvIGEgRE9NIHRocmVhZFxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvLyBtYXkgcmV0dXJuIDAgYnl0ZXMgaW4gRE9NL1VJIHRocmVhZHNcclxuICAgICAgICB0cnlfcmVhZChtYXg6IG51bWJlcik6IFVpbnQ4QXJyYXkge1xyXG4gICAgICAgICAgICBjb25zdCBhdG9taWNzICAgPSBuZXcgSW50MzJBcnJheSh0aGlzLnNhYiwgMCwgMik7XHJcbiAgICAgICAgICAgIGNvbnN0IG1lbW9yeSAgICA9IG5ldyBVaW50OEFycmF5KHRoaXMuc2FiLCA4KTtcclxuICAgICAgICAgICAgY29uc3QgbWFzayAgICAgID0gbWVtb3J5Lmxlbmd0aC0xO1xyXG5cclxuICAgICAgICAgICAgbGV0IGNvbnN1bWVkID0gYXRvbWljc1tDT05TVU1FRF9JRFhdO1xyXG4gICAgICAgICAgICBpZiAoQ0FOX1dBSVQpIHsgQXRvbWljcy53YWl0KGF0b21pY3MsIFBST0RVQ0VEX0lEWCwgY29uc3VtZWQpOyB9XHJcbiAgICAgICAgICAgIGNvbnN0IHByb2R1Y2VkID0gQXRvbWljcy5sb2FkKGF0b21pY3MsIFBST0RVQ0VEX0lEWCk7XHJcbiAgICAgICAgICAgIGNvbnN0IHJlYWQgPSBNYXRoLm1pbihtYXgsIChwcm9kdWNlZC1jb25zdW1lZCl8MCk7XHJcbiAgICAgICAgICAgIGNvbnN0IGJ1ZiA9IG5ldyBVaW50OEFycmF5KHJlYWQpO1xyXG4gICAgICAgICAgICBmb3IgKGxldCBpPTA7IGk8cmVhZDsgKytpKSB7XHJcbiAgICAgICAgICAgICAgICBidWZbaV0gPSBtZW1vcnlbKGNvbnN1bWVkK2kpJm1hc2tdO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGNvbnN1bWVkID0gKGNvbnN1bWVkICsgcmVhZCl8MDtcclxuICAgICAgICAgICAgQXRvbWljcy5zdG9yZShhdG9taWNzLCBDT05TVU1FRF9JRFgsIGNvbnN1bWVkKTtcclxuICAgICAgICAgICAgQXRvbWljcy5ub3RpZnkoYXRvbWljcywgQ09OU1VNRURfSURYLCArSW5maW5pdHkpOyAvLyBvbmx5IG5lY2Vzc2FyeSBpZiB0YWxraW5nIHRvIGFub3RoZXIgd29ya2VyIHRocmVhZCwgYnV0IGhhcm1sZXNzIGlmIHRhbGtpbmcgdG8gYSBET00gdGhyZWFkXHJcbiAgICAgICAgICAgIHJldHVybiBidWY7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG59XHJcbiIsIm5hbWVzcGFjZSBkb20yd29yayB7XHJcbiAgICBleHBvcnQgaW50ZXJmYWNlIEluaXQge1xyXG4gICAgICAgIGtpbmQ6ICAgXCJpbml0XCI7XHJcbiAgICAgICAgc3RkaW46ICBTaGFyZWRBcnJheUJ1ZmZlcixcclxuICAgIH1cclxuXHJcbiAgICBpbnRlcmZhY2UgT3RoZXIge1xyXG4gICAgICAgIGtpbmQ6IFwiX290aGVyXCI7XHJcbiAgICB9XHJcblxyXG4gICAgdHlwZSBEYXRhID0gSW5pdCB8IE90aGVyO1xyXG5cclxuICAgIGV4cG9ydCBpbnRlcmZhY2UgRXZlbnQgZXh0ZW5kcyBNZXNzYWdlRXZlbnQge1xyXG4gICAgICAgIHJlYWRvbmx5IGRhdGE6IERhdGE7XHJcbiAgICB9XHJcblxyXG4gICAgZXhwb3J0IGZ1bmN0aW9uIHBvc3QoZGF0YTogRGF0YSkge1xyXG4gICAgICAgIG1haW5fZG9tX3dvcmtlci5wb3N0TWVzc2FnZShkYXRhKTtcclxuICAgIH1cclxufVxyXG4iLCJuYW1lc3BhY2Ugd29yazJkb20ge1xyXG4gICAgaW50ZXJmYWNlIENvbnNvbGUge1xyXG4gICAgICAgIGtpbmQ6ICAgXCJjb25zb2xlXCI7XHJcbiAgICAgICAgdGV4dDogICBzdHJpbmc7XHJcbiAgICB9XHJcblxyXG4gICAgaW50ZXJmYWNlIFByb2NFeGl0IHtcclxuICAgICAgICBraW5kOiAgIFwicHJvY19leGl0XCI7XHJcbiAgICAgICAgY29kZTogICBudW1iZXI7XHJcbiAgICB9XHJcblxyXG4gICAgaW50ZXJmYWNlIE90aGVyIHtcclxuICAgICAgICBraW5kOiAgIFwiX290aGVyXCI7XHJcbiAgICB9XHJcblxyXG4gICAgdHlwZSBEYXRhID0gQ29uc29sZSB8IFByb2NFeGl0IHwgT3RoZXI7XHJcblxyXG4gICAgZXhwb3J0IGludGVyZmFjZSBFdmVudCBleHRlbmRzIE1lc3NhZ2VFdmVudCB7XHJcbiAgICAgICAgcmVhZG9ubHkgZGF0YTogRGF0YTtcclxuICAgIH1cclxuXHJcbiAgICBleHBvcnQgZnVuY3Rpb24gcG9zdChtZXNzYWdlOiBEYXRhKSB7XHJcbiAgICAgICAgLy8gaHR0cHM6Ly9kZXZlbG9wZXIubW96aWxsYS5vcmcvZW4tVVMvZG9jcy9XZWIvQVBJL0RlZGljYXRlZFdvcmtlckdsb2JhbFNjb3BlL3Bvc3RNZXNzYWdlIG5vdFxyXG4gICAgICAgIC8vIGh0dHBzOi8vZGV2ZWxvcGVyLm1vemlsbGEub3JnL2VuLVVTL2RvY3MvV2ViL0FQSS9XaW5kb3cvcG9zdE1lc3NhZ2VcclxuICAgICAgICAoc2VsZiBhcyBhbnkpLnBvc3RNZXNzYWdlKG1lc3NhZ2UpO1xyXG4gICAgfVxyXG59XHJcbiJdfQ==