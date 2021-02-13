"use strict";
const PAGE_SIZE = (64 * 1024);
const ATOMIC_STDIN_FILLED = 0;
const ATOMIC_STDIN_CONSUMED = 1;
const ATOMIC_COUNT = 2;
const STDIN_BITS = 10;
const STDIN_COUNT = (1 << STDIN_BITS);
const STDIN_MASK = STDIN_COUNT - 1;
function exec_base64_wasm(wasm) {
    var exports;
    var memory;
    function main() {
        try {
            (exports.main)();
            if (unwinding) {
                unwinding = false;
                exports.asyncify_stop_unwind();
            }
            else {
                proc_exit(0);
            }
        }
        catch (e) {
            if (e !== "exit") {
                console.error(e);
                debugger;
                throw e;
            }
        }
    }
    const asyncify_page_count = 1;
    const asyncify_byte_count = asyncify_page_count * PAGE_SIZE;
    var asyncify_page_idx;
    var asyncify_byte_idx;
    var rewinding = false;
    var unwinding = false;
    var rewind_result = undefined;
    var rewind_exception = undefined;
    function asyncify(f, waiting) {
        if (!rewinding) {
            f().then((result) => {
                rewinding = true;
                rewind_result = result;
                rewind_exception = undefined;
                exports.asyncify_start_rewind(asyncify_byte_idx);
                main();
            }, (error_reason) => {
                rewinding = true;
                rewind_result = undefined;
                rewind_exception = error_reason === undefined ? "undefined reason" : error_reason;
                exports.asyncify_start_rewind(asyncify_byte_idx);
                main();
            });
            unwinding = true;
            const ctx = new Uint32Array(memory.buffer, asyncify_byte_idx, 8);
            ctx[0] = asyncify_byte_idx + 8;
            ctx[1] = asyncify_byte_idx + asyncify_byte_count;
            exports.asyncify_start_unwind(asyncify_byte_idx);
            return waiting;
        }
        else {
            rewinding = false;
            exports.asyncify_stop_rewind();
            if (rewind_exception !== undefined) {
                throw rewind_exception;
            }
            return rewind_result;
        }
        ;
    }
    const ERRNO_SUCCESS = 0;
    const ERRNO_2BIG = 1;
    const ERRNO_AGAIN = 6;
    const ERRNO_BADF = 8;
    const ERRNO_NOTCAPABLE = 76;
    const ERRNO_ASYNCIFY = 9001;
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
        return new Promise(resolve => setTimeout(() => resolve(), ms));
    }
    function sleep_ns(ns) {
        return sleep_ms(ns / 1000 / 1000);
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
        return asyncify(async () => {
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
                        var read = await stdin_read(buf_len);
                        for (var i = 0; i < read.length; ++i) {
                            var b = read[i];
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
        }, ERRNO_ASYNCIFY);
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
        console_write(text);
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
        return asyncify(async () => {
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
                            await sleep_ns(u_u_clock_timeout);
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
        }, ERRNO_ASYNCIFY);
    }
    function proc_exit(code) {
        console_write_proc_exit(code);
        throw "exit";
    }
    function proc_raise() { return nyi(); }
    function sched_yield() {
        return asyncify(async () => {
            await sleep_ms(0);
            return ERRNO_SUCCESS;
        }, ERRNO_ASYNCIFY);
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
        exports = m.exports;
        memory = exports.memory;
        asyncify_page_idx = memory.grow(asyncify_page_count);
        console.assert(asyncify_page_idx !== -1);
        asyncify_byte_idx = PAGE_SIZE * asyncify_page_idx;
        main();
    });
}
var main_dom_worker;
function main_dom() {
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
                        stdin_write(text);
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
                        stdin_write("\x08");
                        break;
                    case "Enter":
                        stdin_write("\n");
                        break;
                    case "NumpadEnter":
                        stdin_write("\n");
                        break;
                    case "Tab":
                        stdin_write("\t");
                        break;
                    case "Esc":
                        stdin_write("\x1B");
                        break;
                    case "Escape":
                        stdin_write("\x1B");
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
                        stdin_write(buffer);
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
    exec_base64_wasm("{BASE64_WASM32}");
}
function requireElementById(id) {
    let el = document.getElementById(id);
    if (!el) {
        throw `no such element in document: #${id}`;
    }
    return el;
}
const eCon = requireElementById("console");
const eInput = requireElementById("console-input");
const eCursor = requireElementById("console-cursor");
function console_write(text) {
    if (text === "")
        return;
    eCon.insertBefore(document.createTextNode(text), eInput);
}
function console_write_proc_exit(code) {
    var exit = document.createElement("span");
    exit.textContent = `\nprocess exited with code ${code}`;
    exit.style.color = code == 0 ? "#888" : "#C44";
    eCon.insertBefore(exit, eInput);
    eCon.removeChild(eCursor);
}
var stdin_buf = [];
var stdin_pending_io = [];
function stdin_read(max) {
    return new Promise((callback) => {
        stdin_pending_io.push({ max, callback });
        stdin_dispatch();
    });
}
function stdin_write(text) {
    console_write(text);
    var bytes = new TextEncoder().encode(text);
    for (var i = 0; i < bytes.length; ++i) {
        stdin_buf.push(bytes[i]);
    }
    stdin_dispatch();
}
function stdin_dispatch() {
    while (stdin_buf.length > 0 && stdin_pending_io.length > 0) {
        const io = stdin_pending_io.shift();
        if (io === undefined)
            continue;
        const nread = Math.min(stdin_buf.length, io.max);
        const read = stdin_buf.slice(0, nread);
        const after = stdin_buf.slice(nread);
        stdin_buf = after;
        (io.callback)(read);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2NyaXB0LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vc2NyaXB0L2NvbnN0YW50cy50cyIsIi4uL3NjcmlwdC9leGVjLXdhc20udHMiLCIuLi9zY3JpcHQvbWFpbi1kb20udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBLE1BQU0sU0FBUyxHQUFHLENBQUMsRUFBRSxHQUFHLElBQUksQ0FBQyxDQUFDO0FBRTlCLE1BQU0sbUJBQW1CLEdBQUssQ0FBQyxDQUFDO0FBQ2hDLE1BQU0scUJBQXFCLEdBQUcsQ0FBQyxDQUFDO0FBQ2hDLE1BQU0sWUFBWSxHQUFHLENBQUMsQ0FBQztBQUV2QixNQUFNLFVBQVUsR0FBRyxFQUFFLENBQUM7QUFDdEIsTUFBTSxXQUFXLEdBQUcsQ0FBQyxDQUFDLElBQUksVUFBVSxDQUFDLENBQUM7QUFDdEMsTUFBTSxVQUFVLEdBQUcsV0FBVyxHQUFDLENBQUMsQ0FBQztBQ1JqQyxTQUFTLGdCQUFnQixDQUFDLElBQVk7SUFDbEMsSUFBSSxPQUFpQixDQUFDO0lBQ3RCLElBQUksTUFBMkIsQ0FBQztJQUVoQyxTQUFTLElBQUk7UUFDVCxJQUFJO1lBQ0EsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQztZQUNqQixJQUFJLFNBQVMsRUFBRTtnQkFDWCxTQUFTLEdBQUcsS0FBSyxDQUFDO2dCQUNsQixPQUFPLENBQUMsb0JBQW9CLEVBQUUsQ0FBQzthQUNsQztpQkFBTTtnQkFDSCxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUM7YUFDaEI7U0FDSjtRQUFDLE9BQU8sQ0FBQyxFQUFFO1lBQ1IsSUFBSSxDQUFDLEtBQUssTUFBTSxFQUFFO2dCQUNkLE9BQU8sQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUM7Z0JBQ2pCLFFBQVEsQ0FBQztnQkFDVCxNQUFNLENBQUMsQ0FBQzthQUNYO1NBQ0o7SUFDTCxDQUFDO0lBRUQsTUFBTSxtQkFBbUIsR0FBWSxDQUFDLENBQUM7SUFDdkMsTUFBTSxtQkFBbUIs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VSxDQUFDLEdBQVEsRUFBRSxNQUFjLElBQWMsT0FBTyxRQUFRLENBQUcsR0FBRyxFQUFFLE1BQU0sQ0FBUSxDQUFDLENBQUMsQ0FBQztJQUNsRyxTQUFTLFFBQVEsQ0FBRyxHQUFRLEVBQUUsTUFBYyxJQUFjLE9BQU8sVUFBVSxDQUFDLEdBQUcsRUFBRSxNQUFNLENBQVEsQ0FBQyxDQUFDLENBQUM7SUFHbEcsU0FBUyxlQUFlLENBQUcsR0FBUSxFQUFFLE1BQWM7UUFDL0MsSUFBSSxFQUFFLEdBQUcsSUFBSSxRQUFRLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBQ3JDLElBQUksRUFBRSxHQUFHLEVBQUUsQ0FBQyxTQUFTLENBQUMsR0FBRyxHQUFHLE1BQU0sR0FBRyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFDOUMsSUFBSSxFQUFFLEdBQUcsRUFBRSxDQUFDLFNBQVMsQ0FBQyxHQUFHLEdBQUcsTUFBTSxHQUFHLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQztRQUM5QyxPQUFPLENBQUMsRUFBRSxHQUFHLFdBQVcsR0FBRyxFQUFFLENBQVEsQ0FBQztJQUMxQyxDQUFDO0lBRUQsU0FBUyxhQUFhLENBQUcsR0FBUSxFQUFFLE1BQWM7UUFDN0MsSUFBSSxFQUFFLEdBQUcsSUFBSSxRQUFRLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBQ3JDLElBQUksRUFBRSxHQUFHLEVBQUUsQ0FBQyxTQUFTLENBQUMsR0FBRyxHQUFHLE1BQU0sR0FBRyxDQUFDLEVBQUUsSUFBSSxDQUFRLENBQUM7UUFDckQsSUFBSSxFQUFFLEdBQUcsRUFBRSxDQUFDLFNBQVMsQ0FBQyxHQUFHLEdBQUcsTUFBTSxHQUFHLENBQUMsRUFBRSxJQUFJLENBQVEsQ0FBQztRQUNyRCxPQUFPLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDO0lBQ3BCLENBQUM7SUFFRCxTQUFTLFFBQVEsQ0FBTyxHQUFRLEVBQUUsTUFBYyxFQUFFLEtBQVMsSUFBUyxJQUFJLFFBQVEsQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUMsUUFBUSxDQUFFLEdBQUcsR0FBRyxNQUFNLEVBQUUsS0FBSyxDQUFPLENBQUMsQ0FBQyxDQUFDO0lBQ3ZJLFNBQVMsU0FBUyxDQUFNLEdBQVEsRUFBRSxNQUFjLEVBQUUsS0FBVSxJQUFRLElBQUksUUFBUSxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQyxTQUFTLENBQUMsR0FBRyxHQUFHLE1BQU0sRUFBRSxLQUFLLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ3ZJLFNBQVMsU0FBUyxDQUFNLEdBQVEsRUFBRSxNQUFjLEVBQUUsS0FBVSxJQUFRLElBQUksUUFBUSxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQyxTQUFTLENBQUMsR0FBRyxHQUFHLE1BQU0sRUFBRSxLQUFLLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ3ZJLFNBQVMsV0FBVyxDQUFJLEdBQVEsRUFBRSxNQUFjLEVBQUUsS0FBWSxJQUFNLFNBQVMsQ0FBRyxHQUFHLEVBQUUsTUFBTSxFQUFFLEtBQVksQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUM3RyxTQUFTLFNBQVMsQ0FBTSxHQUFRLEVBQUUsTUFBYyxFQUFFLEtBQVUsSUFBUSxXQUFXLENBQUMsR0FBRyxFQUFFLE1BQU0sRUFBRSxLQUFZLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDN0csU0FBUyxjQUFjLENBQUMsR0FBUSxFQUFFLE1BQWMsRUFBRSxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQWE7UUFDbEUsU0FBUyxDQUFDLEdBQUcsRUFBRSxNQUFNLEdBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDO1FBQzdCLFNBQVMsQ0FBQyxHQUFHLEVBQUUsTUFBTSxHQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQztJQUNqQyxDQUFDO0lBRUQsU0FBUyxLQUFLLENBQUMsR0FBUSxFQUFFLEtBQVksRUFBRSxHQUFVLElBQWMsT0FBTyxJQUFJLFFBQVEsQ0FBQyxNQUFNLENBQUMsTUFBTSxFQUFFLEdBQUcsR0FBQyxLQUFLLEVBQUUsR0FB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Y2VzQ29udGVudCI6WyJjb25zdCBQQUdFX1NJWkUgPSAoNjQgKiAxMDI0KTsgLy8gV0FTTSBwYWdlcyBhcmUgNjQgS2lCXHJcblxyXG5jb25zdCBBVE9NSUNfU1RESU5fRklMTEVEICAgPSAwO1xyXG5jb25zdCBBVE9NSUNfU1RESU5fQ09OU1VNRUQgPSAxO1xyXG5jb25zdCBBVE9NSUNfQ09VTlQgPSAyO1xyXG5cclxuY29uc3QgU1RESU5fQklUUyA9IDEwO1xyXG5jb25zdCBTVERJTl9DT1VOVCA9ICgxIDw8IFNURElOX0JJVFMpO1xyXG5jb25zdCBTVERJTl9NQVNLID0gU1RESU5fQ09VTlQtMTtcclxuIiwiZnVuY3Rpb24gZXhlY19iYXNlNjRfd2FzbSh3YXNtOiBzdHJpbmcpIHtcclxuICAgIHZhciBleHBvcnRzIDogRXhwb3J0cztcclxuICAgIHZhciBtZW1vcnkgOiBXZWJBc3NlbWJseS5NZW1vcnk7XHJcblxyXG4gICAgZnVuY3Rpb24gbWFpbigpIHtcclxuICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICAoZXhwb3J0cy5tYWluKSgpO1xyXG4gICAgICAgICAgICBpZiAodW53aW5kaW5nKSB7XHJcbiAgICAgICAgICAgICAgICB1bndpbmRpbmcgPSBmYWxzZTtcclxuICAgICAgICAgICAgICAgIGV4cG9ydHMuYXN5bmNpZnlfc3RvcF91bndpbmQoKTtcclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIHByb2NfZXhpdCgwKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0gY2F0Y2ggKGUpIHtcclxuICAgICAgICAgICAgaWYgKGUgIT09IFwiZXhpdFwiKSB7XHJcbiAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKGUpO1xyXG4gICAgICAgICAgICAgICAgZGVidWdnZXI7XHJcbiAgICAgICAgICAgICAgICB0aHJvdyBlO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGNvbnN0IGFzeW5jaWZ5X3BhZ2VfY291bnQgOiBudW1iZXIgPSAxO1xyXG4gICAgY29uc3QgYXN5bmNpZnlfYnl0ZV9jb3VudCA6IG51bWJlciA9IGFzeW5jaWZ5X3BhZ2VfY291bnQgKiBQQUdFX1NJWkU7XHJcbiAgICB2YXIgYXN5bmNpZnlfcGFnZV9pZHggOiBudW1iZXI7XHJcbiAgICB2YXIgYXN5bmNpZnlfYnl0ZV9pZHggOiBudW1iZXI7XHJcblxyXG4gICAgdmFyIHJld2luZGluZyAgICAgICAgICAgICAgICAgICA9IGZhbHNlO1xyXG4gICAgdmFyIHVud2luZGluZyAgICAgICAgICAgICAgICAgICA9IGZhbHNlO1xyXG4gICAgdmFyIHJld2luZF9yZXN1bHQgOiBhbnkgICAgICAgICA9IHVuZGVmaW5lZDtcclxuICAgIHZhciByZXdpbmRfZXhjZXB0aW9uIDogdW5rbm93biAgPSB1bmRlZmluZWQ7XHJcblxyXG4gICAgLy8gaHR0cHM6Ly9rcmlwa2VuLmdpdGh1Yi5pby9ibG9nL3dhc20vMjAxOS8wNy8xNi9hc3luY2lmeS5odG1sXHJcbiAgICBmdW5jdGlvbiBhc3luY2lmeTxSPihmOiAoKSA9PiBQcm9taXNlTGlrZTxSPiwgd2FpdGluZzogUik6IFIge1xyXG4gICAgICAgIGlmICghcmV3aW5kaW5nKSB7XHJcbiAgICAgICAgICAgIGYoKS50aGVuKFxyXG4gICAgICAgICAgICAgICAgKHJlc3VsdCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgIHJld2luZGluZyAgICAgICAgICAgPSB0cnVlO1xyXG4gICAgICAgICAgICAgICAgICAgIHJld2luZF9yZXN1bHQgICAgICAgPSByZXN1bHQ7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV3aW5kX2V4Y2VwdGlvbiAgICA9IHVuZGVmaW5lZDtcclxuICAgICAgICAgICAgICAgICAgICAvLyBzaG91bGRuJ3QgbmVlZCB0byBtb2RpZnkgbWVtb3J5IC0gc2hvdWxkJ3ZlIGJlZW4gcG9wdWxhdGVkIGJ5IGNvZGUgYmVmb3JlIGFzeW5jaWZ5X3N0YXJ0X3Vud2luZFxyXG4gICAgICAgICAgICAgICAgICAgIGV4cG9ydHMuYXN5bmNpZnlfc3RhcnRfcmV3aW5kKGFzeW5jaWZ5X2J5dGVfaWR4KTtcclxuICAgICAgICAgICAgICAgICAgICBtYWluKCk7XHJcbiAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgKGVycm9yX3JlYXNvbikgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgIHJld2luZGluZyAgICAgICAgICAgPSB0cnVlO1xyXG4gICAgICAgICAgICAgICAgICAgIHJld2luZF9yZXN1bHQgICAgICAgPSB1bmRlZmluZWQ7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV3aW5kX2V4Y2VwdGlvbiAgICA9IGVycm9yX3JlYXNvbiA9PT0gdW5kZWZpbmVkID8gXCJ1bmRlZmluZWQgcmVhc29uXCIgOiBlcnJvcl9yZWFzb247XHJcbiAgICAgICAgICAgICAgICAgICAgLy8gc2hvdWxkbid0IG5lZWQgdG8gbW9kaWZ5IG1lbW9yeSAtIHNob3VsZCd2ZSBiZWVuIHBvcHVsYXRlZCBieSBjb2RlIGJlZm9yZSBhc3luY2lmeV9zdGFydF91bndpbmRcclxuICAgICAgICAgICAgICAgICAgICBleHBvcnRzLmFzeW5jaWZ5X3N0YXJ0X3Jld2luZChhc3luY2lmeV9ieXRlX2lkeCk7XHJcbiAgICAgICAgICAgICAgICAgICAgbWFpbigpO1xyXG4gICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgKTtcclxuXHJcbiAgICAgICAgICAgIHVud2luZGluZyA9IHRydWU7XHJcbiAgICAgICAgICAgIGNvbnN0IGN0eCA9IG5ldyBVaW50MzJBcnJheShtZW1vcnkuYnVmZmVyLCBhc3luY2lmeV9ieXRlX2lkeCwgOCk7XHJcbiAgICAgICAgICAgIGN0eFswXSA9IGFzeW5jaWZ5X2J5dGVfaWR4ICsgODtcclxuICAgICAgICAgICAgY3R4WzFdID0gYXN5bmNpZnlfYnl0ZV9pZHggKyBhc3luY2lmeV9ieXRlX2NvdW50O1xyXG4gICAgICAgICAgICBleHBvcnRzLmFzeW5jaWZ5X3N0YXJ0X3Vud2luZChhc3luY2lmeV9ieXRlX2lkeCk7XHJcblxyXG4gICAgICAgICAgICByZXR1cm4gd2FpdGluZztcclxuICAgICAgICB9IGVsc2UgeyAvLyByZXdpbmRpbmdcclxuICAgICAgICAgICAgcmV3aW5kaW5nID0gZmFsc2U7XHJcbiAgICAgICAgICAgIGV4cG9ydHMuYXN5bmNpZnlfc3RvcF9yZXdpbmQoKTtcclxuICAgICAgICAgICAgaWYgKHJld2luZF9leGNlcHRpb24gIT09IHVuZGVmaW5lZCkge1xyXG4gICAgICAgICAgICAgICAgdGhyb3cgcmV3aW5kX2V4Y2VwdGlvbjtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICByZXR1cm4gcmV3aW5kX3Jlc3VsdDtcclxuICAgICAgICB9O1xyXG4gICAgfVxyXG5cclxuICAgIHR5cGUgRmQgICAgID0gbnVtYmVyICYgeyBfbm90X3JlYWw6IFwiZmRcIjsgfVxyXG4gICAgdHlwZSBFcnJubyAgPSBudW1iZXIgJiB7IF9ub3RfcmVhbDogXCJlcnJub1wiOyB9XHJcbiAgICB0eXBlIHB0ciAgICA9IG51bWJlciAmIHsgX25vdF9yZWFsOiBcInB0clwiOyB9XHJcbiAgICB0eXBlIHU4ICAgICA9IG51bWJlciAmIHsgX25vdF9yZWFsOiBcInU4XCI7IH1cclxuICAgIHR5cGUgdTE2ICAgID0gbnVtYmVyICYgeyBfbm90X3JlYWw6IFwidTE2XCI7IH1cclxuICAgIHR5cGUgdTMyICAgID0gbnVtYmVyICYgeyBfbm90X3JlYWw6IFwidTMyXCI7IH1cclxuICAgIHR5cGUgdTY0ICAgID0gbnVtYmVyICYgeyBfbm90X3JlYWw6IFwidTY0XCI7IH0gLy8gWFhYOiBudW1iZXIgb25seSBoYXMgNTIgYml0cyBvZiBwcmVjaXNpb25cclxuICAgIHR5cGUgdXNpemUgID0gbnVtYmVyICYgeyBfbm90X3JlYWw6IFwidXNpemVcIjsgfVxyXG5cclxuICAgIC8vIFJlZmVyZW5jZXM6XHJcbiAgICAvLyBodHRwczovL2RvY3MucnMvd2FzaS10eXBlcy8wLjEuNS9zcmMvd2FzaV90eXBlcy9saWIucnMuaHRtbFxyXG4gICAgLy8gaHR0cHM6Ly9kb2NzLnJzL3dhc2kvMC4xMC4yK3dhc2ktc25hcHNob3QtcHJldmlldzEvc3JjL3dhc2kvbGliX2dlbmVyYXRlZC5ycy5odG1sXHJcbiAgICAvLyBodHRwczovL2dpdGh1Yi5jb20vV2ViQXNzZW1ibHkvV0FTSS9ibG9iL21haW4vcGhhc2VzL3NuYXBzaG90L2RvY3MubWRcclxuXHJcbiAgICAvLyBodHRwczovL2RvY3MucnMvd2FzaS8wLjEwLjIrd2FzaS1zbmFwc2hvdC1wcmV2aWV3MS9zcmMvd2FzaS9saWJfZ2VuZXJhdGVkLnJzLmh0bWwjMjdcclxuICAgIGNvbnN0IEVSUk5PX1NVQ0NFU1MgICAgID0gPEVycm5vPjA7XHJcbiAgICBjb25zdCBFUlJOT18yQklHICAgICAgICA9IDxFcnJubz4xO1xyXG4gICAgY29uc3QgRVJSTk9fQUdBSU4gICAgICAgPSA8RXJybm8+NjtcclxuICAgIGNvbnN0IEVSUk5PX0JBREYgICAgICAgID0gPEVycm5vPjg7XHJcbiAgICBjb25zdCBFUlJOT19OT1RDQVBBQkxFICA9IDxFcnJubz43NjtcclxuXHJcbiAgICBjb25zdCBFUlJOT19BU1lOQ0lGWSAgICA9IDxFcnJubz45MDAxOyAvLyBYWFg/XHJcblxyXG4gICAgZnVuY3Rpb24gcmVhZF91OCggICBwdHI6IHB0ciwgb2Zmc2V0OiBudW1iZXIpOiB1OCAgICAgICB7IHJldHVybiBuZXcgRGF0YVZpZXcobWVtb3J5LmJ1ZmZlcikuZ2V0VWludDgoIHB0ciArIG9mZnNldCAgICAgICkgYXMgdTg7IH1cclxuICAgIGZ1bmN0aW9uIHJlYWRfdTE2KCAgcHRyOiBwdHIsIG9mZnNldDogbnVtYmVyKTogdTE2ICAgICAgeyByZXR1cm4gbmV3IERhdGFWaWV3KG1lbW9yeS5idWZmZXIpLmdldFVpbnQxNihwdHIgKyBvZmZzZXQsIHRydWUpIGFzIHUxNjsgfVxyXG4gICAgZnVuY3Rpb24gcmVhZF91MzIoICBwdHI6IHB0ciwgb2Zmc2V0OiBudW1iZXIpOiB1MzIgICAgICB7IHJldHVybiBuZXcgRGF0YVZpZXcobWVtb3J5LmJ1ZmZlcikuZ2V0VWludDMyKHB0ciArIG9mZnNldCwgdHJ1ZSkgYXMgdTMyOyB9XHJcbiAgICBmdW5jdGlvbiByZWFkX3VzaXplKHB0cjogcHRyLCBvZmZzZXQ6IG51bWJlcik6IHVzaXplICAgIHsgcmV0dXJuIHJlYWRfdTMyKCAgcHRyLCBvZmZzZXQpIGFzIGFueTsgfVxyXG4gICAgZnVuY3Rpb24gcmVhZF9wdHIoICBwdHI6IHB0ciwgb2Zmc2V0OiBudW1iZXIpOiBwdHIgICAgICB7IHJldHVybiByZWFkX3VzaXplKHB0ciwgb2Zmc2V0KSBhcyBhbnk7IH1cclxuXHJcbiAgICAvLyBYWFg6IGBudW1iZXJgIG9ubHkgZ3VhcmFudGVlcyA1Mi1iaXQgcHJlY2lzaW9uLCBzbyB0aGlzIGlzIHByZXR0eSBib2d1c1xyXG4gICAgZnVuY3Rpb24gcmVhZF91NjRfYXBwcm94KCAgcHRyOiBwdHIsIG9mZnNldDogbnVtYmVyKTogdTY0IHtcclxuICAgICAgICBsZXQgZHYgPSBuZXcgRGF0YVZpZXcobWVtb3J5LmJ1ZmZlcik7XHJcbiAgICAgICAgbGV0IGxvID0gZHYuZ2V0VWludDMyKHB0ciArIG9mZnNldCArIDAsIHRydWUpO1xyXG4gICAgICAgIGxldCBoaSA9IGR2LmdldFVpbnQzMihwdHIgKyBvZmZzZXQgKyA0LCB0cnVlKTtcclxuICAgICAgICByZXR1cm4gKGhpICogMHgxMDAwMDAwMDAgKyBsbykgYXMgdTY0O1xyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIHJlYWRfdTY0X3BhaXIoICBwdHI6IHB0ciwgb2Zmc2V0OiBudW1iZXIpOiBbdTMyLCB1MzJdIHtcclxuICAgICAgICBsZXQgZHYgPSBuZXcgRGF0YVZpZXcobWVtb3J5LmJ1ZmZlcik7XHJcbiAgICAgICAgbGV0IGxvID0gZHYuZ2V0VWludDMyKHB0ciArIG9mZnNldCArIDAsIHRydWUpIGFzIHUzMjtcclxuICAgICAgICBsZXQgaGkgPSBkdi5nZXRVaW50MzIocHRyICsgb2Zmc2V0ICsgNCwgdHJ1ZSkgYXMgdTMyO1xyXG4gICAgICAgIHJldHVybiBbbG8sIGhpXTtcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiB3cml0ZV91OCggICAgICBwdHI6IHB0ciwgb2Zmc2V0OiBudW1iZXIsIHZhbHVlOiB1OCAgICAgKSB7IG5ldyBEYXRhVmlldyhtZW1vcnkuYnVmZmVyKS5zZXRVaW50OCggcHRyICsgb2Zmc2V0LCB2YWx1ZSAgICAgICk7IH1cclxuICAgIGZ1bmN0aW9uIHdyaXRlX3UxNiggICAgIHB0cjogcHRyLCBvZmZzZXQ6IG51bWJlciwgdmFsdWU6IHUxNiAgICApIHsgbmV3IERhdGFWaWV3KG1lbW9yeS5idWZmZXIpLnNldFVpbnQxNihwdHIgKyBvZmZzZXQsIHZhbHVlLCB0cnVlKTsgfVxyXG4gICAgZnVuY3Rpb24gd3JpdGVfdTMyKCAgICAgcHRyOiBwdHIsIG9mZnNldDogbnVtYmVyLCB2YWx1ZTogdTMyICAgICkgeyBuZXcgRGF0YVZpZXcobWVtb3J5LmJ1ZmZlcikuc2V0VWludDMyKHB0ciArIG9mZnNldCwgdmFsdWUsIHRydWUpOyB9XHJcbiAgICBmdW5jdGlvbiB3cml0ZV91c2l6ZSggICBwdHI6IHB0ciwgb2Zmc2V0OiBudW1iZXIsIHZhbHVlOiB1c2l6ZSAgKSB7IHdyaXRlX3UzMiggIHB0ciwgb2Zmc2V0LCB2YWx1ZSBhcyBhbnkpOyB9XHJcbiAgICBmdW5jdGlvbiB3cml0ZV9wdHIoICAgICBwdHI6IHB0ciwgb2Zmc2V0OiBudW1iZXIsIHZhbHVlOiBwdHIgICAgKSB7IHdyaXRlX3VzaXplKHB0ciwgb2Zmc2V0LCB2YWx1ZSBhcyBhbnkpOyB9XHJcbiAgICBmdW5jdGlvbiB3cml0ZV91NjRfcGFpcihwdHI6IHB0ciwgb2Zmc2V0OiBudW1iZXIsIFtsbywgaGldOiBbdTMyLCB1MzJdKSB7XHJcbiAgICAgICAgd3JpdGVfdTMyKHB0ciwgb2Zmc2V0KzAsIGxvKTtcclxuICAgICAgICB3cml0ZV91MzIocHRyLCBvZmZzZXQrNCwgaGkpO1xyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIHNsaWNlKHB0cjogcHRyLCBzdGFydDogdXNpemUsIGVuZDogdXNpemUpOiBEYXRhVmlldyB7IHJldHVybiBuZXcgRGF0YVZpZXcobWVtb3J5LmJ1ZmZlciwgcHRyK3N0YXJ0LCBlbmQtc3RhcnQpOyB9XHJcbiAgICBmdW5jdGlvbiBzbGljZTgocHRyOiBwdHIsIHN0YXJ0OiB1c2l6ZSwgZW5kOiB1c2l6ZSk6IFVpbnQ4QXJyYXkgeyByZXR1cm4gbmV3IFVpbnQ4QXJyYXkobWVtb3J5LmJ1ZmZlciwgcHRyK3N0YXJ0LCBlbmQtc3RhcnQpOyB9XHJcblxyXG4gICAgZnVuY3Rpb24gc2xlZXBfbXMobXM6IG51bWJlcik6IFByb21pc2U8dm9pZD4ge1xyXG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZShyZXNvbHZlID0+IHNldFRpbWVvdXQoKCkgPT4gcmVzb2x2ZSgpLCBtcykpO1xyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIHNsZWVwX25zKG5zOiBudW1iZXIpOiBQcm9taXNlPHZvaWQ+IHtcclxuICAgICAgICByZXR1cm4gc2xlZXBfbXMobnMgLyAxMDAwIC8gMTAwMCk7XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gbnlpKCk6IEVycm5vIHtcclxuICAgICAgICBkZWJ1Z2dlcjtcclxuICAgICAgICByZXR1cm4gRVJSTk9fTk9UQ0FQQUJMRTtcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBhcmdzX2dldCAgICAgICAgICAgICAgICAgICAoKTogRXJybm8geyByZXR1cm4gbnlpKCk7IH1cclxuICAgIGZ1bmN0aW9uIGFyZ3Nfc2l6ZXNfZ2V0ICAgICAgICAgICAgICgpOiBFcnJubyB7IHJldHVybiBueWkoKTsgfVxyXG4gICAgZnVuY3Rpb24gZW52aXJvbl9nZXQgICAgICAgICAgICAgICAgKCk6IEVycm5vIHsgcmV0dXJuIG55aSgpOyB9XHJcbiAgICBmdW5jdGlvbiBlbnZpcm9uX3NpemVzX2dldCAgICAgICAgICAoKTogRXJybm8geyByZXR1cm4gbnlpKCk7IH1cclxuICAgIGZ1bmN0aW9uIGNsb2NrX3Jlc19nZXQgICAgICAgICAgICAgICgpOiBFcnJubyB7IHJldHVybiBueWkoKTsgfVxyXG4gICAgZnVuY3Rpb24gY2xvY2tfdGltZV9nZXQgICAgICAgICAgICAgKCk6IEVycm5vIHsgcmV0dXJuIG55aSgpOyB9XHJcbiAgICBmdW5jdGlvbiBmZF9hZHZpc2UgICAgICAgICAgICAgICAgICAoKTogRXJybm8geyByZXR1cm4gbnlpKCk7IH1cclxuICAgIGZ1bmN0aW9uIGZkX2FsbG9jYXRlICAgICAgICAgICAgICAgICgpOiBFcnJubyB7IHJldHVybiBueWkoKTsgfVxyXG4gICAgZnVuY3Rpb24gZmRfY2xvc2UgICAgICAgICAgICAgICAgICAgKCk6IEVycm5vIHsgcmV0dXJuIG55aSgpOyB9XHJcbiAgICBmdW5jdGlvbiBmZF9kYXRhc3luYyAgICAgICAgICAgICAgICAoKTogRXJybm8geyByZXR1cm4gbnlpKCk7IH1cclxuICAgIGZ1bmN0aW9uIGZkX2Zkc3RhdF9nZXQgICAgICAgICAgICAgICgpOiBFcnJubyB7IHJldHVybiBueWkoKTsgfVxyXG4gICAgZnVuY3Rpb24gZmRfZmRzdGF0X3NldF9mbGFncyAgICAgICAgKCk6IEVycm5vIHsgcmV0dXJuIG55aSgpOyB9XHJcbiAgICBmdW5jdGlvbiBmZF9mZHN0YXRfc2V0X3JpZ2h0cyAgICAgICAoKTogRXJybm8geyByZXR1cm4gbnlpKCk7IH1cclxuICAgIGZ1bmN0aW9uIGZkX2ZpbGVzdGF0X2dldCAgICAgICAgICAgICgpOiBFcnJubyB7IHJldHVybiBueWkoKTsgfVxyXG4gICAgZnVuY3Rpb24gZmRfZmlsZXN0YXRfc2V0X3NpemUgICAgICAgKCk6IEVycm5vIHsgcmV0dXJuIG55aSgpOyB9XHJcbiAgICBmdW5jdGlvbiBmZF9maWxlc3RhdF9zZXRfdGltZXMgICAgICAoKTogRXJybm8geyByZXR1cm4gbnlpKCk7IH1cclxuICAgIGZ1bmN0aW9uIGZkX3ByZWFkICAgICAgICAgICAgICAgICAgICgpOiBFcnJubyB7IHJldHVybiBueWkoKTsgfVxyXG4gICAgZnVuY3Rpb24gZmRfcHJlc3RhdF9nZXQgICAgICAgICAgICAgKCk6IEVycm5vIHsgcmV0dXJuIG55aSgpOyB9XHJcbiAgICBmdW5jdGlvbiBmZF9wcmVzdGF0X2Rpcl9uYW1lICAgICAgICAoKTogRXJybm8geyByZXR1cm4gbnlpKCk7IH1cclxuICAgIGZ1bmN0aW9uIGZkX3B3cml0ZSAgICAgICAgICAgICAgICAgICgpOiBFcnJubyB7IHJldHVybiBueWkoKTsgfVxyXG5cclxuICAgIGZ1bmN0aW9uIGZkX3JlYWQoZmQ6IEZkLCBpb3ZlY19hcnJheV9wdHI6IHB0ciwgaW92ZWNfYXJyYXlfbGVuOiB1c2l6ZSwgbnJlYWRfcHRyOiBwdHIpOiBFcnJubyB7IHJldHVybiBhc3luY2lmeShhc3luYyAoKSA9PiB7XHJcbiAgICAgICAgLy8gaHR0cHM6Ly9kb2NzLnJzL3dhc2kvMC4xMC4yK3dhc2ktc25hcHNob3QtcHJldmlldzEvc3JjL3dhc2kvbGliX2dlbmVyYXRlZC5ycy5odG1sIzE3NTRcclxuXHJcbiAgICAgICAgdmFyIG5yZWFkID0gMDtcclxuICAgICAgICB2YXIgZXJybm8gPSBFUlJOT19TVUNDRVNTO1xyXG5cclxuICAgICAgICBmb3IgKHZhciBpb3ZlY19pZHggPSAwOyBpb3ZlY19pZHggPCBpb3ZlY19hcnJheV9sZW47ICsraW92ZWNfaWR4KSB7XHJcbiAgICAgICAgICAgIHZhciBidWZfcHRyID0gcmVhZF9wdHIoaW92ZWNfYXJyYXlfcHRyLCA4ICogaW92ZWNfaWR4ICsgMCk7XHJcbiAgICAgICAgICAgIHZhciBidWZfbGVuID0gcmVhZF91c2l6ZShpb3ZlY19hcnJheV9wdHIsIDggKiBpb3ZlY19pZHggKyA0KTtcclxuICAgICAgICAgICAgaWYgKGJ1Zl9sZW4gPD0gMCkgeyBjb250aW51ZTsgfVxyXG5cclxuICAgICAgICAgICAgc3dpdGNoIChmZCkge1xyXG4gICAgICAgICAgICAgICAgY2FzZSAwOiAvLyBzdGRpblxyXG4gICAgICAgICAgICAgICAgICAgIHZhciByZWFkID0gYXdhaXQgc3RkaW5fcmVhZChidWZfbGVuKTtcclxuICAgICAgICAgICAgICAgICAgICBmb3IgKHZhciBpPTA7IGk8cmVhZC5sZW5ndGg7ICsraSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgYiA9IHJlYWRbaV0gYXMgdTg7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHdyaXRlX3U4KGJ1Zl9wdHIsIGksIGIpO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICBucmVhZCArPSByZWFkLmxlbmd0aDtcclxuICAgICAgICAgICAgICAgICAgICBpZiAocmVhZC5sZW5ndGggPCBidWZfbGVuKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHdyaXRlX3VzaXplKG5yZWFkX3B0ciwgMCwgbnJlYWQgYXMgdXNpemUpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gZXJybm87XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgZGVmYXVsdDpcclxuICAgICAgICAgICAgICAgICAgICBlcnJubyA9IEVSUk5PX0JBREY7XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHdyaXRlX3VzaXplKG5yZWFkX3B0ciwgMCwgbnJlYWQgYXMgdXNpemUpO1xyXG4gICAgICAgIHJldHVybiBlcnJubztcclxuICAgIH0sIEVSUk5PX0FTWU5DSUZZKX1cclxuXHJcbiAgICBmdW5jdGlvbiBmZF9yZWFkZGlyICAgICAgICAgICAgICAgICAoKTogRXJybm8geyByZXR1cm4gbnlpKCk7IH1cclxuICAgIGZ1bmN0aW9uIGZkX3JlbnVtYmVyICAgICAgICAgICAgICAgICgpOiBFcnJubyB7IHJldHVybiBueWkoKTsgfVxyXG4gICAgZnVuY3Rpb24gZmRfc2VlayAgICAgICAgICAgICAgICAgICAgKCk6IEVycm5vIHsgcmV0dXJuIG55aSgpOyB9XHJcbiAgICBmdW5jdGlvbiBmZF9zeW5jICAgICAgICAgICAgICAgICAgICAoKTogRXJybm8geyByZXR1cm4gbnlpKCk7IH1cclxuICAgIGZ1bmN0aW9uIGZkX3RlbGwgICAgICAgICAgICAgICAgICAgICgpOiBFcnJubyB7IHJldHVybiBueWkoKTsgfVxyXG5cclxuICAgIGZ1bmN0aW9uIGZkX3dyaXRlKGZkOiBGZCwgY2lvdmVjX2FycmF5X3B0cjogcHRyLCBjaW92ZWNfYXJyYXlfbGVuOiB1c2l6ZSwgbndyaXR0ZW5fcHRyOiBwdHIpOiBFcnJubyB7XHJcbiAgICAgICAgLy8gaHR0cHM6Ly9kb2NzLnJzL3dhc2kvMC4xMC4yK3dhc2ktc25hcHNob3QtcHJldmlldzEvc3JjL3dhc2kvbGliX2dlbmVyYXRlZC5ycy5odG1sIzE3OTZcclxuICAgICAgICAvLyBodHRwczovL25vZGVqcy5vcmcvYXBpL3dhc2kuaHRtbFxyXG5cclxuICAgICAgICB2YXIgbndyaXR0ZW4gPSAwO1xyXG4gICAgICAgIHZhciBlcnJubyA9IEVSUk5PX1NVQ0NFU1M7XHJcblxyXG4gICAgICAgIHZhciB0ZXh0ID0gXCJcIjtcclxuICAgICAgICBmb3IgKHZhciBjaW92ZWNfaWR4ID0gMDsgY2lvdmVjX2lkeCA8IGNpb3ZlY19hcnJheV9sZW47ICsrY2lvdmVjX2lkeCkge1xyXG4gICAgICAgICAgICB2YXIgYnVmX3B0ciA9IHJlYWRfcHRyKGNpb3ZlY19hcnJheV9wdHIsIDggKiBjaW92ZWNfaWR4ICsgMCk7XHJcbiAgICAgICAgICAgIHZhciBidWZfbGVuID0gcmVhZF91c2l6ZShjaW92ZWNfYXJyYXlfcHRyLCA4ICogY2lvdmVjX2lkeCArIDQpO1xyXG5cclxuICAgICAgICAgICAgc3dpdGNoIChmZCkge1xyXG4gICAgICAgICAgICAgICAgY2FzZSAxOiAvLyBzdGRvdXRcclxuICAgICAgICAgICAgICAgIGNhc2UgMjogLy8gc3RkZXJyXHJcbiAgICAgICAgICAgICAgICAgICAgdGV4dCArPSBuZXcgVGV4dERlY29kZXIoKS5kZWNvZGUoc2xpY2UoYnVmX3B0ciwgMCBhcyB1c2l6ZSwgYnVmX2xlbikpO1xyXG4gICAgICAgICAgICAgICAgICAgIG53cml0dGVuICs9IGJ1Zl9sZW47XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICBkZWZhdWx0OlxyXG4gICAgICAgICAgICAgICAgICAgIGVycm5vID0gRVJSTk9fQkFERjtcclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgY29uc29sZV93cml0ZSh0ZXh0KTtcclxuXHJcbiAgICAgICAgd3JpdGVfdXNpemUobndyaXR0ZW5fcHRyLCAwLCBud3JpdHRlbiBhcyB1c2l6ZSk7XHJcbiAgICAgICAgcmV0dXJuIGVycm5vO1xyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIHBhdGhfY3JlYXRlX2RpcmVjdG9yeSAgICAgICgpOiBFcnJubyB7IHJldHVybiBueWkoKTsgfVxyXG4gICAgZnVuY3Rpb24gcGF0aF9maWxlc3RhdHNfZ2V0ICAgICAgICAgKCk6IEVycm5vIHsgcmV0dXJuIG55aSgpOyB9XHJcbiAgICBmdW5jdGlvbiBwYXRoX2ZpbGVzdGF0X3NldF90aW1lcyAgICAoKTogRXJybm8geyByZXR1cm4gbnlpKCk7IH1cclxuICAgIGZ1bmN0aW9uIHBhdGhfbGluayAgICAgICAgICAgICAgICAgICgpOiBFcnJubyB7IHJldHVybiBueWkoKTsgfVxyXG4gICAgZnVuY3Rpb24gcGF0aF9vcGVuICAgICAgICAgICAgICAgICAgKCk6IEVycm5vIHsgcmV0dXJuIG55aSgpOyB9XHJcbiAgICBmdW5jdGlvbiBwYXRoX3JlYWRsaW5rICAgICAgICAgICAgICAoKTogRXJybm8geyByZXR1cm4gbnlpKCk7IH1cclxuICAgIGZ1bmN0aW9uIHBhdGhfcmVtb3ZlX2RpcmVjdG9yeSAgICAgICgpOiBFcnJubyB7IHJldHVybiBueWkoKTsgfVxyXG4gICAgZnVuY3Rpb24gcGF0aF9yZW5hbWUgICAgICAgICAgICAgICAgKCk6IEVycm5vIHsgcmV0dXJuIG55aSgpOyB9XHJcbiAgICBmdW5jdGlvbiBwYXRoX3N5bWxpbmsgICAgICAgICAgICAgICAoKTogRXJybm8geyByZXR1cm4gbnlpKCk7IH1cclxuICAgIGZ1bmN0aW9uIHBhdGhfdW5saW5rX2ZpbGUgICAgICAgICAgICgpOiBFcnJubyB7IHJldHVybiBueWkoKTsgfVxyXG5cclxuICAgIGZ1bmN0aW9uIHBvbGxfb25lb2ZmKGluX3N1YnM6IHB0ciwgb3V0X2V2ZW50czogcHRyLCBpbl9uc3ViczogdXNpemUsIG91dF9uZXZlbnRzX3B0cjogcHRyKTogRXJybm8geyByZXR1cm4gYXN5bmNpZnkoYXN5bmMgKCkgPT4ge1xyXG4gICAgICAgIC8vIGh0dHBzOi8vZ2l0aHViLmNvbS9XZWJBc3NlbWJseS9XQVNJL2Jsb2IvbWFpbi9waGFzZXMvc25hcHNob3QvZG9jcy5tZCMtcG9sbF9vbmVvZmZpbi1jb25zdHBvaW50ZXJzdWJzY3JpcHRpb24tb3V0LXBvaW50ZXJldmVudC1uc3Vic2NyaXB0aW9ucy1zaXplLS0tZXJybm8tc2l6ZVxyXG4gICAgICAgIC8vIGh0dHBzOi8vZG9jcy5ycy93YXNpLzAuMTAuMit3YXNpLXNuYXBzaG90LXByZXZpZXcxL3NyYy93YXNpL2xpYl9nZW5lcmF0ZWQucnMuaHRtbCMxODkyXHJcblxyXG4gICAgICAgIGxldCBvdXRfbmV2ZW50cyA9IDA7XHJcbiAgICAgICAgd3JpdGVfdXNpemUob3V0X25ldmVudHNfcHRyLCAwLCBvdXRfbmV2ZW50cyBhcyB1c2l6ZSk7XHJcblxyXG4gICAgICAgIGlmIChpbl9uc3VicyA9PSAwKSB7IHJldHVybiBFUlJOT19TVUNDRVNTOyB9XHJcbiAgICAgICAgaWYgKGluX25zdWJzID4gMSkgeyBueWkoKTsgcmV0dXJuIEVSUk5PXzJCSUc7IH1cclxuXHJcbiAgICAgICAgZm9yICh2YXIgc3ViPTA7IHN1Yjxpbl9uc3ViczsgKytzdWIpIHtcclxuICAgICAgICAgICAgbGV0IHN1Yl9iYXNlID0gKGluX3N1YnMgKyA0OCAqIHN1YikgYXMgcHRyO1xyXG5cclxuICAgICAgICAgICAgbGV0IHVzZXJkYXRhICAgICAgICA9IHJlYWRfdTY0X3BhaXIoc3ViX2Jhc2UsIDApO1xyXG5cclxuICAgICAgICAgICAgbGV0IHVfdGFnICAgICAgICAgICA9IHJlYWRfdTgoIHN1Yl9iYXNlLCA4KTtcclxuICAgICAgICAgICAgdHlwZSBFdmVudHR5cGUgPSB1ODtcclxuICAgICAgICAgICAgY29uc3QgRVZFTlRUWVBFX0NMT0NLICAgICAgID0gPEV2ZW50dHlwZT4wO1xyXG4gICAgICAgICAgICBjb25zdCBFVkVOVFRZUEVfRkRfUkVBRCAgICAgPSA8RXZlbnR0eXBlPjE7XHJcbiAgICAgICAgICAgIGNvbnN0IEVWRU5UVFlQRV9GRF9XUklURSAgICA9IDxFdmVudHR5cGU+MjtcclxuICAgICAgICAgICAgaWYgKHVfdGFnICE9PSBFVkVOVFRZUEVfQ0xPQ0spIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiBueWkoKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAvLyA3IGJ5dGVzIG9mIHBhZGRpbmdcclxuXHJcbiAgICAgICAgICAgIGxldCB1X3VfY2xvY2tfaWQgICAgPSByZWFkX3UzMihzdWJfYmFzZSwgMTYpO1xyXG4gICAgICAgICAgICB0eXBlIENsb2NraWQgPSB1MzI7XHJcbiAgICAgICAgICAgIGNvbnN0IENMT0NLSURfUkVBTFRJTUUgICAgICAgICAgICAgID0gPENsb2NraWQ+MDsgLy8gVGhlIGNsb2NrIG1lYXN1cmluZyByZWFsIHRpbWUuIFRpbWUgdmFsdWUgemVybyBjb3JyZXNwb25kcyB3aXRoIDE5NzAtMDEtMDFUMDA6MDA6MDBaLlxyXG4gICAgICAgICAgICBjb25zdCBDTE9DS0lEX01PTk9UT05JQyAgICAgICAgICAgICA9IDxDbG9ja2lkPjE7IC8vIFRoZSBzdG9yZS13aWRlIG1vbm90b25pYyBjbG9jaywgd2hpY2ggaXMgZGVmaW5lZCBhcyBhIGNsb2NrIG1lYXN1cmluZyByZWFsIHRpbWUsIHdob3NlIHZhbHVlIGNhbm5vdCBiZSBhZGp1c3RlZCBhbmQgd2hpY2ggY2Fubm90IGhhdmUgbmVnYXRpdmUgY2xvY2sganVtcHMuIFRoZSBlcG9jaCBvZiB0aGlzIGNsb2NrIGlzIHVuZGVmaW5lZC4gVGhlIGFic29sdXRlIHRpbWUgdmFsdWUgb2YgdGhpcyBjbG9jayB0aGVyZWZvcmUgaGFzIG5vIG1lYW5pbmcuXHJcbiAgICAgICAgICAgIGNvbnN0IENMT0NLSURfUFJPQ0VTU19DUFVUSU1FX0lEICAgID0gPENsb2NraWQ+MjtcclxuICAgICAgICAgICAgY29uc3QgQ0xPQ0tJRF9USFJFQURfQ1BVVElNRV9JRCAgICAgPSA8Q2xvY2tpZD4zO1xyXG4gICAgICAgICAgICAvLyA0IGJ5dGVzIG9mIHBhZGRpbmdcclxuXHJcbiAgICAgICAgICAgIGxldCB1X3VfY2xvY2tfdGltZW91dCAgID0gcmVhZF91NjRfYXBwcm94KHN1Yl9iYXNlLCAyNCk7XHJcbiAgICAgICAgICAgIGxldCB1X3VfY2xvY2tfcHJlY2lzaW9uID0gcmVhZF91NjRfYXBwcm94KHN1Yl9iYXNlLCAzMik7XHJcblxyXG4gICAgICAgICAgICBsZXQgdV91X2Nsb2NrX2ZsYWdzICAgICA9IHJlYWRfdTE2KHN1Yl9iYXNlLCA0MCk7XHJcbiAgICAgICAgICAgIGNvbnN0IFNVQkNMT0NLRkxBR1NfU1VCU0NSSVBUSU9OX0NMT0NLX0FCU1RJTUUgID0gPHUxNj4weDE7XHJcbiAgICAgICAgICAgIGNvbnNvbGUuYXNzZXJ0KHVfdV9jbG9ja19mbGFncyA9PT0gMCwgXCJ1X3VfY2xvY2tfZmxhZ3MgIT09IDAgbm90IHlldCBzdXBwb3J0ZWRcIik7XHJcblxyXG4gICAgICAgICAgICBsZXQgYWJzID0gKHVfdV9jbG9ja19mbGFncyAmIFNVQkNMT0NLRkxBR1NfU1VCU0NSSVBUSU9OX0NMT0NLX0FCU1RJTUUpICE9PSAwO1xyXG4gICAgICAgICAgICAvLyA2IGJ5dGVzIG9mIHBhZGRpbmdcclxuXHJcbiAgICAgICAgICAgIGlmIChhYnMpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiBueWkoKTtcclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIHN3aXRjaCAodV91X2Nsb2NrX2lkKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgY2FzZSBDTE9DS0lEX1JFQUxUSU1FOlxyXG4gICAgICAgICAgICAgICAgICAgIGNhc2UgQ0xPQ0tJRF9NT05PVE9OSUM6XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGF3YWl0IHNsZWVwX25zKHVfdV9jbG9ja190aW1lb3V0KTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIGh0dHBzOi8vZ2l0aHViLmNvbS9XZWJBc3NlbWJseS9XQVNJL2Jsb2IvbWFpbi9waGFzZXMvc25hcHNob3QvZG9jcy5tZCMtZXZlbnQtc3RydWN0XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHdyaXRlX3U2NF9wYWlyKCBvdXRfZXZlbnRzLCAzMiAqIG91dF9uZXZlbnRzICsgIDAsIHVzZXJkYXRhKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgd3JpdGVfdTMyKCAgICAgIG91dF9ldmVudHMsIDMyICogb3V0X25ldmVudHMgKyAgOCwgMCBhcyB1MzIpOyAvLyBlcnJvclxyXG4gICAgICAgICAgICAgICAgICAgICAgICB3cml0ZV91OCggICAgICAgb3V0X2V2ZW50cywgMzIgKiBvdXRfbmV2ZW50cyArIDEwLCB1X3RhZyk7IC8vIHR5cGVcclxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gZmRfcmVhZHdyaXRlIGNhbiBiZSBza2lwcGVkIGZvciBjbG9ja3NcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIG91dF9uZXZlbnRzICs9IDE7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHdyaXRlX3VzaXplKG91dF9uZXZlbnRzX3B0ciwgMCwgb3V0X25ldmVudHMgYXMgdXNpemUpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgICAgICBkZWZhdWx0OlxyXG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gbnlpKCk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHdyaXRlX3VzaXplKG91dF9uZXZlbnRzX3B0ciwgMCwgaW5fbnN1YnMpO1xyXG4gICAgICAgIHJldHVybiBFUlJOT19TVUNDRVNTO1xyXG4gICAgfSwgRVJSTk9fQVNZTkNJRlkpfVxyXG5cclxuICAgIGZ1bmN0aW9uIHByb2NfZXhpdChjb2RlOiBudW1iZXIpOiBuZXZlciB7XHJcbiAgICAgICAgLy8gaHR0cHM6Ly9kb2NzLnJzL3dhc2kvMC4xMC4yK3dhc2ktc25hcHNob3QtcHJldmlldzEvc3JjL3dhc2kvbGliX2dlbmVyYXRlZC5ycy5odG1sIzE5MDFcclxuICAgICAgICBjb25zb2xlX3dyaXRlX3Byb2NfZXhpdChjb2RlKTtcclxuICAgICAgICB0aHJvdyBcImV4aXRcIjtcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBwcm9jX3JhaXNlICAgICAgICAgICAgICAgICAoKTogRXJybm8geyByZXR1cm4gbnlpKCk7IH1cclxuXHJcbiAgICBmdW5jdGlvbiBzY2hlZF95aWVsZCgpOiBFcnJubyB7IHJldHVybiBhc3luY2lmeShhc3luYyAoKSA9PiB7XHJcbiAgICAgICAgLy8gaHR0cHM6Ly9naXRodWIuY29tL1dlYkFzc2VtYmx5L1dBU0kvYmxvYi9tYWluL3BoYXNlcy9zbmFwc2hvdC9kb2NzLm1kIy1zY2hlZF95aWVsZC0tLWVycm5vXHJcbiAgICAgICAgLy8gaHR0cHM6Ly9kb2NzLnJzL3dhc2kvMC4xMC4yK3dhc2ktc25hcHNob3QtcHJldmlldzEvc3JjL3dhc2kvbGliX2dlbmVyYXRlZC5ycy5odG1sIzE5MDdcclxuICAgICAgICBhd2FpdCBzbGVlcF9tcygwKTtcclxuICAgICAgICByZXR1cm4gRVJSTk9fU1VDQ0VTUztcclxuICAgIH0sIEVSUk5PX0FTWU5DSUZZKX1cclxuXHJcbiAgICBmdW5jdGlvbiByYW5kb21fZ2V0KGJ1ZjogcHRyLCBsZW46IHVzaXplKTogRXJybm8ge1xyXG4gICAgICAgIC8vIGh0dHBzOi8vZ2l0aHViLmNvbS9XZWJBc3NlbWJseS9XQVNJL2Jsb2IvbWFpbi9waGFzZXMvc25hcHNob3QvZG9jcy5tZCMtcmFuZG9tX2dldGJ1Zi1wb2ludGVydTgtYnVmX2xlbi1zaXplLS0tZXJybm9cclxuICAgICAgICAvLyBodHRwczovL2RvY3MucnMvd2FzaS8wLjEwLjIrd2FzaS1zbmFwc2hvdC1wcmV2aWV3MS9zcmMvd2FzaS9saWJfZ2VuZXJhdGVkLnJzLmh0bWwjMTkxNFxyXG4gICAgICAgIGlmIChcImNyeXB0b1wiIGluIHNlbGYpIHtcclxuICAgICAgICAgICAgc2VsZi5jcnlwdG8uZ2V0UmFuZG9tVmFsdWVzKHNsaWNlOChidWYsIDAgYXMgdXNpemUsIGxlbikpO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIGZvciAodmFyIGk9MDsgaTxsZW47ICsraSkge1xyXG4gICAgICAgICAgICAgICAgd3JpdGVfdTgoYnVmLCBpLCAoMHhGRiAmIE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSoweDEwMCkpIGFzIHU4KTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gRVJSTk9fU1VDQ0VTUztcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBzb2NrX3JlY3YgICAgICAgICAgICAgICAgICAoKTogRXJybm8geyByZXR1cm4gbnlpKCk7IH1cclxuICAgIGZ1bmN0aW9uIHNvY2tfc2VuZCAgICAgICAgICAgICAgICAgICgpOiBFcnJubyB7IHJldHVybiBueWkoKTsgfVxyXG4gICAgZnVuY3Rpb24gc29ja19zaHV0ZG93biAgICAgICAgICAgICAgKCk6IEVycm5vIHsgcmV0dXJuIG55aSgpOyB9XHJcblxyXG4gICAgY29uc3QgaW1wb3J0cyA9IHtcclxuICAgICAgICB3YXNpX3NuYXBzaG90X3ByZXZpZXcxOiB7XHJcbiAgICAgICAgICAgIGFyZ3NfZ2V0LFxyXG4gICAgICAgICAgICBhcmdzX3NpemVzX2dldCxcclxuICAgICAgICAgICAgZW52aXJvbl9nZXQsXHJcbiAgICAgICAgICAgIGVudmlyb25fc2l6ZXNfZ2V0LFxyXG4gICAgICAgICAgICBjbG9ja19yZXNfZ2V0LFxyXG4gICAgICAgICAgICBjbG9ja190aW1lX2dldCxcclxuICAgICAgICAgICAgZmRfYWR2aXNlLFxyXG4gICAgICAgICAgICBmZF9hbGxvY2F0ZSxcclxuICAgICAgICAgICAgZmRfY2xvc2UsXHJcbiAgICAgICAgICAgIGZkX2RhdGFzeW5jLFxyXG4gICAgICAgICAgICBmZF9mZHN0YXRfZ2V0LFxyXG4gICAgICAgICAgICBmZF9mZHN0YXRfc2V0X2ZsYWdzLFxyXG4gICAgICAgICAgICBmZF9mZHN0YXRfc2V0X3JpZ2h0cyxcclxuICAgICAgICAgICAgZmRfZmlsZXN0YXRfZ2V0LFxyXG4gICAgICAgICAgICBmZF9maWxlc3RhdF9zZXRfc2l6ZSxcclxuICAgICAgICAgICAgZmRfZmlsZXN0YXRfc2V0X3RpbWVzLFxyXG4gICAgICAgICAgICBmZF9wcmVhZCxcclxuICAgICAgICAgICAgZmRfcHJlc3RhdF9nZXQsXHJcbiAgICAgICAgICAgIGZkX3ByZXN0YXRfZGlyX25hbWUsXHJcbiAgICAgICAgICAgIGZkX3B3cml0ZSxcclxuICAgICAgICAgICAgZmRfcmVhZCxcclxuICAgICAgICAgICAgZmRfcmVhZGRpcixcclxuICAgICAgICAgICAgZmRfcmVudW1iZXIsXHJcbiAgICAgICAgICAgIGZkX3NlZWssXHJcbiAgICAgICAgICAgIGZkX3N5bmMsXHJcbiAgICAgICAgICAgIGZkX3RlbGwsXHJcbiAgICAgICAgICAgIGZkX3dyaXRlLFxyXG4gICAgICAgICAgICBwYXRoX2NyZWF0ZV9kaXJlY3RvcnksXHJcbiAgICAgICAgICAgIHBhdGhfZmlsZXN0YXRzX2dldCxcclxuICAgICAgICAgICAgcGF0aF9maWxlc3RhdF9zZXRfdGltZXMsXHJcbiAgICAgICAgICAgIHBhdGhfbGluayxcclxuICAgICAgICAgICAgcGF0aF9vcGVuLFxyXG4gICAgICAgICAgICBwYXRoX3JlYWRsaW5rLFxyXG4gICAgICAgICAgICBwYXRoX3JlbW92ZV9kaXJlY3RvcnksXHJcbiAgICAgICAgICAgIHBhdGhfcmVuYW1lLFxyXG4gICAgICAgICAgICBwYXRoX3N5bWxpbmssXHJcbiAgICAgICAgICAgIHBhdGhfdW5saW5rX2ZpbGUsXHJcbiAgICAgICAgICAgIHBvbGxfb25lb2ZmLFxyXG4gICAgICAgICAgICBwcm9jX2V4aXQsXHJcbiAgICAgICAgICAgIHByb2NfcmFpc2UsXHJcbiAgICAgICAgICAgIHNjaGVkX3lpZWxkLFxyXG4gICAgICAgICAgICByYW5kb21fZ2V0LFxyXG4gICAgICAgICAgICBzb2NrX3JlY3YsXHJcbiAgICAgICAgICAgIHNvY2tfc2VuZCxcclxuICAgICAgICAgICAgc29ja19zaHV0ZG93bixcclxuICAgICAgICB9LFxyXG4gICAgfTtcclxuXHJcbiAgICBpbnRlcmZhY2UgRXhwb3J0cyB7XHJcbiAgICAgICAgbWVtb3J5OiAgICAgICAgICAgICAgICAgV2ViQXNzZW1ibHkuTWVtb3J5LFxyXG4gICAgICAgIG1haW46ICAgICAgICAgICAgICAgICAgICgpID0+IHZvaWQsIC8vIFhYWDogcmlnaHQgc2lnbmF0dXJlP1xyXG5cclxuICAgICAgICBhc3luY2lmeV9zdGFydF9yZXdpbmQ6ICAoYWRkcjogbnVtYmVyKSA9PiB2b2lkLFxyXG4gICAgICAgIGFzeW5jaWZ5X3N0YXJ0X3Vud2luZDogIChhZGRyOiBudW1iZXIpID0+IHZvaWQsXHJcbiAgICAgICAgYXN5bmNpZnlfc3RvcF9yZXdpbmQ6ICAgKCkgPT4gdm9pZCxcclxuICAgICAgICBhc3luY2lmeV9zdG9wX3Vud2luZDogICAoKSA9PiB2b2lkLFxyXG4gICAgfVxyXG5cclxuICAgIGNvbnN0IGJpbmFyeSA9IGF0b2Iod2FzbSk7XHJcbiAgICBjb25zdCB0eXBlZGFycmF5ID0gbmV3IFVpbnQ4QXJyYXkoYmluYXJ5Lmxlbmd0aCk7XHJcbiAgICBmb3IgKHZhciBpPTA7IGk8YmluYXJ5Lmxlbmd0aDsgKytpKSB7IHR5cGVkYXJyYXlbaV0gPSBiaW5hcnkuY2hhckNvZGVBdChpKTsgfVxyXG5cclxuICAgIFdlYkFzc2VtYmx5LmNvbXBpbGUodHlwZWRhcnJheSkudGhlbihmdW5jdGlvbiAobSkge1xyXG4gICAgICAgIGlmIChmYWxzZSkge1xyXG4gICAgICAgICAgICBXZWJBc3NlbWJseS5Nb2R1bGUuaW1wb3J0cyhtKS5mb3JFYWNoKGZ1bmN0aW9uIChpbXApIHtcclxuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiaW1wb3J0XCIsIGltcCk7XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICBXZWJBc3NlbWJseS5Nb2R1bGUuZXhwb3J0cyhtKS5mb3JFYWNoKGZ1bmN0aW9uIChleHApIHtcclxuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiZXhwb3J0XCIsIGV4cCk7XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gV2ViQXNzZW1ibHkuaW5zdGFudGlhdGUobSwgaW1wb3J0cyk7XHJcbiAgICB9KS50aGVuKGZ1bmN0aW9uIChtKSB7XHJcbiAgICAgICAgZXhwb3J0cyA9IDxFeHBvcnRzPjx1bmtub3duPm0uZXhwb3J0cztcclxuXHJcbiAgICAgICAgbWVtb3J5ID0gZXhwb3J0cy5tZW1vcnk7XHJcbiAgICAgICAgYXN5bmNpZnlfcGFnZV9pZHggPSBtZW1vcnkuZ3Jvdyhhc3luY2lmeV9wYWdlX2NvdW50KTtcclxuICAgICAgICBjb25zb2xlLmFzc2VydChhc3luY2lmeV9wYWdlX2lkeCAhPT0gLTEpO1xyXG4gICAgICAgIGFzeW5jaWZ5X2J5dGVfaWR4ID0gUEFHRV9TSVpFICogYXN5bmNpZnlfcGFnZV9pZHg7XHJcblxyXG4gICAgICAgIG1haW4oKTtcclxuICAgIH0pO1xyXG59XHJcbiIsInZhciBtYWluX2RvbV93b3JrZXIgOiBXb3JrZXI7XHJcbmZ1bmN0aW9uIG1haW5fZG9tKCkge1xyXG4gICAgdHlwZSBNb2RlID0gXCJyYXdcIiB8IFwibGluZWJ1ZmZlcmVkXCI7XHJcbiAgICBjb25zdCBtb2RlID0gZnVuY3Rpb24oKTogTW9kZSB7IHJldHVybiBcImxpbmVidWZmZXJlZFwiOyB9KCk7XHJcbiAgICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKFwia2V5cHJlc3NcIiwgZnVuY3Rpb24oZSkge1xyXG4gICAgICAgIHZhciB0ZXh0ID0gZS5jaGFyIHx8IFN0cmluZy5mcm9tQ2hhckNvZGUoZS5jaGFyQ29kZSk7XHJcbiAgICAgICAgaWYgKHRleHQgPT09IFwiXFxyXCIpIHsgdGV4dCA9IFwiXFxuXCI7IH1cclxuICAgICAgICBzd2l0Y2ggKG1vZGUpIHtcclxuICAgICAgICAgICAgY2FzZSBcInJhd1wiOlxyXG4gICAgICAgICAgICAgICAgc3dpdGNoICh0ZXh0KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgY2FzZSBcIlxcblwiOlxyXG4gICAgICAgICAgICAgICAgICAgIGNhc2UgXCJcXHJcIjpcclxuICAgICAgICAgICAgICAgICAgICBjYXNlIFwiXFx0XCI6XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIHNob3VsZCd2ZSBhbHJlYWR5IGJlZW4gaGFuZGxlZCBieSBrZXlkb3duIGV2ZW50XHJcbiAgICAgICAgICAgICAgICAgICAgZGVmYXVsdDpcclxuICAgICAgICAgICAgICAgICAgICAgICAgc3RkaW5fd3JpdGUodGV4dCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIGNhc2UgXCJsaW5lYnVmZmVyZWRcIjpcclxuICAgICAgICAgICAgICAgIHN3aXRjaCAodGV4dCkge1xyXG4gICAgICAgICAgICAgICAgICAgIGNhc2UgXCJcXG5cIjpcclxuICAgICAgICAgICAgICAgICAgICBjYXNlIFwiXFxyXCI6XHJcbiAgICAgICAgICAgICAgICAgICAgY2FzZSBcIlxcdFwiOlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBzaG91bGQndmUgYWxyZWFkeSBiZWVuIGhhbmRsZWQgYnkga2V5ZG93biBldmVudFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgICAgICBkZWZhdWx0OlxyXG4gICAgICAgICAgICAgICAgICAgICAgICBlSW5wdXQudGV4dENvbnRlbnQgKz0gdGV4dDtcclxuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICB9XHJcbiAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xyXG4gICAgICAgIGUuc3RvcFByb3BhZ2F0aW9uKCk7XHJcbiAgICB9KTtcclxuICAgIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoXCJrZXlkb3duXCIsIGZ1bmN0aW9uKGUpIHtcclxuICAgICAgICB2YXIga2V5ID0gXCJcIjtcclxuICAgICAgICBpZiAoZS5jdHJsS2V5ICAgKSBrZXkgKz0gXCJDdHJsK1wiO1xyXG4gICAgICAgIGlmIChlLmFsdEtleSAgICApIGtleSArPSBcIkFsdCtcIjtcclxuICAgICAgICBpZiAoZS5zaGlmdEtleSAgKSBrZXkgKz0gXCJTaGlmdCtcIjtcclxuICAgICAgICBrZXkgKz0gKGUua2V5IHx8IGUuY29kZSk7XHJcblxyXG4gICAgICAgIHN3aXRjaCAobW9kZSkge1xyXG4gICAgICAgICAgICBjYXNlIFwicmF3XCI6XHJcbiAgICAgICAgICAgICAgICBzd2l0Y2ggKGtleSkge1xyXG4gICAgICAgICAgICAgICAgICAgIGNhc2UgXCJCYWNrc3BhY2VcIjogICBzdGRpbl93cml0ZShcIlxceDA4XCIpOyAgICBicmVhaztcclxuICAgICAgICAgICAgICAgICAgICBjYXNlIFwiRW50ZXJcIjogICAgICAgc3RkaW5fd3JpdGUoXCJcXG5cIik7ICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICAgICAgY2FzZSBcIk51bXBhZEVudGVyXCI6IHN0ZGluX3dyaXRlKFwiXFxuXCIpOyAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgICAgIGNhc2UgXCJUYWJcIjogICAgICAgICBzdGRpbl93cml0ZShcIlxcdFwiKTsgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgICAgICBjYXNlIFwiRXNjXCI6ICAgICAgICAgc3RkaW5fd3JpdGUoXCJcXHgxQlwiKTsgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICAgICAgY2FzZSBcIkVzY2FwZVwiOiAgICAgIHN0ZGluX3dyaXRlKFwiXFx4MUJcIik7ICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgICAgIGRlZmF1bHQ6ICAgICAgICAgICAgcmV0dXJuOyAvLyBwcm9jZXNzIG5vIGZ1cnRoZXJcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICBjYXNlIFwibGluZWJ1ZmZlcmVkXCI6XHJcbiAgICAgICAgICAgICAgICBzd2l0Y2ggKGtleSkge1xyXG4gICAgICAgICAgICAgICAgICAgIGNhc2UgXCJCYWNrc3BhY2VcIjpcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCEhZUlucHV0LnRleHRDb250ZW50KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBlSW5wdXQudGV4dENvbnRlbnQgPSBlSW5wdXQudGV4dENvbnRlbnQuc3Vic3RyKDAsIGVJbnB1dC50ZXh0Q29udGVudC5sZW5ndGgtMSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gZWxzZSBUT0RPOiBzb21lIGtpbmQgb2YgYWxlcnQ/XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgICAgIGNhc2UgXCJFbnRlclwiOlxyXG4gICAgICAgICAgICAgICAgICAgIGNhc2UgXCJOdW1wYWRFbnRlclwiOlxyXG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgYnVmZmVyID0gKGVJbnB1dC50ZXh0Q29udGVudCB8fCBcIlwiKSArIFwiXFxuXCI7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGVJbnB1dC50ZXh0Q29udGVudCA9IFwiXCI7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHN0ZGluX3dyaXRlKGJ1ZmZlcik7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgICAgIGNhc2UgXCJUYWJcIjogICAgIGVJbnB1dC50ZXh0Q29udGVudCA9IChlSW5wdXQudGV4dENvbnRlbnQgfHwgXCJcIikgKyBcIlxcdFwiOyBicmVhaztcclxuICAgICAgICAgICAgICAgICAgICBjYXNlIFwiRXNjXCI6ICAgICBlSW5wdXQudGV4dENvbnRlbnQgPSAoZUlucHV0LnRleHRDb250ZW50IHx8IFwiXCIpICsgXCJcXHgxQlwiOyBicmVhaztcclxuICAgICAgICAgICAgICAgICAgICBjYXNlIFwiRXNjYXBlXCI6ICBlSW5wdXQudGV4dENvbnRlbnQgPSAoZUlucHV0LnRleHRDb250ZW50IHx8IFwiXCIpICsgXCJcXHgxQlwiOyBicmVhaztcclxuICAgICAgICAgICAgICAgICAgICBkZWZhdWx0OiAgICAgICAgcmV0dXJuOyAvLyBwcm9jZXNzIG5vIGZ1cnRoZXJcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgIH1cclxuICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XHJcbiAgICAgICAgZS5zdG9wUHJvcGFnYXRpb24oKTtcclxuICAgIH0pO1xyXG5cclxuICAgIGV4ZWNfYmFzZTY0X3dhc20oXCJ7QkFTRTY0X1dBU00zMn1cIik7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHJlcXVpcmVFbGVtZW50QnlJZChpZDogc3RyaW5nKTogSFRNTEVsZW1lbnQge1xyXG4gICAgbGV0IGVsID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoaWQpO1xyXG4gICAgaWYgKCFlbCkgeyB0aHJvdyBgbm8gc3VjaCBlbGVtZW50IGluIGRvY3VtZW50OiAjJHtpZH1gOyB9XHJcbiAgICByZXR1cm4gZWw7XHJcbn1cclxuXHJcbmNvbnN0IGVDb24gICAgICA9IHJlcXVpcmVFbGVtZW50QnlJZChcImNvbnNvbGVcIik7XHJcbmNvbnN0IGVJbnB1dCAgICA9IHJlcXVpcmVFbGVtZW50QnlJZChcImNvbnNvbGUtaW5wdXRcIik7XHJcbmNvbnN0IGVDdXJzb3IgICA9IHJlcXVpcmVFbGVtZW50QnlJZChcImNvbnNvbGUtY3Vyc29yXCIpO1xyXG5cclxuZnVuY3Rpb24gY29uc29sZV93cml0ZSh0ZXh0OiBzdHJpbmcpIHtcclxuICAgIGlmICh0ZXh0ID09PSBcIlwiKSByZXR1cm47XHJcbiAgICBlQ29uLmluc2VydEJlZm9yZShkb2N1bWVudC5jcmVhdGVUZXh0Tm9kZSh0ZXh0KSwgZUlucHV0KTtcclxufVxyXG5cclxuZnVuY3Rpb24gY29uc29sZV93cml0ZV9wcm9jX2V4aXQoY29kZTogbnVtYmVyKSB7XHJcbiAgICB2YXIgZXhpdCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJzcGFuXCIpO1xyXG4gICAgZXhpdC50ZXh0Q29udGVudCA9IGBcXG5wcm9jZXNzIGV4aXRlZCB3aXRoIGNvZGUgJHtjb2RlfWA7XHJcbiAgICBleGl0LnN0eWxlLmNvbG9yID0gY29kZSA9PSAwID8gXCIjODg4XCIgOiBcIiNDNDRcIjtcclxuICAgIGVDb24uaW5zZXJ0QmVmb3JlKGV4aXQsIGVJbnB1dCk7XHJcbiAgICBlQ29uLnJlbW92ZUNoaWxkKGVDdXJzb3IpO1xyXG59XHJcblxyXG52YXIgc3RkaW5fYnVmICAgICAgICAgICA6IG51bWJlcltdID0gW107XHJcbnZhciBzdGRpbl9wZW5kaW5nX2lvICAgIDogeyBtYXg6IG51bWJlciwgY2FsbGJhY2s6ICgoaW5wdXQ6IG51bWJlcltdKSA9PiB2b2lkKSB9W10gPSBbXTtcclxuXHJcbmZ1bmN0aW9uIHN0ZGluX3JlYWQobWF4OiBudW1iZXIpOiBQcm9taXNlPG51bWJlcltdPiB7XHJcbiAgICByZXR1cm4gbmV3IFByb21pc2UoKGNhbGxiYWNrKSA9PiB7XHJcbiAgICAgICAgc3RkaW5fcGVuZGluZ19pby5wdXNoKHttYXgsIGNhbGxiYWNrfSk7XHJcbiAgICAgICAgc3RkaW5fZGlzcGF0Y2goKTtcclxuICAgIH0pO1xyXG59XHJcblxyXG5mdW5jdGlvbiBzdGRpbl93cml0ZSh0ZXh0OiBzdHJpbmcpIHtcclxuICAgIGNvbnNvbGVfd3JpdGUodGV4dCk7XHJcbiAgICB2YXIgYnl0ZXMgPSBuZXcgVGV4dEVuY29kZXIoKS5lbmNvZGUodGV4dCk7XHJcbiAgICBmb3IgKHZhciBpPTA7IGk8Ynl0ZXMubGVuZ3RoOyArK2kpIHtcclxuICAgICAgICBzdGRpbl9idWYucHVzaChieXRlc1tpXSk7XHJcbiAgICB9XHJcbiAgICBzdGRpbl9kaXNwYXRjaCgpO1xyXG59XHJcblxyXG5mdW5jdGlvbiBzdGRpbl9kaXNwYXRjaCgpIHtcclxuICAgIHdoaWxlIChzdGRpbl9idWYubGVuZ3RoID4gMCAmJiBzdGRpbl9wZW5kaW5nX2lvLmxlbmd0aCA+IDApIHtcclxuICAgICAgICBjb25zdCBpbyA9IHN0ZGluX3BlbmRpbmdfaW8uc2hpZnQoKTtcclxuICAgICAgICBpZiAoaW8gPT09IHVuZGVmaW5lZCkgY29udGludWU7XHJcbiAgICAgICAgY29uc3QgbnJlYWQgPSBNYXRoLm1pbihzdGRpbl9idWYubGVuZ3RoLCBpby5tYXgpO1xyXG4gICAgICAgIGNvbnN0IHJlYWQgPSBzdGRpbl9idWYuc2xpY2UoMCwgbnJlYWQpO1xyXG4gICAgICAgIGNvbnN0IGFmdGVyID0gc3RkaW5fYnVmLnNsaWNlKG5yZWFkKTtcclxuICAgICAgICBzdGRpbl9idWYgPSBhZnRlcjtcclxuICAgICAgICAoaW8uY2FsbGJhY2spKHJlYWQpO1xyXG4gICAgfVxyXG59XHJcbiJdfQ==