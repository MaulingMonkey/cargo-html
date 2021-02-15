"use strict";
var con;
(function (con) {
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
    con.input = eInput;
    function write(text) {
        if (text === "")
            return;
        eCon.insertBefore(document.createTextNode(text), eInput);
    }
    con.write = write;
    function write_proc_exit(code) {
        var exit = document.createElement("span");
        exit.textContent = `\nprocess exited with code ${code}`;
        exit.style.color = code == 0 ? "#888" : "#C44";
        eCon.insertBefore(exit, eInput);
        eCon.removeChild(eCursor);
    }
    con.write_proc_exit = write_proc_exit;
})(con || (con = {}));
const WASM_PAGE_SIZE = (64 * 1024);
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
    const asyncify_byte_count = asyncify_page_count * WASM_PAGE_SIZE;
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
                        var read = await stdin.read(buf_len);
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
        con.write(text);
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
        con.write_proc_exit(code);
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
        asyncify_byte_idx = WASM_PAGE_SIZE * asyncify_page_idx;
        main();
    });
}
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
                        stdin.write(text);
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
                        con.input.textContent += text;
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
                        stdin.write("\x08");
                        break;
                    case "Enter":
                        stdin.write("\n");
                        break;
                    case "NumpadEnter":
                        stdin.write("\n");
                        break;
                    case "Tab":
                        stdin.write("\t");
                        break;
                    case "Esc":
                        stdin.write("\x1B");
                        break;
                    case "Escape":
                        stdin.write("\x1B");
                        break;
                    default: return;
                }
                break;
            case "linebuffered":
                switch (key) {
                    case "Backspace":
                        if (!!con.input.textContent) {
                            con.input.textContent = con.input.textContent.substr(0, con.input.textContent.length - 1);
                        }
                        break;
                    case "Enter":
                    case "NumpadEnter":
                        var buffer = (con.input.textContent || "") + "\n";
                        con.input.textContent = "";
                        stdin.write(buffer);
                        break;
                    case "Tab":
                        con.input.textContent = (con.input.textContent || "") + "\t";
                        break;
                    case "Esc":
                        con.input.textContent = (con.input.textContent || "") + "\x1B";
                        break;
                    case "Escape":
                        con.input.textContent = (con.input.textContent || "") + "\x1B";
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
var stdin;
(function (stdin) {
    var buf = [];
    var pending_io = [];
    function read(max) {
        return new Promise((callback) => {
            pending_io.push({ max, callback });
            dispatch();
        });
    }
    stdin.read = read;
    function write(text) {
        con.write(text);
        var bytes = new TextEncoder().encode(text);
        for (var i = 0; i < bytes.length; ++i) {
            buf.push(bytes[i]);
        }
        dispatch();
    }
    stdin.write = write;
    function dispatch() {
        while (buf.length > 0 && pending_io.length > 0) {
            const io = pending_io.shift();
            if (io === undefined)
                continue;
            const nread = Math.min(buf.length, io.max);
            const read = buf.slice(0, nread);
            const after = buf.slice(nread);
            buf = after;
            (io.callback)(read);
        }
    }
})(stdin || (stdin = {}));
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2NyaXB0LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vc2NyaXB0L2NvbnNvbGUudHMiLCIuLi9zY3JpcHQvZXhlYy13YXNtLnRzIiwiLi4vc2NyaXB0L21haW4tZG9tLnRzIiwiLi4vc2NyaXB0L3N0ZGluLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQSxJQUFVLEdBQUcsQ0F5Qlo7QUF6QkQsV0FBVSxHQUFHO0lBQ1QsU0FBUyxrQkFBa0IsQ0FBQyxFQUFVO1FBQ2xDLElBQUksRUFBRSxHQUFHLFFBQVEsQ0FBQyxjQUFjLENBQUMsRUFBRSxDQUFDLENBQUM7UUFDckMsSUFBSSxDQUFDLEVBQUUsRUFBRTtZQUFFLE1BQU0saUNBQWlDLEVBQUUsRUFBRSxDQUFDO1NBQUU7UUFDekQsT0FBTyxFQUFFLENBQUM7SUFDZCxDQUFDO0lBRUQsTUFBTSxJQUFJLEdBQVEsa0JBQWtCLENBQUMsU0FBUyxDQUFDLENBQUM7SUFDaEQsTUFBTSxNQUFNLEdBQU0sa0JBQWtCLENBQUMsZUFBZSxDQUFDLENBQUM7SUFDdEQsTUFBTSxPQUFPLEdBQUssa0JBQWtCLENBQUMsZ0JBQWdCLENBQUMsQ0FBQztJQUUxQyxTQUFLLEdBQUcsTUFBTSxDQUFDO0lBRTVCLFNBQWdCLEtBQUssQ0FBQyxJQUFZO1FBQzlCLElBQUksSUFBSSxLQUFLLEVBQUU7WUFBRSxPQUFPO1FBQ3hCLElBQUksQ0FBQyxZQUFZLENBQUMsUUFBUSxDQUFDLGNBQWMsQ0FBQyxJQUFJLENBQUMsRUFBRSxNQUFNLENBQUMsQ0FBQztJQUM3RCxDQUFDO0lBSGUsU0FBSyxRQUdwQixDQUFBO0lBRUQsU0FBZ0IsZUFBZSxDQUFDLElBQVk7UUFDeEMsSUFBSSxJQUFJLEdBQUcsUUFBUSxDQUFDLGFBQWEsQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUMxQyxJQUFJLENBQUMsV0FBVyxHQUFHLDhCQUE4QixJQUFJLEVBQUUsQ0FBQztRQUN4RCxJQUFJLENBQUMsS0FBSyxDQUFDLEtBQUssR0FBRyxJQUFJLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQztRQUMvQyxJQUFJLENBQUMsWUFBWSxDQUFDLElBQUksRUFBRSxNQUFNLENBQUMsQ0FBQztRQUNoQyxJQUFJLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxDQUFDO0lBQzlCLENBQUM7SUFOZSxtQkFBZSxrQkFNOUIsQ0FBQTtBQUNMLENBQUMsRUF6QlMsR0FBRyxLQUFILEdBQUcsUUF5Qlo7QUN6QkQsTUFBTSxjQUFjLEdBQUcsQ0FBQyxFQUFFLEdBQUcsSUFBSSxDQUFDLENBQUM7QUFJbkMsU0FBUyxnQkFBZ0IsQ0FBQyxJQUFZO0lBQ2xDLElBQUksT0FBaUIsQ0FBQztJQUN0QixJQUFJLE1BQTJCLENBQUM7SUFFaEMsU0FBUyxJQUFJO1FBQ1QsSUFBSTtZQUNBLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUM7WUFDakIsSUFBSSxTQUFTLEVBQUU7Z0JBQ1gsU0FBUyxHQUFHLEtBQUssQ0FBQztnQkFDbEIsT0FBTyxDQUFDLG9CQUFvQixFQUFFLENBQUM7YUFDbEM7aUJBQU07Z0JBQ0gsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDO2FBQ2hCO1NBQ0o7UUFBQyxPQUFPLENBQUMsRUFBRTtZQUNSLElBQUksQ0FBQyxLQUFLLE1BQU0sRUFBRTtnQkFDZCxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDO2dCQUNqQixRQUFRLENBQUM7Z0JBQ1QsTUFBTSxDQUFDLENBQUM7YUFDWDtTQUNKO0lBQ0wsQ0FBQztJQUVELE1BQU0sbUJBQW1CLEdBQVksQ0FBQyxDQUFDO0lBQ3ZDLE1BQU0sbUJBQW1CLEdBQVksbUJBQW1CLEdBQUcsY0FBYyxDQUFDO0lBQzFFLElBQUksaUJBQTBCLENBQUM7SUFDL0IsSUFBSSxpQkFBMEIsQ0FBQztJQUUvQixJQUFJLFNBQVMsR0FBcUIsS0FBSyxDQUFDO0lBQ3hDLElBQUksU0FBUyxHQUFxQixLQUFLLENBQUM7SUFDeEMsSUFBSSxhQUFhLEdBQWlCLFNBQVMsQ0FBQztJQUM1QyxJQUFJLGdCQUFnQixHQUFjLFNBQVMsQ0FBQztJQUc1QyxTQUFTLFFBQVEsQ0FBSSxDQUF1QixFQUFFLE9BQVU7UUFDcEQsSUFBSSxDQUFDLFNBQVMsRUFBRTtZQUNaLENBQUMsRUFBRSxDQUFDLElBQUksQ0FDSixDQUFDLE1BQU0sRUFBRSxFQUFFO2dCQUNQLFNBQVMsR0FBYSxJQUFJLENBQUM7Z0JBQzNCLGFBQWEsR0FBUyxNQUFNLENBQUM7Z0JBQzdCLGdCQUFnQixHQUFNLFNBQVMsQ0FBQztnQkFFaEMsT0FBTyxDQUFDLHFCQUFxQixDQUFDLGlCQUFpQixDQUFDLENBQUM7Z0JBQ2pELElBQUksRUFBRSxDQUFDO1lBQ1gsQ0FBQyxFQUNELENBQUMsWUFBWSxFQUFFLEVBQUU7Z0JBQ2IsU0FBUyxHQUFhLElBQUksQ0FBQztnQkFDM0IsYUFBYSxHQUFTLFNBQVMsQ0FBQztnQkFDaEMsZ0JBQWdCLEdBQU0sWUFBWSxLQUFLLFNBQVMsQ0FBQyxDQUFDLENBQUMsa0JBQWtCLENBQUMsQ0FBQyxDQUFDLFlBQVksQ0FBQztnQkFFckYsT0FBTyxDQUFDLHFCQUFxQixDQUFDLGlCQUFpQixDQUFDLENBQUM7Z0JBQ2pELElBQUksRUFBRSxDQUFDO1lBQ1gsQ0FBQyxDQUNKLENBQUM7WUFFRixTQUFTLEdBQUcsSUFBSSxDQUFDO1lBQ2pCLE1BQU0sR0FBRyxHQUFHLElBQUksV0FBVyxDQUFDLE1BQU0sQ0FBQyxNQUFNLEVBQUUsaUJBQWlCLEVBQUUsQ0FBQyxDQUFDLENBQUM7WUFDakUsR0FBRyxDQUFDLENBQUMsQ0FBQyxHQUFHLGlCQUFpQixHQUFHLENBQUMsQ0FBQztZQUMvQixHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsaUJBQWlCLEdBQUcsbUJBQW1CLENBQUM7WUFDakQsT0FBTyxDQUFDLHFCQUFxQixDQUFDLGlCQUFpQixDQUFDLENBQUM7WUFFakQsT0FBTyxPQUFPLENBQUM7U0FDbEI7YUFBTTtZQUNILFNBQVMsR0FBRyxLQUFLLENBQUM7WUFDbEIsT0FBTyxDQUFDLG9CQUFvQixFQUFFLENBQUM7WUFDL0IsSUFBSSxnQkFBZ0IsS0FBSyxTQUFTLEVBQUU7Z0JBQ2hDLE1BQU0sZ0JBQWdCLENBQUM7YUFDMUI7WUFDRCxPQUFPLGFBQWEsQ0FBQztTQUN4QjtRQUFBLENBQUM7SUFDTixDQUFDO0lBaUJELE1BQU0sYUFBYSxHQUFjLENBQUMsQ0FBQztJQUNuQyxNQUFNLFVBQVUsR0FBaUIsQ0FBQyxDQUFDO0lBQ25DLE1BQU0sV0FBVyxHQUFnQixDQUFDLENBQUM7SUFDbkMsTUFBTSxVQUFVLEdBQWlCLENBQUMsQ0FBQztJQUNuQyxNQUFNLGdCQUFnQixHQUFXLEVBQUUsQ0FBQztJQUVwQyxNQUFNLGNBQWMsR0FBYSxJQUFJLENBQUM7SUFFdEMsU0FBUyxPQUFPLENBQUksR0FBUSxFQUFFLE1BQWMsSUFBYyxPQUFPLElBQUksUUFBUSxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQyxRQUFRLENBQUUsR0FBRyxHQUFHLE1BQU0sQ0FBYSxDQUFDLENBQUMsQ0FBQztJQUNuSSxTQUFTLFFBQVEsQ0FBRyxHQUFRLEVBQUUsTUFBYyxJQUFjLE9BQU8sSUFBSSxRQUFRLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDLFNBQVMsQ0FBQyxHQUFHLEdBQUcsTUFBTSxFQUFFLElBQUksQ0FBUSxDQUFDLENBQUMsQ0FBQztJQUNwSSxTQUFTLFFBQVEsQ0FBRyxHQUFRLEVBQUUsTUFBYyxJQUFjLE9BQU8sSUFBSSxRQUFRLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDLFNBQVMsQ0FBQyxHQUFHLEdBQUcsTUFBTSxFQUFFLElBQUksQ0FBUSxDQUFDLENBQUMsQ0FBQztJQUNwSSxTQUFTLFVBQVUsQ0FBQyxHQUFRLEVBQUUsTUFBYyxJQUFjLE9BQU8sUUFBUSxDQUFHLEdBQUcsRUFBRSxNQUFNLENBQVEsQ0FBQyxDQUFDLENBQUM7SUFDbEcsU0FBUyxRQUFRLENBQUcsR0FBUSxFQUFFLE1BQWMsSUFBYyxPQUFPLFVBQVUsQ0FBQyxHQUFHLEVBQUUsTUFBTSxDQUFRLENBQUMsQ0FBQyxDQUFDO0lBR2xHLFNBQVMsZUFBZSxDQUFHLEdBQVEsRUFBRSxNQUFjO1FBQy9DLElBQUksRUFBRSxHQUFHLElBQUksUUFBUSxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUNyQyxJQUFJLEVBQUUsR0FBRyxFQUFFLENBQUMsU0FBUyxDQUFDLEdBQUcsR0FBRyxNQUFNLEdBQUcsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDO1FBQzlDLElBQUksRUFBRSxHQUFHLEVBQUUsQ0FBQyxTQUFTLENBQUMsR0FBRyxHQUFHLE1BQU0sR0FBRyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFDOUMsT0FBTyxDQUFDLEVBQUUsR0FBRyxXQUFXLEdBQUcsRUFBRSxDQUFRLENBQUM7SUFDMUMsQ0FBQztJQUVELFNBQVMsYUFBYSxDQUFHLEdBQVEsRUFBRSxNQUFjO1FBQzdDLElBQUksRUFBRSxHQUFHLElBQUksUUFBUSxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUNyQyxJQUFJLEVBQUUsR0FBRyxFQUFFLENBQUMsU0FBUyxDQUFDLEdBQUcsR0FBRyxNQUFNLEdBQUcsQ0FBQyxFQUFFLElBQUksQ0FBUSxDQUFDO1FBQ3JELElBQUksRUFBRSxHQUFHLEVBQUUsQ0FBQyxTQUFTLENBQUMsR0FBRyxHQUFHLE1BQU0sR0FBRyxDQUFDLEVBQUUsSUFBSSxDQUFRLENBQUM7UUFDckQsT0FBTyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQztJQUNwQixDQUFDO0lBRUQsU0FBUyxRQUFRLENBQU8sR0FBUSxFQUFFLE1BQWMsRUFBRSxLQUFTLElBQVMsSUFBSSxRQUFRLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDLFFBQVEsQ0FBRSxHQUFHLEdBQUcsTUFBTSxFQUFFLEtBQUssQ0FBTyxDQUFDLENBQUMsQ0FBQztJQUN2SSxTQUFTLFNBQVMsQ0FBTSxHQUFRLEVBQUUsTUFBYyxFQUFFLEtBQVUsSUFBUSxJQUFJLFFBQVEsQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUMsU0FBUyxDQUFDLEdBQUcsR0FBRyxNQUFNLEVBQUUsS0FBSyxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUN2SSxTQUFTLFNBQVMsQ0FBTSxHQUFRLEVBQUUsTUFBYyxFQUFFLEtBQVUsSUFBUSxJQUFJLFFBQVEsQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUMsU0FBUyxDQUFDLEdBQUcsR0FBRyxNQUFNLEVBQUUsS0FBSyxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUN2SSxTQUFTLFdBQVcsQ0FBSSxHQUFRLEVBQUUsTUFBYyxFQUFFLEtBQVksSUFBTSxTQUFTLENBQUcsR0FBRyxFQUFFLE1BQU0sRUFBRSxLQUFZLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDN0csU0FBUyxTQUFTLENBQU0sR0FBUSxFQUFFLE1BQWMsRUFBRSxLQUFVLElBQVEsV0FBVyxDQUFDLEdBQUcsRUFBRSxNQUFNLEVBQUUsS0FBWSxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQzdHLFNBQVMsY0FBYyxDQUFDLEdBQVEsRUFBRSxNQUFjLEVBQUUsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFhO1FBQ2xFLFNBQVMsQ0FBQyxHQUFHLEVBQUUsTUFBTSxHQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQztRQUM3QixTQUFTLENBQUMsR0FBRyxFQUFFLE1BQU0sR0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUM7SUFDakMsQ0FBQztJQUVELFNBQVMsS0FBSyxDQUFDLEdBQVEsRUFBRSxLQUFZLEVBQUUsR0FBVSxJQUFjLE9BQU8sSUFBSSxRQUFRLENBQUMsTUFBTSxDQUFDLE1BQU0sRUFBRSxHQUFHLEdBQUMsS0FBSyxFQUFFLEdBQUcsR0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDMUgsU0FBUyxNQUFNLENBQUMsR0FBUSxFQUFFLEtBQVksRUFBRSxHQUFVLElBQWdCLE9BQU8sSUFBSSxVQUFVLENBQUMsTUFBTSxDQUFDLE1BQU0sRUFBRSxHQUFHLEdBQUMsS0FBSyxFQUFFLEdBQUcsR0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFFL0gsU0FBUyxRQUFRLENBQUMsRUFBVTtRQUN4QixPQUFPLElBQUksT0FBTyxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUMsVUFBVSxDQUFDLEdBQUcsRUFBRSxDQUFDLE9BQU8sRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUM7SUFDbkUsQ0FBQztJQUVELFNBQVMsUUFBUSxDQUFDLEVBQVU7UUFDeEIsT0FBTyxRQUFRLENBQUMsRUFBRSxHQUFHLElBQUksR0FBRyxJQUFJLENBQUMsQ0FBQztJQUN0QyxDQUFDO0lBRUQsU0FBUyxHQUFHO1FBQ1IsUUFBUSxDQUFDO1FBQ1QsT0FBTyxnQkFBZ0IsQ0FBQztJQUM1QixDQUFDO0lBRUQsU0FBUyxRQUFRLEtBQStCLE9BQU8sR0FBRyxFQUFFLENBQUMsQ0FBQyxDQUFDO0lBQy9ELFNBQVMsY0FBYyxLQUF5QixPQUFPLEdBQUcsRUFBRSxDQUFDLENBQUMsQ0FBQztJQUMvRCxTQUFTLFdBQVcsS0FBNEIsT0FBTyxHQUFHLEVBQUUsQ0FBQyxDQUFDLENBQUM7SUFDL0QsU0FBUyxpQkFBaUIsS0FBc0IsT0FBTyxHQUFHLEVBQUUsQ0FBQyxDQUFDLENBQUM7SUFDL0QsU0FBUyxhQUFhLEtBQTBCLE9BQU8sR0FBRyxFQUFFLENBQUMsQ0FBQyxDQUFDO0lBQy9ELFNBQVMsY0FBYyxLQUF5QixPQUFPLEdBQUcsRUFBRSxDQUFDLENBQUMsQ0FBQztJQUMvRCxTQUFTLFNBQVMsS0FBOEIsT0FBTyxHQUFHLEVBQUUsQ0FBQyxDQUFDLENBQUM7SUFDL0QsU0FBUyxXQUFXLEtBQTRCLE9BQU8sR0FBRyxFQUFFLENBQUMsQ0FBQyxDQUFDO0lBQy9ELFNBQVMsUUFBUSxLQUErQixPQUFPLEdBQUcsRUFBRSxDQUFDLENBQUMsQ0FBQztJQUMvRCxTQUFTLFdBQVcsS0FBNEIsT0FBTyxHQUFHLEVBQUUsQ0FBQyxDQUFDLENBQUM7SUFDL0QsU0FBUyxhQUFhLEtBQTBCLE9BQU8sR0FBRyxFQUFFLENBQUMsQ0FBQyxDQUFDO0lBQy9ELFNBQVMsbUJBQW1CLEtBQW9CLE9BQU8sR0FBRyxFQUFFLENBQUMsQ0FBQyxDQUFDO0lBQy9ELFNBQVMsb0JBQW9CLEtBQW1CLE9BQU8sR0FBRyxFQUFFLENBQUMsQ0FBQyxDQUFDO0lBQy9ELFNBQVMsZUFBZSxLQUF3QixPQUFPLEdBQUcsRUFBRSxDQUFDLENBQUMsQ0FBQztJQUMvRCxTQUFTLG9CQUFvQixLQUFtQixPQUFPLEdBQUcsRUFBRSxDQUFDLENBQUMsQ0FBQztJQUMvRCxTQUFTLHFCQUFxQixLQUFrQixPQUFPLEdBQUcsRUFBRSxDQUFDLENBQUMsQ0FBQztJQUMvRCxTQUFTLFFBQVEsS0FBK0IsT0FBTyxHQUFHLEVBQUUsQ0FBQyxDQUFDLENBQUM7SUFDL0QsU0FBUyxjQUFjLEtBQXlCLE9BQU8sR0FBRyxFQUFFLENBQUMsQ0FBQyxDQUFDO0lBQy9ELFNBQVMsbUJBQW1CLEtBQW9CLE9BQU8sR0FBRyxFQUFFLENBQUMsQ0FBQyxDQUFDO0lBQy9ELFNBQVMsU0FBUyxLQUE4QixPQUFPLEdBQUcsRUFBRSxDQUFDLENBQUMsQ0FBQztJQUUvRCxTQUFTLE9BQU8sQ0FBQyxFQUFNLEVBQUUsZUFBb0IsRUFBRSxlQUFzQixFQUFFLFNBQWM7UUFBVyxPQUFPLFFBQVEsQ0FBQyxLQUFLLElBQUksRUFBRTtZQUd2SCxJQUFJLEtBQUssR0FBRyxDQUFDLENBQUM7WUFDZCxJQUFJLEtBQUssR0FBRyxhQUFhLENBQUM7WUFFMUIsS0FBSyxJQUFJLFNBQVMsR0FBRyxDQUFDLEVBQUUsU0FBUyxHQUFHLGVBQWUsRUFBRSxFQUFFLFNBQVMsRUFBRTtnQkFDOUQsSUFBSSxPQUFPLEdBQUcsUUFBUSxDQUFDLGVBQWUsRUFBRSxDQUFDLEdBQUcsU0FBUyxHQUFHLENBQUMsQ0FBQyxDQUFDO2dCQUMzRCxJQUFJLE9BQU8sR0FBRyxVQUFVLENBQUMsZUFBZSxFQUFFLENBQUMsR0FBRyxTQUFTLEdBQUcsQ0FBQyxDQUFDLENBQUM7Z0JBQzdELElBQUksT0FBTyxJQUFJLENBQUMsRUFBRTtvQkFBRSxTQUFTO2lCQUFFO2dCQUUvQixRQUFRLEVBQUUsRUFBRTtvQkFDUixLQUFLLENBQUM7d0JBQ0YsSUFBSSxJQUFJLEdBQUcsTUFBTSxLQUFLLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDO3dCQUNyQyxLQUFLLElBQUksQ0FBQyxHQUFDLENBQUMsRUFBRSxDQUFDLEdBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRSxFQUFFLENBQUMsRUFBRTs0QkFDOUIsSUFBSSxDQUFDLEdBQUcsSUFBSSxDQUFDLENBQUMsQ0FBTyxDQUFDOzRCQUN0QixRQUFRLENBQUMsT0FBTyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQzt5QkFDM0I7d0JBQ0QsS0FBSyxJQUFJLElBQUksQ0FBQyxNQUFNLENBQUM7d0JBQ3JCLElBQUksSUFBSSxDQUFDLE1BQU0sR0FBRyxPQUFPLEVBQUU7NEJBQ3ZCLFdBQVcsQ0FBQyxTQUFTLEVBQUUsQ0FBQyxFQUFFLEtBQWMsQ0FBQyxDQUFDOzRCQUMxQyxPQUFPLEtBQUssQ0FBQzt5QkFDaEI7d0JBQ0QsTUFBTTtvQkFDVjt3QkFDSSxLQUFLLEdBQUcsVUFBVSxDQUFDO3dCQUNuQixNQUFNO2lCQUNiO2FBQ0o7WUFFRCxXQUFXLENBQUMsU0FBUyxFQUFFLENBQUMsRUFBRSxLQUFjLENBQUMsQ0FBQztZQUMxQyxPQUFPLEtBQUssQ0FBQztRQUNqQixDQUFDLEVBQUUsY0FBYyxDQUFDLENBQUE7SUFBQSxDQUFDO0lBRW5CLFNBQVMsVUFBVSxLQUE2QixPQUFPLEdBQUcsRUFBRSxDQUFDLENBQUMsQ0FBQztJQUMvRCxTQUFTLFdBQVcsS0FBNEIsT0FBTyxHQUFHLEVBQUUsQ0FBQyxDQUFDLENBQUM7SUFDL0QsU0FBUyxPQUFPLEtBQWdDLE9BQU8sR0FBRyxFQUFFLENBQUMsQ0FBQyxDQUFDO0lBQy9ELFNBQVMsT0FBTyxLQUFnQyxPQUFPLEdBQUcsRUFBRSxDQUFDLENBQUMsQ0FBQztJQUMvRCxTQUFTLE9BQU8sS0FBZ0MsT0FBTyxHQUFHLEVBQUUsQ0FBQyxDQUFDLENBQUM7SUFFL0QsU0FBUyxRQUFRLENBQUMsRUFBTSxFQUFFLGdCQUFxQixFQUFFLGdCQUF1QixFQUFFLFlBQWlCO1FBSXZGLElBQUksUUFBUSxHQUFHLENBQUMsQ0FBQztRQUNqQixJQUFJLEtBQUssR0FBRyxhQUFhLENBQUM7UUFFMUIsSUFBSSxJQUFJLEdBQUcsRUFBRSxDQUFDO1FBQ2QsS0FBSyxJQUFJLFVBQVUsR0FBRyxDQUFDLEVBQUUsVUFBVSxHQUFHLGdCQUFnQixFQUFFLEVBQUUsVUFBVSxFQUFFO1lBQ2xFLElBQUksT0FBTyxHQUFHLFFBQVEsQ0FBQyxnQkFBZ0IsRUFBRSxDQUFDLEdBQUcsVUFBVSxHQUFHLENBQUMsQ0FBQyxDQUFDO1lBQzdELElBQUksT0FBTyxHQUFHLFVBQVUsQ0FBQyxnQkFBZ0IsRUFBRSxDQUFDLEdBQUcsVUFBVSxHQUFHLENBQUMsQ0FBQyxDQUFDO1lBRS9ELFFBQVEsRUFBRSxFQUFFO2dCQUNSLEtBQUssQ0FBQyxDQUFDO2dCQUNQLEtBQUssQ0FBQztvQkFDRixJQUFJLElBQUksSUFBSSxXQUFXLEVBQUUsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLE9BQU8sRUFBRSxDQUFVLEVBQUUsT0FBTyxDQUFDLENBQUMsQ0FBQztvQkFDdEUsUUFBUSxJQUFJLE9BQU8sQ0FBQztvQkFDcEIsTUFBTTtnQkFDVjtvQkFDSSxLQUFLLEdBQUcsVUFBVSxDQUFDO29CQUNuQixNQUFNO2FBQ2I7U0FDSjtRQUVELEdBQUcsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUM7UUFFaEIsV0FBVyxDQUFDLFlBQVksRUFBRSxDQUFDLEVBQUUsUUFBaUIsQ0FBQyxDQUFDO1FBQ2hELE9BQU8sS0FBSyxDQUFDO0lBQ2pCLENBQUM7SUFFRCxTQUFTLHFCQUFxQixLQUFrQixPQUFPLEdBQUcsRUFBRSxDQUFDLENBQUMsQ0FBQztJQUMvRCxTQUFTLGtCQUFrQixLQUFxQixPQUFPLEdBQUcsRUFBRSxDQUFDLENBQUMsQ0FBQztJQUMvRCxTQUFTLHVCQUF1QixLQUFnQixPQUFPLEdBQUcsRUFBRSxDQUFDLENBQUMsQ0FBQztJQUMvRCxTQUFTLFNBQVMsS0FBOEIsT0FBTyxHQUFHLEVBQUUsQ0FBQyxDQUFDLENBQUM7SUFDL0QsU0FBUyxTQUFTLEtBQThCLE9BQU8sR0FBRyxFQUFFLENBQUMsQ0FBQyxDQUFDO0lBQy9ELFNBQVMsYUFBYSxLQUEwQixPQUFPLEdBQUcsRUFBRSxDQUFDLENBQUMsQ0FBQztJQUMvRCxTQUFTLHFCQUFxQixLQUFrQixPQUFPLEdBQUcsRUFBRSxDQUFDLENBQUMsQ0FBQztJQUMvRCxTQUFTLFdBQVcsS0FBNEIsT0FBTyxHQUFHLEVBQUUsQ0FBQyxDQUFDLENBQUM7SUFDL0QsU0FBUyxZQUFZLEtBQTJCLE9BQU8sR0FBRyxFQUFFLENBQUMsQ0FBQyxDQUFDO0lBQy9ELFNBQVMsZ0JBQWdCLEtBQXVCLE9BQU8sR0FBRyxFQUFFLENBQUMsQ0FBQyxDQUFDO0lBRS9ELFNBQVMsV0FBVyxDQUFDLE9BQVksRUFBRSxVQUFlLEVBQUUsUUFBZSxFQUFFLGVBQW9CO1FBQVcsT0FBTyxRQUFRLENBQUMsS0FBSyxJQUFJLEVBQUU7WUFJM0gsSUFBSSxXQUFXLEdBQUcsQ0FBQyxDQUFDO1lBQ3BCLFdBQVcsQ0FBQyxlQUFlLEVBQUUsQ0FBQyxFQUFFLFdBQW9CLENBQUMsQ0FBQztZQUV0RCxJQUFJLFFBQVEsSUFBSSxDQUFDLEVBQUU7Z0JBQUUsT0FBTyxhQUFhLENBQUM7YUFBRTtZQUM1QyxJQUFJLFFBQVEsR0FBRyxDQUFDLEVBQUU7Z0JBQUUsR0FBRyxFQUFFLENBQUM7Z0JBQUMsT0FBTyxVQUFVLENBQUM7YUFBRTtZQUUvQyxLQUFLLElBQUksR0FBRyxHQUFDLENBQUMsRUFBRSxHQUFHLEdBQUMsUUFBUSxFQUFFLEVBQUUsR0FBRyxFQUFFO2dCQUNqQyxJQUFJLFFBQVEsR0FBRyxDQUFDLE9BQU8sR0FBRyxFQUFFLEdBQUcsR0FBRyxDQUFRLENBQUM7Z0JBRTNDLElBQUksUUFBUSxHQUFVLGFBQWEsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFDLENBQUM7Z0JBRWpELElBQUksS0FBSyxHQUFhLE9BQU8sQ0FBRSxRQUFRLEVBQUUsQ0FBQyxDQUFDLENBQUM7Z0JBRTVDLE1BQU0sZUFBZSxHQUFvQixDQUFDLENBQUM7Z0JBQzNDLE1BQU0saUJBQWlCLEdBQWtCLENBQUMsQ0FBQztnQkFDM0MsTUFBTSxrQkFBa0IsR0FBaUIsQ0FBQyxDQUFDO2dCQUMzQyxJQUFJLEtBQUssS0FBSyxlQUFlLEVBQUU7b0JBQzNCLE9BQU8sR0FBRyxFQUFFLENBQUM7aUJBQ2hCO2dCQUdELElBQUksWUFBWSxHQUFNLFFBQVEsQ0FBQyxRQUFRLEVBQUUsRUFBRSxDQUFDLENBQUM7Z0JBRTdDLE1BQU0sZ0JBQWdCLEdBQXlCLENBQUMsQ0FBQztnQkFDakQsTUFBTSxpQkFBaUIsR0FBd0IsQ0FBQyxDQUFDO2dCQUNqRCxNQUFNLDBCQUEwQixHQUFlLENBQUMsQ0FBQztnQkFDakQsTUFBTSx5QkFBeUIsR0FBZ0IsQ0FBQyxDQUFDO2dCQUdqRCxJQUFJLGlCQUFpQixHQUFLLGVBQWUsQ0FBQyxRQUFRLEVBQUUsRUFBRSxDQUFDLENBQUM7Z0JBQ3hELElBQUksbUJBQW1CLEdBQUcsZUFBZSxDQUFDLFFBQVEsRUFBRSxFQUFFLENBQUMsQ0FBQztnQkFFeEQsSUFBSSxlQUFlLEdBQU8sUUFBUSxDQUFDLFFBQVEsRUFBRSxFQUFFLENBQUMsQ0FBQztnQkFDakQsTUFBTSx3Q0FBd0MsR0FBUyxHQUFHLENBQUM7Z0JBQzNELE9BQU8sQ0FBQyxNQUFNLENBQUMsZUFBZSxLQUFLLENBQUMsRUFBRSx5Q0FBeUMsQ0FBQyxDQUFDO2dCQUVqRixJQUFJLEdBQUcsR0FBRyxDQUFDLGVBQWUsR0FBRyx3Q0FBd0MsQ0FBQyxLQUFLLENBQUMsQ0FBQztnQkFHN0UsSUFBSSxHQUFHLEVBQUU7b0JBQ0wsT0FBTyxHQUFHLEVBQUUsQ0FBQztpQkFDaEI7cUJBQU07b0JBQ0gsUUFBUSxZQUFZLEVBQUU7d0JBQ2xCLEtBQUssZ0JBQWdCLENBQUM7d0JBQ3RCLEtBQUssaUJBQWlCOzRCQUNsQixNQUFNLFFBQVEsQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDOzRCQUdsQyxjQUFjLENBQUUsVUFBVSxFQUFFLEVBQUUsR0FBRyxXQUFXLEdBQUksQ0FBQyxFQUFFLFFBQVEsQ0FBQyxDQUFDOzRCQUM3RCxTQUFTLENBQU8sVUFBVSxFQUFFLEVBQUUsR0FBRyxXQUFXLEdBQUksQ0FBQyxFQUFFLENBQVEsQ0FBQyxDQUFDOzRCQUM3RCxRQUFRLENBQVEsVUFBVSxFQUFFLEVBQUUsR0FBRyxXQUFXLEdBQUcsRUFBRSxFQUFFLEtBQUssQ0FBQyxDQUFDOzRCQUcxRCxXQUFXLElBQUksQ0FBQyxDQUFDOzRCQUNqQixXQUFXLENBQUMsZUFBZSxFQUFFLENBQUMsRUFBRSxXQUFvQixDQUFDLENBQUM7NEJBQ3RELE1BQU07d0JBQ1Y7NEJBQ0ksT0FBTyxHQUFHLEVBQUUsQ0FBQztxQkFDcEI7aUJBQ0o7YUFDSjtZQUVELFdBQVcsQ0FBQyxlQUFlLEVBQUUsQ0FBQyxFQUFFLFFBQVEsQ0FBQyxDQUFDO1lBQzFDLE9BQU8sYUFBYSxDQUFDO1FBQ3pCLENBQUMsRUFBRSxjQUFjLENBQUMsQ0FBQTtJQUFBLENBQUM7SUFFbkIsU0FBUyxTQUFTLENBQUMsSUFBWTtRQUUzQixHQUFHLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQzFCLE1BQU0sTUFBTSxDQUFDO0lBQ2pCLENBQUM7SUFFRCxTQUFTLFVBQVUsS0FBNkIsT0FBTyxHQUFHLEVBQUUsQ0FBQyxDQUFDLENBQUM7SUFFL0QsU0FBUyxXQUFXO1FBQVksT0FBTyxRQUFRLENBQUMsS0FBSyxJQUFJLEVBQUU7WUFHdkQsTUFBTSxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDbEIsT0FBTyxhQUFhLENBQUM7UUFDekIsQ0FBQyxFQUFFLGNBQWMsQ0FBQyxDQUFBO0lBQUEsQ0FBQztJQUVuQixTQUFTLFVBQVUsQ0FBQyxHQUFRLEVBQUUsR0FBVTtRQUdwQyxJQUFJLFFBQVEsSUFBSSxJQUFJLEVBQUU7WUFDbEIsSUFBSSxDQUFDLE1BQU0sQ0FBQyxlQUFlLENBQUMsTUFBTSxDQUFDLEdBQUcsRUFBRSxDQUFVLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQztTQUM3RDthQUFNO1lBQ0gsS0FBSyxJQUFJLENBQUMsR0FBQyxDQUFDLEVBQUUsQ0FBQyxHQUFDLEdBQUcsRUFBRSxFQUFFLENBQUMsRUFBRTtnQkFDdEIsUUFBUSxDQUFDLEdBQUcsRUFBRSxDQUFDLEVBQUUsQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFLEdBQUMsS0FBSyxDQUFDLENBQU8sQ0FBQyxDQUFDO2FBQ3BFO1NBQ0o7UUFDRCxPQUFPLGFBQWEsQ0FBQztJQUN6QixDQUFDO0lBRUQsU0FBUyxTQUFTLEtBQThCLE9BQU8sR0FBRyxFQUFFLENBQUMsQ0FBQyxDQUFDO0lBQy9ELFNBQVMsU0FBUyxLQUE4QixPQUFPLEdBQUcsRUFBRSxDQUFDLENBQUMsQ0FBQztJQUMvRCxTQUFTLGFBQWEsS0FBMEIsT0FBTyxHQUFHLEVBQUUsQ0FBQyxDQUFDLENBQUM7SUFFL0QsTUFBTSxPQUFPLEdBQUc7UUFDWixzQkFBc0IsRUFBRTtZQUNwQixRQUFRO1lBQ1IsY0FBYztZQUNkLFdBQVc7WUFDWCxpQkFBaUI7WUFDakIsYUFBYTtZQUNiLGNBQWM7WUFDZCxTQUFTO1lBQ1QsV0FBVztZQUNYLFFBQVE7WUFDUixXQUFXO1lBQ1gsYUFBYTtZQUNiLG1CQUFtQjtZQUNuQixvQkFBb0I7WUFDcEIsZUFBZTtZQUNmLG9CQUFvQjtZQUNwQixxQkFBcUI7WUFDckIsUUFBUTtZQUNSLGNBQWM7WUFDZCxtQkFBbUI7WUFDbkIsU0FBUztZQUNULE9BQU87WUFDUCxVQUFVO1lBQ1YsV0FBVztZQUNYLE9BQU87WUFDUCxPQUFPO1lBQ1AsT0FBTztZQUNQLFFBQVE7WUFDUixxQkFBcUI7WUFDckIsa0JBQWtCO1lBQ2xCLHVCQUF1QjtZQUN2QixTQUFTO1lBQ1QsU0FBUztZQUNULGFBQWE7WUFDYixxQkFBcUI7WUFDckIsV0FBVztZQUNYLFlBQVk7WUFDWixnQkFBZ0I7WUFDaEIsV0FBVztZQUNYLFNBQVM7WUFDVCxVQUFVO1lBQ1YsV0FBVztZQUNYLFVBQVU7WUFDVixTQUFTO1lBQ1QsU0FBUztZQUNULGFBQWE7U0FDaEI7S0FDSixDQUFDO0lBWUYsTUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO0lBQzFCLE1BQU0sVUFBVSxHQUFHLElBQUksVUFBVSxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQztJQUNqRCxLQUFLLElBQUksQ0FBQyxHQUFDLENBQUMsRUFBRSxDQUFDLEdBQUMsTUFBTSxDQUFDLE1BQU0sRUFBRSxFQUFFLENBQUMsRUFBRTtRQUFFLFVBQVUsQ0FBQyxDQUFDLENBQUMsR0FBRyxNQUFNLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDO0tBQUU7SUFFN0UsV0FBVyxDQUFDLE9BQU8sQ0FBQyxVQUFVLENBQUMsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDO1FBQzVDLElBQUksS0FBSyxFQUFFO1lBQ1AsV0FBVyxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLFVBQVUsR0FBRztnQkFDL0MsT0FBTyxDQUFDLEdBQUcsQ0FBQyxRQUFRLEVBQUUsR0FBRyxDQUFDLENBQUM7WUFDL0IsQ0FBQyxDQUFDLENBQUM7WUFDSCxXQUFXLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsVUFBVSxHQUFHO2dCQUMvQyxPQUFPLENBQUMsR0FBRyxDQUFDLFFBQVEsRUFBRSxHQUFHLENBQUMsQ0FBQztZQUMvQixDQUFDLENBQUMsQ0FBQztTQUNOO1FBQ0QsT0FBTyxXQUFXLENBQUMsV0FBVyxDQUFDLENBQUMsRUFBRSxPQUFPLENBQUMsQ0FBQztJQUMvQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDO1FBQ2YsT0FBTyxHQUFxQixDQUFDLENBQUMsT0FBTyxDQUFDO1FBRXRDLE1BQU0sR0FBRyxPQUFPLENBQUMsTUFBTSxDQUFDO1FBQ3hCLGlCQUFpQixHQUFHLE1BQU0sQ0FBQyxJQUFJLENBQUMsbUJBQW1CLENBQUMsQ0FBQztRQUNyRCxPQUFPLENBQUMsTUFBTSxDQUFDLGlCQUFpQixLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDekMsaUJBQWlCLEdBQUcsY0FBYyxHQUFHLGlCQUFpQixDQUFDO1FBRXZELElBQUksRUFBRSxDQUFDO0lBQ1gsQ0FBQyxDQUFDLENBQUM7QUFDUCxDQUFDO0FDamJELFNBQVMsUUFBUTtJQUViLE1BQU0sSUFBSSxHQUFHLGNBQW1CLE9BQU8sY0FBYyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUM7SUFDM0QsUUFBUSxDQUFDLGdCQUFnQixDQUFDLFVBQVUsRUFBRSxVQUFTLENBQUM7UUFDNUMsSUFBSSxJQUFJLEdBQUcsQ0FBQyxDQUFDLElBQUksSUFBSSxNQUFNLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUNyRCxJQUFJLElBQUksS0FBSyxJQUFJLEVBQUU7WUFBRSxJQUFJLEdBQUcsSUFBSSxDQUFDO1NBQUU7UUFDbkMsUUFBUSxJQUFJLEVBQUU7WUFDVixLQUFLLEtBQUs7Z0JBQ04sUUFBUSxJQUFJLEVBQUU7b0JBQ1YsS0FBSyxJQUFJLENBQUM7b0JBQ1YsS0FBSyxJQUFJLENBQUM7b0JBQ1YsS0FBSyxJQUFJLENBQUM7b0JBRVY7d0JBQ0ksS0FBSyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQzt3QkFDbEIsTUFBTTtpQkFDYjtnQkFDRCxNQUFNO1lBQ1YsS0FBSyxjQUFjO2dCQUNmLFFBQVEsSUFBSSxFQUFFO29CQUNWLEtBQUssSUFBSSxDQUFDO29CQUNWLEtBQUssSUFBSSxDQUFDO29CQUNWLEtBQUssSUFBSTt3QkFFTCxNQUFNO29CQUNWO3dCQUNJLEdBQUcsQ0FBQyxLQUFLLENBQUMsV0FBVyxJQUFJLElBQUksQ0FBQzt3QkFDOUIsTUFBTTtpQkFDYjtnQkFDRCxNQUFNO1NBQ2I7UUFDRCxDQUFDLENBQUMsY0FBYyxFQUFFLENBQUM7UUFDbkIsQ0FBQyxDQUFDLGVBQWUsRUFBRSxDQUFDO0lBQ3hCLENBQUMsQ0FBQyxDQUFDO0lBQ0gsUUFBUSxDQUFDLGdCQUFnQixDQUFDLFNBQVMsRUFBRSxVQUFTLENBQUM7UUFDM0MsSUFBSSxHQUFHLEdBQUcsRUFBRSxDQUFDO1FBQ2IsSUFBSSxDQUFDLENBQUMsT0FBTztZQUFLLEdBQUcsSUFBSSxPQUFPLENBQUM7UUFDakMsSUFBSSxDQUFDLENBQUMsTUFBTTtZQUFNLEdBQUcsSUFBSSxNQUFNLENBQUM7UUFDaEMsSUFBSSxDQUFDLENBQUMsUUFBUTtZQUFJLEdBQUcsSUFBSSxRQUFRLENBQUM7UUFDbEMsR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUM7UUFFekIsUUFBUSxJQUFJLEVBQUU7WUFDVixLQUFLLEtBQUs7Z0JBQ04sUUFBUSxHQUFHLEVBQUU7b0JBQ1QsS0FBSyxXQUFXO3dCQUFJLEtBQUssQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLENBQUM7d0JBQUksTUFBTTtvQkFDbEQsS0FBSyxPQUFPO3dCQUFRLEtBQUssQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUM7d0JBQU0sTUFBTTtvQkFDbEQsS0FBSyxhQUFhO3dCQUFFLEtBQUssQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUM7d0JBQU0sTUFBTTtvQkFDbEQsS0FBSyxLQUFLO3dCQUFVLEtBQUssQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUM7d0JBQU0sTUFBTTtvQkFDbEQsS0FBSyxLQUFLO3dCQUFVLEtBQUssQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLENBQUM7d0JBQUksTUFBTTtvQkFDbEQsS0FBSyxRQUFRO3dCQUFPLEtBQUssQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLENBQUM7d0JBQUksTUFBTTtvQkFDbEQsT0FBTyxDQUFDLENBQVksT0FBTztpQkFDOUI7Z0JBQ0QsTUFBTTtZQUNWLEtBQUssY0FBYztnQkFDZixRQUFRLEdBQUcsRUFBRTtvQkFDVCxLQUFLLFdBQVc7d0JBQ1osSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxXQUFXLEVBQUU7NEJBQ3pCLEdBQUcsQ0FBQyxLQUFLLENBQUMsV0FBVyxHQUFHLEdBQUcsQ0FBQyxLQUFLLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxDQUFDLEVBQUUsR0FBRyxDQUFDLEtBQUssQ0FBQyxXQUFXLENBQUMsTUFBTSxHQUFDLENBQUMsQ0FBQyxDQUFDO3lCQUMzRjt3QkFFRCxNQUFNO29CQUNWLEtBQUssT0FBTyxDQUFDO29CQUNiLEtBQUssYUFBYTt3QkFDZCxJQUFJLE1BQU0sR0FBRyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsV0FBVyxJQUFJLEVBQUUsQ0FBQyxHQUFHLElBQUksQ0FBQzt3QkFDbEQsR0FBRyxDQUFDLEtBQUssQ0FBQyxXQUFXLEdBQUcsRUFBRSxDQUFDO3dCQUMzQixLQUFLLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFDO3dCQUNwQixNQUFNO29CQUNWLEtBQUssS0FBSzt3QkFBTSxHQUFHLENBQUMsS0FBSyxDQUFDLFdBQVcsR0FBRyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsV0FBVyxJQUFJLEVBQUUsQ0FBQyxHQUFHLElBQUksQ0FBQzt3QkFBQyxNQUFNO29CQUNwRixLQUFLLEtBQUs7d0JBQU0sR0FBRyxDQUFDLEtBQUssQ0FBQyxXQUFXLEdBQUcsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLFdBQVcsSUFBSSxFQUFFLENBQUMsR0FBRyxNQUFNLENBQUM7d0JBQUMsTUFBTTtvQkFDdEYsS0FBSyxRQUFRO3dCQUFHLEdBQUcsQ0FBQyxLQUFLLENBQUMsV0FBVyxHQUFHLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxXQUFXLElBQUksRUFBRSxDQUFDLEdBQUcsTUFBTSxDQUFDO3dCQUFDLE1BQU07b0JBQ3RGLE9BQU8sQ0FBQyxDQUFRLE9BQU87aUJBQzFCO2dCQUNELE1BQU07U0FDYjtRQUNELENBQUMsQ0FBQyxjQUFjLEVBQUUsQ0FBQztRQUNuQixDQUFDLENBQUMsZUFBZSxFQUFFLENBQUM7SUFDeEIsQ0FBQyxDQUFDLENBQUM7SUFFSCxnQkFBZ0IsQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDO0FBQ3hDLENBQUM7QUMvRUQsSUFBVSxLQUFLLENBK0JkO0FBL0JELFdBQVUsS0FBSztJQUNYLElBQUksR0FBRyxHQUF3QixFQUFFLENBQUM7SUFDbEMsSUFBSSxVQUFVLEdBQWlFLEVBQUUsQ0FBQztJQUVsRixTQUFnQixJQUFJLENBQUMsR0FBVztRQUM1QixPQUFPLElBQUksT0FBTyxDQUFDLENBQUMsUUFBUSxFQUFFLEVBQUU7WUFDNUIsVUFBVSxDQUFDLElBQUksQ0FBQyxFQUFDLEdBQUcsRUFBRSxRQUFRLEVBQUMsQ0FBQyxDQUFDO1lBQ2pDLFFBQVEsRUFBRSxDQUFDO1FBQ2YsQ0FBQyxDQUFDLENBQUM7SUFDUCxDQUFDO0lBTGUsVUFBSSxPQUtuQixDQUFBO0lBRUQsU0FBZ0IsS0FBSyxDQUFDLElBQVk7UUFDOUIsR0FBRyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUNoQixJQUFJLEtBQUssR0FBRyxJQUFJLFdBQVcsRUFBRSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUMzQyxLQUFLLElBQUksQ0FBQyxHQUFDLENBQUMsRUFBRSxDQUFDLEdBQUMsS0FBSyxDQUFDLE1BQU0sRUFBRSxFQUFFLENBQUMsRUFBRTtZQUMvQixHQUFHLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1NBQ3RCO1FBQ0QsUUFBUSxFQUFFLENBQUM7SUFDZixDQUFDO0lBUGUsV0FBSyxRQU9wQixDQUFBO0lBRUQsU0FBUyxRQUFRO1FBQ2IsT0FBTyxHQUFHLENBQUMsTUFBTSxHQUFHLENBQUMsSUFBSSxVQUFVLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRTtZQUM1QyxNQUFNLEVBQUUsR0FBRyxVQUFVLENBQUMsS0FBSyxFQUFFLENBQUM7WUFDOUIsSUFBSSxFQUFFLEtBQUssU0FBUztnQkFBRSxTQUFTO1lBQy9CLE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLE1BQU0sRUFBRSxFQUFFLENBQUMsR0FBRyxDQUFDLENBQUM7WUFDM0MsTUFBTSxJQUFJLEdBQUcsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUM7WUFDakMsTUFBTSxLQUFLLEdBQUcsR0FBRyxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQztZQUMvQixHQUFHLEdBQUcsS0FBSyxDQUFDO1lBQ1osQ0FBQyxFQUFFLENBQUMsUUFBUSxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUM7U0FDdkI7SUFDTCxDQUFDO0FBQ0wsQ0FBQyxFQS9CUyxLQUFLLEtBQUwsS0FBSyxRQStCZCIsInNvdXJjZXNDb250ZW50IjpbIm5hbWVzcGFjZSBjb24ge1xyXG4gICAgZnVuY3Rpb24gcmVxdWlyZUVsZW1lbnRCeUlkKGlkOiBzdHJpbmcpOiBIVE1MRWxlbWVudCB7XHJcbiAgICAgICAgbGV0IGVsID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoaWQpO1xyXG4gICAgICAgIGlmICghZWwpIHsgdGhyb3cgYG5vIHN1Y2ggZWxlbWVudCBpbiBkb2N1bWVudDogIyR7aWR9YDsgfVxyXG4gICAgICAgIHJldHVybiBlbDtcclxuICAgIH1cclxuXHJcbiAgICBjb25zdCBlQ29uICAgICAgPSByZXF1aXJlRWxlbWVudEJ5SWQoXCJjb25zb2xlXCIpO1xyXG4gICAgY29uc3QgZUlucHV0ICAgID0gcmVxdWlyZUVsZW1lbnRCeUlkKFwiY29uc29sZS1pbnB1dFwiKTtcclxuICAgIGNvbnN0IGVDdXJzb3IgICA9IHJlcXVpcmVFbGVtZW50QnlJZChcImNvbnNvbGUtY3Vyc29yXCIpO1xyXG5cclxuICAgIGV4cG9ydCBjb25zdCBpbnB1dCA9IGVJbnB1dDtcclxuXHJcbiAgICBleHBvcnQgZnVuY3Rpb24gd3JpdGUodGV4dDogc3RyaW5nKSB7XHJcbiAgICAgICAgaWYgKHRleHQgPT09IFwiXCIpIHJldHVybjtcclxuICAgICAgICBlQ29uLmluc2VydEJlZm9yZShkb2N1bWVudC5jcmVhdGVUZXh0Tm9kZSh0ZXh0KSwgZUlucHV0KTtcclxuICAgIH1cclxuXHJcbiAgICBleHBvcnQgZnVuY3Rpb24gd3JpdGVfcHJvY19leGl0KGNvZGU6IG51bWJlcikge1xyXG4gICAgICAgIHZhciBleGl0ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcInNwYW5cIik7XHJcbiAgICAgICAgZXhpdC50ZXh0Q29udGVudCA9IGBcXG5wcm9jZXNzIGV4aXRlZCB3aXRoIGNvZGUgJHtjb2RlfWA7XHJcbiAgICAgICAgZXhpdC5zdHlsZS5jb2xvciA9IGNvZGUgPT0gMCA/IFwiIzg4OFwiIDogXCIjQzQ0XCI7XHJcbiAgICAgICAgZUNvbi5pbnNlcnRCZWZvcmUoZXhpdCwgZUlucHV0KTtcclxuICAgICAgICBlQ29uLnJlbW92ZUNoaWxkKGVDdXJzb3IpO1xyXG4gICAgfVxyXG59XHJcbiIsImNvbnN0IFdBU01fUEFHRV9TSVpFID0gKDY0ICogMTAyNCk7IC8vIFdBU00gcGFnZXMgYXJlIDY0IEtpQlxyXG4vLyBSZWY6IGh0dHBzOi8vd2ViYXNzZW1ibHkuZ2l0aHViLmlvL3NwZWMvY29yZS9leGVjL3J1bnRpbWUuaHRtbCNtZW1vcnktaW5zdGFuY2VzXHJcbi8vIFJlZjogaHR0cHM6Ly9naXRodWIuY29tL1dlYkFzc2VtYmx5L3NwZWMvaXNzdWVzLzIwOFxyXG5cclxuZnVuY3Rpb24gZXhlY19iYXNlNjRfd2FzbSh3YXNtOiBzdHJpbmcpIHtcclxuICAgIHZhciBleHBvcnRzIDogRXhwb3J0cztcclxuICAgIHZhciBtZW1vcnkgOiBXZWJBc3NlbWJseS5NZW1vcnk7XHJcblxyXG4gICAgZnVuY3Rpb24gbWFpbigpIHtcclxuICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICAoZXhwb3J0cy5tYWluKSgpO1xyXG4gICAgICAgICAgICBpZiAodW53aW5kaW5nKSB7XHJcbiAgICAgICAgICAgICAgICB1bndpbmRpbmcgPSBmYWxzZTtcclxuICAgICAgICAgICAgICAgIGV4cG9ydHMuYXN5bmNpZnlfc3RvcF91bndpbmQoKTtcclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIHByb2NfZXhpdCgwKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0gY2F0Y2ggKGUpIHtcclxuICAgICAgICAgICAgaWYgKGUgIT09IFwiZXhpdFwiKSB7XHJcbiAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKGUpO1xyXG4gICAgICAgICAgICAgICAgZGVidWdnZXI7XHJcbiAgICAgICAgICAgICAgICB0aHJvdyBlO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGNvbnN0IGFzeW5jaWZ5X3BhZ2VfY291bnQgOiBudW1iZXIgPSAxO1xyXG4gICAgY29uc3QgYXN5bmNpZnlfYnl0ZV9jb3VudCA6IG51bWJlciA9IGFzeW5jaWZ5X3BhZ2VfY291bnQgKiBXQVNNX1BBR0VfU0laRTtcclxuICAgIHZhciBhc3luY2lmeV9wYWdlX2lkeCA6IG51bWJlcjtcclxuICAgIHZhciBhc3luY2lmeV9ieXRlX2lkeCA6IG51bWJlcjtcclxuXHJcbiAgICB2YXIgcmV3aW5kaW5nICAgICAgICAgICAgICAgICAgID0gZmFsc2U7XHJcbiAgICB2YXIgdW53aW5kaW5nICAgICAgICAgICAgICAgICAgID0gZmFsc2U7XHJcbiAgICB2YXIgcmV3aW5kX3Jlc3VsdCA6IGFueSAgICAgICAgID0gdW5kZWZpbmVkO1xyXG4gICAgdmFyIHJld2luZF9leGNlcHRpb24gOiB1bmtub3duICA9IHVuZGVmaW5lZDtcclxuXHJcbiAgICAvLyBodHRwczovL2tyaXBrZW4uZ2l0aHViLmlvL2Jsb2cvd2FzbS8yMDE5LzA3LzE2L2FzeW5jaWZ5Lmh0bWxcclxuICAgIGZ1bmN0aW9uIGFzeW5jaWZ5PFI+KGY6ICgpID0+IFByb21pc2VMaWtlPFI+LCB3YWl0aW5nOiBSKTogUiB7XHJcbiAgICAgICAgaWYgKCFyZXdpbmRpbmcpIHtcclxuICAgICAgICAgICAgZigpLnRoZW4oXHJcbiAgICAgICAgICAgICAgICAocmVzdWx0KSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV3aW5kaW5nICAgICAgICAgICA9IHRydWU7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV3aW5kX3Jlc3VsdCAgICAgICA9IHJlc3VsdDtcclxuICAgICAgICAgICAgICAgICAgICByZXdpbmRfZXhjZXB0aW9uICAgID0gdW5kZWZpbmVkO1xyXG4gICAgICAgICAgICAgICAgICAgIC8vIHNob3VsZG4ndCBuZWVkIHRvIG1vZGlmeSBtZW1vcnkgLSBzaG91bGQndmUgYmVlbiBwb3B1bGF0ZWQgYnkgY29kZSBiZWZvcmUgYXN5bmNpZnlfc3RhcnRfdW53aW5kXHJcbiAgICAgICAgICAgICAgICAgICAgZXhwb3J0cy5hc3luY2lmeV9zdGFydF9yZXdpbmQoYXN5bmNpZnlfYnl0ZV9pZHgpO1xyXG4gICAgICAgICAgICAgICAgICAgIG1haW4oKTtcclxuICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICAoZXJyb3JfcmVhc29uKSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV3aW5kaW5nICAgICAgICAgICA9IHRydWU7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV3aW5kX3Jlc3VsdCAgICAgICA9IHVuZGVmaW5lZDtcclxuICAgICAgICAgICAgICAgICAgICByZXdpbmRfZXhjZXB0aW9uICAgID0gZXJyb3JfcmVhc29uID09PSB1bmRlZmluZWQgPyBcInVuZGVmaW5lZCByZWFzb25cIiA6IGVycm9yX3JlYXNvbjtcclxuICAgICAgICAgICAgICAgICAgICAvLyBzaG91bGRuJ3QgbmVlZCB0byBtb2RpZnkgbWVtb3J5IC0gc2hvdWxkJ3ZlIGJlZW4gcG9wdWxhdGVkIGJ5IGNvZGUgYmVmb3JlIGFzeW5jaWZ5X3N0YXJ0X3Vud2luZFxyXG4gICAgICAgICAgICAgICAgICAgIGV4cG9ydHMuYXN5bmNpZnlfc3RhcnRfcmV3aW5kKGFzeW5jaWZ5X2J5dGVfaWR4KTtcclxuICAgICAgICAgICAgICAgICAgICBtYWluKCk7XHJcbiAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICApO1xyXG5cclxuICAgICAgICAgICAgdW53aW5kaW5nID0gdHJ1ZTtcclxuICAgICAgICAgICAgY29uc3QgY3R4ID0gbmV3IFVpbnQzMkFycmF5KG1lbW9yeS5idWZmZXIsIGFzeW5jaWZ5X2J5dGVfaWR4LCA4KTtcclxuICAgICAgICAgICAgY3R4WzBdID0gYXN5bmNpZnlfYnl0ZV9pZHggKyA4O1xyXG4gICAgICAgICAgICBjdHhbMV0gPSBhc3luY2lmeV9ieXRlX2lkeCArIGFzeW5jaWZ5X2J5dGVfY291bnQ7XHJcbiAgICAgICAgICAgIGV4cG9ydHMuYXN5bmNpZnlfc3RhcnRfdW53aW5kKGFzeW5jaWZ5X2J5dGVfaWR4KTtcclxuXHJcbiAgICAgICAgICAgIHJldHVybiB3YWl0aW5nO1xyXG4gICAgICAgIH0gZWxzZSB7IC8vIHJld2luZGluZ1xyXG4gICAgICAgICAgICByZXdpbmRpbmcgPSBmYWxzZTtcclxuICAgICAgICAgICAgZXhwb3J0cy5hc3luY2lmeV9zdG9wX3Jld2luZCgpO1xyXG4gICAgICAgICAgICBpZiAocmV3aW5kX2V4Y2VwdGlvbiAhPT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgICAgICAgICB0aHJvdyByZXdpbmRfZXhjZXB0aW9uO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHJldHVybiByZXdpbmRfcmVzdWx0O1xyXG4gICAgICAgIH07XHJcbiAgICB9XHJcblxyXG4gICAgdHlwZSBGZCAgICAgPSBudW1iZXIgJiB7IF9ub3RfcmVhbDogXCJmZFwiOyB9XHJcbiAgICB0eXBlIEVycm5vICA9IG51bWJlciAmIHsgX25vdF9yZWFsOiBcImVycm5vXCI7IH1cclxuICAgIHR5cGUgcHRyICAgID0gbnVtYmVyICYgeyBfbm90X3JlYWw6IFwicHRyXCI7IH1cclxuICAgIHR5cGUgdTggICAgID0gbnVtYmVyICYgeyBfbm90X3JlYWw6IFwidThcIjsgfVxyXG4gICAgdHlwZSB1MTYgICAgPSBudW1iZXIgJiB7IF9ub3RfcmVhbDogXCJ1MTZcIjsgfVxyXG4gICAgdHlwZSB1MzIgICAgPSBudW1iZXIgJiB7IF9ub3RfcmVhbDogXCJ1MzJcIjsgfVxyXG4gICAgdHlwZSB1NjQgICAgPSBudW1iZXIgJiB7IF9ub3RfcmVhbDogXCJ1NjRcIjsgfSAvLyBYWFg6IG51bWJlciBvbmx5IGhhcyA1MiBiaXRzIG9mIHByZWNpc2lvblxyXG4gICAgdHlwZSB1c2l6ZSAgPSBudW1iZXIgJiB7IF9ub3RfcmVhbDogXCJ1c2l6ZVwiOyB9XHJcblxyXG4gICAgLy8gUmVmZXJlbmNlczpcclxuICAgIC8vIGh0dHBzOi8vZG9jcy5ycy93YXNpLXR5cGVzLzAuMS41L3NyYy93YXNpX3R5cGVzL2xpYi5ycy5odG1sXHJcbiAgICAvLyBodHRwczovL2RvY3MucnMvd2FzaS8wLjEwLjIrd2FzaS1zbmFwc2hvdC1wcmV2aWV3MS9zcmMvd2FzaS9saWJfZ2VuZXJhdGVkLnJzLmh0bWxcclxuICAgIC8vIGh0dHBzOi8vZ2l0aHViLmNvbS9XZWJBc3NlbWJseS9XQVNJL2Jsb2IvbWFpbi9waGFzZXMvc25hcHNob3QvZG9jcy5tZFxyXG5cclxuICAgIC8vIGh0dHBzOi8vZG9jcy5ycy93YXNpLzAuMTAuMit3YXNpLXNuYXBzaG90LXByZXZpZXcxL3NyYy93YXNpL2xpYl9nZW5lcmF0ZWQucnMuaHRtbCMyN1xyXG4gICAgY29uc3QgRVJSTk9fU1VDQ0VTUyAgICAgPSA8RXJybm8+MDtcclxuICAgIGNvbnN0IEVSUk5PXzJCSUcgICAgICAgID0gPEVycm5vPjE7XHJcbiAgICBjb25zdCBFUlJOT19BR0FJTiAgICAgICA9IDxFcnJubz42O1xyXG4gICAgY29uc3QgRVJSTk9fQkFERiAgICAgICAgPSA8RXJybm8+ODtcclxuICAgIGNvbnN0IEVSUk5PX05PVENBUEFCTEUgID0gPEVycm5vPjc2O1xyXG5cclxuICAgIGNvbnN0IEVSUk5PX0FTWU5DSUZZICAgID0gPEVycm5vPjkwMDE7IC8vIFhYWD9cclxuXHJcbiAgICBmdW5jdGlvbiByZWFkX3U4KCAgIHB0cjogcHRyLCBvZmZzZXQ6IG51bWJlcik6IHU4ICAgICAgIHsgcmV0dXJuIG5ldyBEYXRhVmlldyhtZW1vcnkuYnVmZmVyKS5nZXRVaW50OCggcHRyICsgb2Zmc2V0ICAgICAgKSBhcyB1ODsgfVxyXG4gICAgZnVuY3Rpb24gcmVhZF91MTYoICBwdHI6IHB0ciwgb2Zmc2V0OiBudW1iZXIpOiB1MTYgICAgICB7IHJldHVybiBuZXcgRGF0YVZpZXcobWVtb3J5LmJ1ZmZlcikuZ2V0VWludDE2KHB0ciArIG9mZnNldCwgdHJ1ZSkgYXMgdTE2OyB9XHJcbiAgICBmdW5jdGlvbiByZWFkX3UzMiggIHB0cjogcHRyLCBvZmZzZXQ6IG51bWJlcik6IHUzMiAgICAgIHsgcmV0dXJuIG5ldyBEYXRhVmlldyhtZW1vcnkuYnVmZmVyKS5nZXRVaW50MzIocHRyICsgb2Zmc2V0LCB0cnVlKSBhcyB1MzI7IH1cclxuICAgIGZ1bmN0aW9uIHJlYWRfdXNpemUocHRyOiBwdHIsIG9mZnNldDogbnVtYmVyKTogdXNpemUgICAgeyByZXR1cm4gcmVhZF91MzIoICBwdHIsIG9mZnNldCkgYXMgYW55OyB9XHJcbiAgICBmdW5jdGlvbiByZWFkX3B0ciggIHB0cjogcHRyLCBvZmZzZXQ6IG51bWJlcik6IHB0ciAgICAgIHsgcmV0dXJuIHJlYWRfdXNpemUocHRyLCBvZmZzZXQpIGFzIGFueTsgfVxyXG5cclxuICAgIC8vIFhYWDogYG51bWJlcmAgb25seSBndWFyYW50ZWVzIDUyLWJpdCBwcmVjaXNpb24sIHNvIHRoaXMgaXMgcHJldHR5IGJvZ3VzXHJcbiAgICBmdW5jdGlvbiByZWFkX3U2NF9hcHByb3goICBwdHI6IHB0ciwgb2Zmc2V0OiBudW1iZXIpOiB1NjQge1xyXG4gICAgICAgIGxldCBkdiA9IG5ldyBEYXRhVmlldyhtZW1vcnkuYnVmZmVyKTtcclxuICAgICAgICBsZXQgbG8gPSBkdi5nZXRVaW50MzIocHRyICsgb2Zmc2V0ICsgMCwgdHJ1ZSk7XHJcbiAgICAgICAgbGV0IGhpID0gZHYuZ2V0VWludDMyKHB0ciArIG9mZnNldCArIDQsIHRydWUpO1xyXG4gICAgICAgIHJldHVybiAoaGkgKiAweDEwMDAwMDAwMCArIGxvKSBhcyB1NjQ7XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gcmVhZF91NjRfcGFpciggIHB0cjogcHRyLCBvZmZzZXQ6IG51bWJlcik6IFt1MzIsIHUzMl0ge1xyXG4gICAgICAgIGxldCBkdiA9IG5ldyBEYXRhVmlldyhtZW1vcnkuYnVmZmVyKTtcclxuICAgICAgICBsZXQgbG8gPSBkdi5nZXRVaW50MzIocHRyICsgb2Zmc2V0ICsgMCwgdHJ1ZSkgYXMgdTMyO1xyXG4gICAgICAgIGxldCBoaSA9IGR2LmdldFVpbnQzMihwdHIgKyBvZmZzZXQgKyA0LCB0cnVlKSBhcyB1MzI7XHJcbiAgICAgICAgcmV0dXJuIFtsbywgaGldO1xyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIHdyaXRlX3U4KCAgICAgIHB0cjogcHRyLCBvZmZzZXQ6IG51bWJlciwgdmFsdWU6IHU4ICAgICApIHsgbmV3IERhdGFWaWV3KG1lbW9yeS5idWZmZXIpLnNldFVpbnQ4KCBwdHIgKyBvZmZzZXQsIHZhbHVlICAgICAgKTsgfVxyXG4gICAgZnVuY3Rpb24gd3JpdGVfdTE2KCAgICAgcHRyOiBwdHIsIG9mZnNldDogbnVtYmVyLCB2YWx1ZTogdTE2ICAgICkgeyBuZXcgRGF0YVZpZXcobWVtb3J5LmJ1ZmZlcikuc2V0VWludDE2KHB0ciArIG9mZnNldCwgdmFsdWUsIHRydWUpOyB9XHJcbiAgICBmdW5jdGlvbiB3cml0ZV91MzIoICAgICBwdHI6IHB0ciwgb2Zmc2V0OiBudW1iZXIsIHZhbHVlOiB1MzIgICAgKSB7IG5ldyBEYXRhVmlldyhtZW1vcnkuYnVmZmVyKS5zZXRVaW50MzIocHRyICsgb2Zmc2V0LCB2YWx1ZSwgdHJ1ZSk7IH1cclxuICAgIGZ1bmN0aW9uIHdyaXRlX3VzaXplKCAgIHB0cjogcHRyLCBvZmZzZXQ6IG51bWJlciwgdmFsdWU6IHVzaXplICApIHsgd3JpdGVfdTMyKCAgcHRyLCBvZmZzZXQsIHZhbHVlIGFzIGFueSk7IH1cclxuICAgIGZ1bmN0aW9uIHdyaXRlX3B0ciggICAgIHB0cjogcHRyLCBvZmZzZXQ6IG51bWJlciwgdmFsdWU6IHB0ciAgICApIHsgd3JpdGVfdXNpemUocHRyLCBvZmZzZXQsIHZhbHVlIGFzIGFueSk7IH1cclxuICAgIGZ1bmN0aW9uIHdyaXRlX3U2NF9wYWlyKHB0cjogcHRyLCBvZmZzZXQ6IG51bWJlciwgW2xvLCBoaV06IFt1MzIsIHUzMl0pIHtcclxuICAgICAgICB3cml0ZV91MzIocHRyLCBvZmZzZXQrMCwgbG8pO1xyXG4gICAgICAgIHdyaXRlX3UzMihwdHIsIG9mZnNldCs0LCBoaSk7XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gc2xpY2UocHRyOiBwdHIsIHN0YXJ0OiB1c2l6ZSwgZW5kOiB1c2l6ZSk6IERhdGFWaWV3IHsgcmV0dXJuIG5ldyBEYXRhVmlldyhtZW1vcnkuYnVmZmVyLCBwdHIrc3RhcnQsIGVuZC1zdGFydCk7IH1cclxuICAgIGZ1bmN0aW9uIHNsaWNlOChwdHI6IHB0ciwgc3RhcnQ6IHVzaXplLCBlbmQ6IHVzaXplKTogVWludDhBcnJheSB7IHJldHVybiBuZXcgVWludDhBcnJheShtZW1vcnkuYnVmZmVyLCBwdHIrc3RhcnQsIGVuZC1zdGFydCk7IH1cclxuXHJcbiAgICBmdW5jdGlvbiBzbGVlcF9tcyhtczogbnVtYmVyKTogUHJvbWlzZTx2b2lkPiB7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKHJlc29sdmUgPT4gc2V0VGltZW91dCgoKSA9PiByZXNvbHZlKCksIG1zKSk7XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gc2xlZXBfbnMobnM6IG51bWJlcik6IFByb21pc2U8dm9pZD4ge1xyXG4gICAgICAgIHJldHVybiBzbGVlcF9tcyhucyAvIDEwMDAgLyAxMDAwKTtcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBueWkoKTogRXJybm8ge1xyXG4gICAgICAgIGRlYnVnZ2VyO1xyXG4gICAgICAgIHJldHVybiBFUlJOT19OT1RDQVBBQkxFO1xyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIGFyZ3NfZ2V0ICAgICAgICAgICAgICAgICAgICgpOiBFcnJubyB7IHJldHVybiBueWkoKTsgfVxyXG4gICAgZnVuY3Rpb24gYXJnc19zaXplc19nZXQgICAgICAgICAgICAgKCk6IEVycm5vIHsgcmV0dXJuIG55aSgpOyB9XHJcbiAgICBmdW5jdGlvbiBlbnZpcm9uX2dldCAgICAgICAgICAgICAgICAoKTogRXJybm8geyByZXR1cm4gbnlpKCk7IH1cclxuICAgIGZ1bmN0aW9uIGVudmlyb25fc2l6ZXNfZ2V0ICAgICAgICAgICgpOiBFcnJubyB7IHJldHVybiBueWkoKTsgfVxyXG4gICAgZnVuY3Rpb24gY2xvY2tfcmVzX2dldCAgICAgICAgICAgICAgKCk6IEVycm5vIHsgcmV0dXJuIG55aSgpOyB9XHJcbiAgICBmdW5jdGlvbiBjbG9ja190aW1lX2dldCAgICAgICAgICAgICAoKTogRXJybm8geyByZXR1cm4gbnlpKCk7IH1cclxuICAgIGZ1bmN0aW9uIGZkX2FkdmlzZSAgICAgICAgICAgICAgICAgICgpOiBFcnJubyB7IHJldHVybiBueWkoKTsgfVxyXG4gICAgZnVuY3Rpb24gZmRfYWxsb2NhdGUgICAgICAgICAgICAgICAgKCk6IEVycm5vIHsgcmV0dXJuIG55aSgpOyB9XHJcbiAgICBmdW5jdGlvbiBmZF9jbG9zZSAgICAgICAgICAgICAgICAgICAoKTogRXJybm8geyByZXR1cm4gbnlpKCk7IH1cclxuICAgIGZ1bmN0aW9uIGZkX2RhdGFzeW5jICAgICAgICAgICAgICAgICgpOiBFcnJubyB7IHJldHVybiBueWkoKTsgfVxyXG4gICAgZnVuY3Rpb24gZmRfZmRzdGF0X2dldCAgICAgICAgICAgICAgKCk6IEVycm5vIHsgcmV0dXJuIG55aSgpOyB9XHJcbiAgICBmdW5jdGlvbiBmZF9mZHN0YXRfc2V0X2ZsYWdzICAgICAgICAoKTogRXJybm8geyByZXR1cm4gbnlpKCk7IH1cclxuICAgIGZ1bmN0aW9uIGZkX2Zkc3RhdF9zZXRfcmlnaHRzICAgICAgICgpOiBFcnJubyB7IHJldHVybiBueWkoKTsgfVxyXG4gICAgZnVuY3Rpb24gZmRfZmlsZXN0YXRfZ2V0ICAgICAgICAgICAgKCk6IEVycm5vIHsgcmV0dXJuIG55aSgpOyB9XHJcbiAgICBmdW5jdGlvbiBmZF9maWxlc3RhdF9zZXRfc2l6ZSAgICAgICAoKTogRXJybm8geyByZXR1cm4gbnlpKCk7IH1cclxuICAgIGZ1bmN0aW9uIGZkX2ZpbGVzdGF0X3NldF90aW1lcyAgICAgICgpOiBFcnJubyB7IHJldHVybiBueWkoKTsgfVxyXG4gICAgZnVuY3Rpb24gZmRfcHJlYWQgICAgICAgICAgICAgICAgICAgKCk6IEVycm5vIHsgcmV0dXJuIG55aSgpOyB9XHJcbiAgICBmdW5jdGlvbiBmZF9wcmVzdGF0X2dldCAgICAgICAgICAgICAoKTogRXJybm8geyByZXR1cm4gbnlpKCk7IH1cclxuICAgIGZ1bmN0aW9uIGZkX3ByZXN0YXRfZGlyX25hbWUgICAgICAgICgpOiBFcnJubyB7IHJldHVybiBueWkoKTsgfVxyXG4gICAgZnVuY3Rpb24gZmRfcHdyaXRlICAgICAgICAgICAgICAgICAgKCk6IEVycm5vIHsgcmV0dXJuIG55aSgpOyB9XHJcblxyXG4gICAgZnVuY3Rpb24gZmRfcmVhZChmZDogRmQsIGlvdmVjX2FycmF5X3B0cjogcHRyLCBpb3ZlY19hcnJheV9sZW46IHVzaXplLCBucmVhZF9wdHI6IHB0cik6IEVycm5vIHsgcmV0dXJuIGFzeW5jaWZ5KGFzeW5jICgpID0+IHtcclxuICAgICAgICAvLyBodHRwczovL2RvY3MucnMvd2FzaS8wLjEwLjIrd2FzaS1zbmFwc2hvdC1wcmV2aWV3MS9zcmMvd2FzaS9saWJfZ2VuZXJhdGVkLnJzLmh0bWwjMTc1NFxyXG5cclxuICAgICAgICB2YXIgbnJlYWQgPSAwO1xyXG4gICAgICAgIHZhciBlcnJubyA9IEVSUk5PX1NVQ0NFU1M7XHJcblxyXG4gICAgICAgIGZvciAodmFyIGlvdmVjX2lkeCA9IDA7IGlvdmVjX2lkeCA8IGlvdmVjX2FycmF5X2xlbjsgKytpb3ZlY19pZHgpIHtcclxuICAgICAgICAgICAgdmFyIGJ1Zl9wdHIgPSByZWFkX3B0cihpb3ZlY19hcnJheV9wdHIsIDggKiBpb3ZlY19pZHggKyAwKTtcclxuICAgICAgICAgICAgdmFyIGJ1Zl9sZW4gPSByZWFkX3VzaXplKGlvdmVjX2FycmF5X3B0ciwgOCAqIGlvdmVjX2lkeCArIDQpO1xyXG4gICAgICAgICAgICBpZiAoYnVmX2xlbiA8PSAwKSB7IGNvbnRpbnVlOyB9XHJcblxyXG4gICAgICAgICAgICBzd2l0Y2ggKGZkKSB7XHJcbiAgICAgICAgICAgICAgICBjYXNlIDA6IC8vIHN0ZGluXHJcbiAgICAgICAgICAgICAgICAgICAgdmFyIHJlYWQgPSBhd2FpdCBzdGRpbi5yZWFkKGJ1Zl9sZW4pO1xyXG4gICAgICAgICAgICAgICAgICAgIGZvciAodmFyIGk9MDsgaTxyZWFkLmxlbmd0aDsgKytpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBiID0gcmVhZFtpXSBhcyB1ODtcclxuICAgICAgICAgICAgICAgICAgICAgICAgd3JpdGVfdTgoYnVmX3B0ciwgaSwgYik7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIG5yZWFkICs9IHJlYWQubGVuZ3RoO1xyXG4gICAgICAgICAgICAgICAgICAgIGlmIChyZWFkLmxlbmd0aCA8IGJ1Zl9sZW4pIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgd3JpdGVfdXNpemUobnJlYWRfcHRyLCAwLCBucmVhZCBhcyB1c2l6ZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBlcnJubztcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICBkZWZhdWx0OlxyXG4gICAgICAgICAgICAgICAgICAgIGVycm5vID0gRVJSTk9fQkFERjtcclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgd3JpdGVfdXNpemUobnJlYWRfcHRyLCAwLCBucmVhZCBhcyB1c2l6ZSk7XHJcbiAgICAgICAgcmV0dXJuIGVycm5vO1xyXG4gICAgfSwgRVJSTk9fQVNZTkNJRlkpfVxyXG5cclxuICAgIGZ1bmN0aW9uIGZkX3JlYWRkaXIgICAgICAgICAgICAgICAgICgpOiBFcnJubyB7IHJldHVybiBueWkoKTsgfVxyXG4gICAgZnVuY3Rpb24gZmRfcmVudW1iZXIgICAgICAgICAgICAgICAgKCk6IEVycm5vIHsgcmV0dXJuIG55aSgpOyB9XHJcbiAgICBmdW5jdGlvbiBmZF9zZWVrICAgICAgICAgICAgICAgICAgICAoKTogRXJybm8geyByZXR1cm4gbnlpKCk7IH1cclxuICAgIGZ1bmN0aW9uIGZkX3N5bmMgICAgICAgICAgICAgICAgICAgICgpOiBFcnJubyB7IHJldHVybiBueWkoKTsgfVxyXG4gICAgZnVuY3Rpb24gZmRfdGVsbCAgICAgICAgICAgICAgICAgICAgKCk6IEVycm5vIHsgcmV0dXJuIG55aSgpOyB9XHJcblxyXG4gICAgZnVuY3Rpb24gZmRfd3JpdGUoZmQ6IEZkLCBjaW92ZWNfYXJyYXlfcHRyOiBwdHIsIGNpb3ZlY19hcnJheV9sZW46IHVzaXplLCBud3JpdHRlbl9wdHI6IHB0cik6IEVycm5vIHtcclxuICAgICAgICAvLyBodHRwczovL2RvY3MucnMvd2FzaS8wLjEwLjIrd2FzaS1zbmFwc2hvdC1wcmV2aWV3MS9zcmMvd2FzaS9saWJfZ2VuZXJhdGVkLnJzLmh0bWwjMTc5NlxyXG4gICAgICAgIC8vIGh0dHBzOi8vbm9kZWpzLm9yZy9hcGkvd2FzaS5odG1sXHJcblxyXG4gICAgICAgIHZhciBud3JpdHRlbiA9IDA7XHJcbiAgICAgICAgdmFyIGVycm5vID0gRVJSTk9fU1VDQ0VTUztcclxuXHJcbiAgICAgICAgdmFyIHRleHQgPSBcIlwiO1xyXG4gICAgICAgIGZvciAodmFyIGNpb3ZlY19pZHggPSAwOyBjaW92ZWNfaWR4IDwgY2lvdmVjX2FycmF5X2xlbjsgKytjaW92ZWNfaWR4KSB7XHJcbiAgICAgICAgICAgIHZhciBidWZfcHRyID0gcmVhZF9wdHIoY2lvdmVjX2FycmF5X3B0ciwgOCAqIGNpb3ZlY19pZHggKyAwKTtcclxuICAgICAgICAgICAgdmFyIGJ1Zl9sZW4gPSByZWFkX3VzaXplKGNpb3ZlY19hcnJheV9wdHIsIDggKiBjaW92ZWNfaWR4ICsgNCk7XHJcblxyXG4gICAgICAgICAgICBzd2l0Y2ggKGZkKSB7XHJcbiAgICAgICAgICAgICAgICBjYXNlIDE6IC8vIHN0ZG91dFxyXG4gICAgICAgICAgICAgICAgY2FzZSAyOiAvLyBzdGRlcnJcclxuICAgICAgICAgICAgICAgICAgICB0ZXh0ICs9IG5ldyBUZXh0RGVjb2RlcigpLmRlY29kZShzbGljZShidWZfcHRyLCAwIGFzIHVzaXplLCBidWZfbGVuKSk7XHJcbiAgICAgICAgICAgICAgICAgICAgbndyaXR0ZW4gKz0gYnVmX2xlbjtcclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgIGRlZmF1bHQ6XHJcbiAgICAgICAgICAgICAgICAgICAgZXJybm8gPSBFUlJOT19CQURGO1xyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBjb24ud3JpdGUodGV4dCk7XHJcblxyXG4gICAgICAgIHdyaXRlX3VzaXplKG53cml0dGVuX3B0ciwgMCwgbndyaXR0ZW4gYXMgdXNpemUpO1xyXG4gICAgICAgIHJldHVybiBlcnJubztcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBwYXRoX2NyZWF0ZV9kaXJlY3RvcnkgICAgICAoKTogRXJybm8geyByZXR1cm4gbnlpKCk7IH1cclxuICAgIGZ1bmN0aW9uIHBhdGhfZmlsZXN0YXRzX2dldCAgICAgICAgICgpOiBFcnJubyB7IHJldHVybiBueWkoKTsgfVxyXG4gICAgZnVuY3Rpb24gcGF0aF9maWxlc3RhdF9zZXRfdGltZXMgICAgKCk6IEVycm5vIHsgcmV0dXJuIG55aSgpOyB9XHJcbiAgICBmdW5jdGlvbiBwYXRoX2xpbmsgICAgICAgICAgICAgICAgICAoKTogRXJybm8geyByZXR1cm4gbnlpKCk7IH1cclxuICAgIGZ1bmN0aW9uIHBhdGhfb3BlbiAgICAgICAgICAgICAgICAgICgpOiBFcnJubyB7IHJldHVybiBueWkoKTsgfVxyXG4gICAgZnVuY3Rpb24gcGF0aF9yZWFkbGluayAgICAgICAgICAgICAgKCk6IEVycm5vIHsgcmV0dXJuIG55aSgpOyB9XHJcbiAgICBmdW5jdGlvbiBwYXRoX3JlbW92ZV9kaXJlY3RvcnkgICAgICAoKTogRXJybm8geyByZXR1cm4gbnlpKCk7IH1cclxuICAgIGZ1bmN0aW9uIHBhdGhfcmVuYW1lICAgICAgICAgICAgICAgICgpOiBFcnJubyB7IHJldHVybiBueWkoKTsgfVxyXG4gICAgZnVuY3Rpb24gcGF0aF9zeW1saW5rICAgICAgICAgICAgICAgKCk6IEVycm5vIHsgcmV0dXJuIG55aSgpOyB9XHJcbiAgICBmdW5jdGlvbiBwYXRoX3VubGlua19maWxlICAgICAgICAgICAoKTogRXJybm8geyByZXR1cm4gbnlpKCk7IH1cclxuXHJcbiAgICBmdW5jdGlvbiBwb2xsX29uZW9mZihpbl9zdWJzOiBwdHIsIG91dF9ldmVudHM6IHB0ciwgaW5fbnN1YnM6IHVzaXplLCBvdXRfbmV2ZW50c19wdHI6IHB0cik6IEVycm5vIHsgcmV0dXJuIGFzeW5jaWZ5KGFzeW5jICgpID0+IHtcclxuICAgICAgICAvLyBodHRwczovL2dpdGh1Yi5jb20vV2ViQXNzZW1ibHkvV0FTSS9ibG9iL21haW4vcGhhc2VzL3NuYXBzaG90L2RvY3MubWQjLXBvbGxfb25lb2ZmaW4tY29uc3Rwb2ludGVyc3Vic2NyaXB0aW9uLW91dC1wb2ludGVyZXZlbnQtbnN1YnNjcmlwdGlvbnMtc2l6ZS0tLWVycm5vLXNpemVcclxuICAgICAgICAvLyBodHRwczovL2RvY3MucnMvd2FzaS8wLjEwLjIrd2FzaS1zbmFwc2hvdC1wcmV2aWV3MS9zcmMvd2FzaS9saWJfZ2VuZXJhdGVkLnJzLmh0bWwjMTg5MlxyXG5cclxuICAgICAgICBsZXQgb3V0X25ldmVudHMgPSAwO1xyXG4gICAgICAgIHdyaXRlX3VzaXplKG91dF9uZXZlbnRzX3B0ciwgMCwgb3V0X25ldmVudHMgYXMgdXNpemUpO1xyXG5cclxuICAgICAgICBpZiAoaW5fbnN1YnMgPT0gMCkgeyByZXR1cm4gRVJSTk9fU1VDQ0VTUzsgfVxyXG4gICAgICAgIGlmIChpbl9uc3VicyA+IDEpIHsgbnlpKCk7IHJldHVybiBFUlJOT18yQklHOyB9XHJcblxyXG4gICAgICAgIGZvciAodmFyIHN1Yj0wOyBzdWI8aW5fbnN1YnM7ICsrc3ViKSB7XHJcbiAgICAgICAgICAgIGxldCBzdWJfYmFzZSA9IChpbl9zdWJzICsgNDggKiBzdWIpIGFzIHB0cjtcclxuXHJcbiAgICAgICAgICAgIGxldCB1c2VyZGF0YSAgICAgICAgPSByZWFkX3U2NF9wYWlyKHN1Yl9iYXNlLCAwKTtcclxuXHJcbiAgICAgICAgICAgIGxldCB1X3RhZyAgICAgICAgICAgPSByZWFkX3U4KCBzdWJfYmFzZSwgOCk7XHJcbiAgICAgICAgICAgIHR5cGUgRXZlbnR0eXBlID0gdTg7XHJcbiAgICAgICAgICAgIGNvbnN0IEVWRU5UVFlQRV9DTE9DSyAgICAgICA9IDxFdmVudHR5cGU+MDtcclxuICAgICAgICAgICAgY29uc3QgRVZFTlRUWVBFX0ZEX1JFQUQgICAgID0gPEV2ZW50dHlwZT4xO1xyXG4gICAgICAgICAgICBjb25zdCBFVkVOVFRZUEVfRkRfV1JJVEUgICAgPSA8RXZlbnR0eXBlPjI7XHJcbiAgICAgICAgICAgIGlmICh1X3RhZyAhPT0gRVZFTlRUWVBFX0NMT0NLKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gbnlpKCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgLy8gNyBieXRlcyBvZiBwYWRkaW5nXHJcblxyXG4gICAgICAgICAgICBsZXQgdV91X2Nsb2NrX2lkICAgID0gcmVhZF91MzIoc3ViX2Jhc2UsIDE2KTtcclxuICAgICAgICAgICAgdHlwZSBDbG9ja2lkID0gdTMyO1xyXG4gICAgICAgICAgICBjb25zdCBDTE9DS0lEX1JFQUxUSU1FICAgICAgICAgICAgICA9IDxDbG9ja2lkPjA7IC8vIFRoZSBjbG9jayBtZWFzdXJpbmcgcmVhbCB0aW1lLiBUaW1lIHZhbHVlIHplcm8gY29ycmVzcG9uZHMgd2l0aCAxOTcwLTAxLTAxVDAwOjAwOjAwWi5cclxuICAgICAgICAgICAgY29uc3QgQ0xPQ0tJRF9NT05PVE9OSUMgICAgICAgICAgICAgPSA8Q2xvY2tpZD4xOyAvLyBUaGUgc3RvcmUtd2lkZSBtb25vdG9uaWMgY2xvY2ssIHdoaWNoIGlzIGRlZmluZWQgYXMgYSBjbG9jayBtZWFzdXJpbmcgcmVhbCB0aW1lLCB3aG9zZSB2YWx1ZSBjYW5ub3QgYmUgYWRqdXN0ZWQgYW5kIHdoaWNoIGNhbm5vdCBoYXZlIG5lZ2F0aXZlIGNsb2NrIGp1bXBzLiBUaGUgZXBvY2ggb2YgdGhpcyBjbG9jayBpcyB1bmRlZmluZWQuIFRoZSBhYnNvbHV0ZSB0aW1lIHZhbHVlIG9mIHRoaXMgY2xvY2sgdGhlcmVmb3JlIGhhcyBubyBtZWFuaW5nLlxyXG4gICAgICAgICAgICBjb25zdCBDTE9DS0lEX1BST0NFU1NfQ1BVVElNRV9JRCAgICA9IDxDbG9ja2lkPjI7XHJcbiAgICAgICAgICAgIGNvbnN0IENMT0NLSURfVEhSRUFEX0NQVVRJTUVfSUQgICAgID0gPENsb2NraWQ+MztcclxuICAgICAgICAgICAgLy8gNCBieXRlcyBvZiBwYWRkaW5nXHJcblxyXG4gICAgICAgICAgICBsZXQgdV91X2Nsb2NrX3RpbWVvdXQgICA9IHJlYWRfdTY0X2FwcHJveChzdWJfYmFzZSwgMjQpO1xyXG4gICAgICAgICAgICBsZXQgdV91X2Nsb2NrX3ByZWNpc2lvbiA9IHJlYWRfdTY0X2FwcHJveChzdWJfYmFzZSwgMzIpO1xyXG5cclxuICAgICAgICAgICAgbGV0IHVfdV9jbG9ja19mbGFncyAgICAgPSByZWFkX3UxNihzdWJfYmFzZSwgNDApO1xyXG4gICAgICAgICAgICBjb25zdCBTVUJDTE9DS0ZMQUdTX1NVQlNDUklQVElPTl9DTE9DS19BQlNUSU1FICA9IDx1MTY+MHgxO1xyXG4gICAgICAgICAgICBjb25zb2xlLmFzc2VydCh1X3VfY2xvY2tfZmxhZ3MgPT09IDAsIFwidV91X2Nsb2NrX2ZsYWdzICE9PSAwIG5vdCB5ZXQgc3VwcG9ydGVkXCIpO1xyXG5cclxuICAgICAgICAgICAgbGV0IGFicyA9ICh1X3VfY2xvY2tfZmxhZ3MgJiBTVUJDTE9DS0ZMQUdTX1NVQlNDUklQVElPTl9DTE9DS19BQlNUSU1FKSAhPT0gMDtcclxuICAgICAgICAgICAgLy8gNiBieXRlcyBvZiBwYWRkaW5nXHJcblxyXG4gICAgICAgICAgICBpZiAoYWJzKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gbnlpKCk7XHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICBzd2l0Y2ggKHVfdV9jbG9ja19pZCkge1xyXG4gICAgICAgICAgICAgICAgICAgIGNhc2UgQ0xPQ0tJRF9SRUFMVElNRTpcclxuICAgICAgICAgICAgICAgICAgICBjYXNlIENMT0NLSURfTU9OT1RPTklDOlxyXG4gICAgICAgICAgICAgICAgICAgICAgICBhd2FpdCBzbGVlcF9ucyh1X3VfY2xvY2tfdGltZW91dCk7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBodHRwczovL2dpdGh1Yi5jb20vV2ViQXNzZW1ibHkvV0FTSS9ibG9iL21haW4vcGhhc2VzL3NuYXBzaG90L2RvY3MubWQjLWV2ZW50LXN0cnVjdFxyXG4gICAgICAgICAgICAgICAgICAgICAgICB3cml0ZV91NjRfcGFpciggb3V0X2V2ZW50cywgMzIgKiBvdXRfbmV2ZW50cyArICAwLCB1c2VyZGF0YSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHdyaXRlX3UzMiggICAgICBvdXRfZXZlbnRzLCAzMiAqIG91dF9uZXZlbnRzICsgIDgsIDAgYXMgdTMyKTsgLy8gZXJyb3JcclxuICAgICAgICAgICAgICAgICAgICAgICAgd3JpdGVfdTgoICAgICAgIG91dF9ldmVudHMsIDMyICogb3V0X25ldmVudHMgKyAxMCwgdV90YWcpOyAvLyB0eXBlXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIGZkX3JlYWR3cml0ZSBjYW4gYmUgc2tpcHBlZCBmb3IgY2xvY2tzXHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICBvdXRfbmV2ZW50cyArPSAxO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB3cml0ZV91c2l6ZShvdXRfbmV2ZW50c19wdHIsIDAsIG91dF9uZXZlbnRzIGFzIHVzaXplKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICAgICAgZGVmYXVsdDpcclxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIG55aSgpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB3cml0ZV91c2l6ZShvdXRfbmV2ZW50c19wdHIsIDAsIGluX25zdWJzKTtcclxuICAgICAgICByZXR1cm4gRVJSTk9fU1VDQ0VTUztcclxuICAgIH0sIEVSUk5PX0FTWU5DSUZZKX1cclxuXHJcbiAgICBmdW5jdGlvbiBwcm9jX2V4aXQoY29kZTogbnVtYmVyKTogbmV2ZXIge1xyXG4gICAgICAgIC8vIGh0dHBzOi8vZG9jcy5ycy93YXNpLzAuMTAuMit3YXNpLXNuYXBzaG90LXByZXZpZXcxL3NyYy93YXNpL2xpYl9nZW5lcmF0ZWQucnMuaHRtbCMxOTAxXHJcbiAgICAgICAgY29uLndyaXRlX3Byb2NfZXhpdChjb2RlKTtcclxuICAgICAgICB0aHJvdyBcImV4aXRcIjtcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBwcm9jX3JhaXNlICAgICAgICAgICAgICAgICAoKTogRXJybm8geyByZXR1cm4gbnlpKCk7IH1cclxuXHJcbiAgICBmdW5jdGlvbiBzY2hlZF95aWVsZCgpOiBFcnJubyB7IHJldHVybiBhc3luY2lmeShhc3luYyAoKSA9PiB7XHJcbiAgICAgICAgLy8gaHR0cHM6Ly9naXRodWIuY29tL1dlYkFzc2VtYmx5L1dBU0kvYmxvYi9tYWluL3BoYXNlcy9zbmFwc2hvdC9kb2NzLm1kIy1zY2hlZF95aWVsZC0tLWVycm5vXHJcbiAgICAgICAgLy8gaHR0cHM6Ly9kb2NzLnJzL3dhc2kvMC4xMC4yK3dhc2ktc25hcHNob3QtcHJldmlldzEvc3JjL3dhc2kvbGliX2dlbmVyYXRlZC5ycy5odG1sIzE5MDdcclxuICAgICAgICBhd2FpdCBzbGVlcF9tcygwKTtcclxuICAgICAgICByZXR1cm4gRVJSTk9fU1VDQ0VTUztcclxuICAgIH0sIEVSUk5PX0FTWU5DSUZZKX1cclxuXHJcbiAgICBmdW5jdGlvbiByYW5kb21fZ2V0KGJ1ZjogcHRyLCBsZW46IHVzaXplKTogRXJybm8ge1xyXG4gICAgICAgIC8vIGh0dHBzOi8vZ2l0aHViLmNvbS9XZWJBc3NlbWJseS9XQVNJL2Jsb2IvbWFpbi9waGFzZXMvc25hcHNob3QvZG9jcy5tZCMtcmFuZG9tX2dldGJ1Zi1wb2ludGVydTgtYnVmX2xlbi1zaXplLS0tZXJybm9cclxuICAgICAgICAvLyBodHRwczovL2RvY3MucnMvd2FzaS8wLjEwLjIrd2FzaS1zbmFwc2hvdC1wcmV2aWV3MS9zcmMvd2FzaS9saWJfZ2VuZXJhdGVkLnJzLmh0bWwjMTkxNFxyXG4gICAgICAgIGlmIChcImNyeXB0b1wiIGluIHNlbGYpIHtcclxuICAgICAgICAgICAgc2VsZi5jcnlwdG8uZ2V0UmFuZG9tVmFsdWVzKHNsaWNlOChidWYsIDAgYXMgdXNpemUsIGxlbikpO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIGZvciAodmFyIGk9MDsgaTxsZW47ICsraSkge1xyXG4gICAgICAgICAgICAgICAgd3JpdGVfdTgoYnVmLCBpLCAoMHhGRiAmIE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSoweDEwMCkpIGFzIHU4KTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gRVJSTk9fU1VDQ0VTUztcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBzb2NrX3JlY3YgICAgICAgICAgICAgICAgICAoKTogRXJybm8geyByZXR1cm4gbnlpKCk7IH1cclxuICAgIGZ1bmN0aW9uIHNvY2tfc2VuZCAgICAgICAgICAgICAgICAgICgpOiBFcnJubyB7IHJldHVybiBueWkoKTsgfVxyXG4gICAgZnVuY3Rpb24gc29ja19zaHV0ZG93biAgICAgICAgICAgICAgKCk6IEVycm5vIHsgcmV0dXJuIG55aSgpOyB9XHJcblxyXG4gICAgY29uc3QgaW1wb3J0cyA9IHtcclxuICAgICAgICB3YXNpX3NuYXBzaG90X3ByZXZpZXcxOiB7XHJcbiAgICAgICAgICAgIGFyZ3NfZ2V0LFxyXG4gICAgICAgICAgICBhcmdzX3NpemVzX2dldCxcclxuICAgICAgICAgICAgZW52aXJvbl9nZXQsXHJcbiAgICAgICAgICAgIGVudmlyb25fc2l6ZXNfZ2V0LFxyXG4gICAgICAgICAgICBjbG9ja19yZXNfZ2V0LFxyXG4gICAgICAgICAgICBjbG9ja190aW1lX2dldCxcclxuICAgICAgICAgICAgZmRfYWR2aXNlLFxyXG4gICAgICAgICAgICBmZF9hbGxvY2F0ZSxcclxuICAgICAgICAgICAgZmRfY2xvc2UsXHJcbiAgICAgICAgICAgIGZkX2RhdGFzeW5jLFxyXG4gICAgICAgICAgICBmZF9mZHN0YXRfZ2V0LFxyXG4gICAgICAgICAgICBmZF9mZHN0YXRfc2V0X2ZsYWdzLFxyXG4gICAgICAgICAgICBmZF9mZHN0YXRfc2V0X3JpZ2h0cyxcclxuICAgICAgICAgICAgZmRfZmlsZXN0YXRfZ2V0LFxyXG4gICAgICAgICAgICBmZF9maWxlc3RhdF9zZXRfc2l6ZSxcclxuICAgICAgICAgICAgZmRfZmlsZXN0YXRfc2V0X3RpbWVzLFxyXG4gICAgICAgICAgICBmZF9wcmVhZCxcclxuICAgICAgICAgICAgZmRfcHJlc3RhdF9nZXQsXHJcbiAgICAgICAgICAgIGZkX3ByZXN0YXRfZGlyX25hbWUsXHJcbiAgICAgICAgICAgIGZkX3B3cml0ZSxcclxuICAgICAgICAgICAgZmRfcmVhZCxcclxuICAgICAgICAgICAgZmRfcmVhZGRpcixcclxuICAgICAgICAgICAgZmRfcmVudW1iZXIsXHJcbiAgICAgICAgICAgIGZkX3NlZWssXHJcbiAgICAgICAgICAgIGZkX3N5bmMsXHJcbiAgICAgICAgICAgIGZkX3RlbGwsXHJcbiAgICAgICAgICAgIGZkX3dyaXRlLFxyXG4gICAgICAgICAgICBwYXRoX2NyZWF0ZV9kaXJlY3RvcnksXHJcbiAgICAgICAgICAgIHBhdGhfZmlsZXN0YXRzX2dldCxcclxuICAgICAgICAgICAgcGF0aF9maWxlc3RhdF9zZXRfdGltZXMsXHJcbiAgICAgICAgICAgIHBhdGhfbGluayxcclxuICAgICAgICAgICAgcGF0aF9vcGVuLFxyXG4gICAgICAgICAgICBwYXRoX3JlYWRsaW5rLFxyXG4gICAgICAgICAgICBwYXRoX3JlbW92ZV9kaXJlY3RvcnksXHJcbiAgICAgICAgICAgIHBhdGhfcmVuYW1lLFxyXG4gICAgICAgICAgICBwYXRoX3N5bWxpbmssXHJcbiAgICAgICAgICAgIHBhdGhfdW5saW5rX2ZpbGUsXHJcbiAgICAgICAgICAgIHBvbGxfb25lb2ZmLFxyXG4gICAgICAgICAgICBwcm9jX2V4aXQsXHJcbiAgICAgICAgICAgIHByb2NfcmFpc2UsXHJcbiAgICAgICAgICAgIHNjaGVkX3lpZWxkLFxyXG4gICAgICAgICAgICByYW5kb21fZ2V0LFxyXG4gICAgICAgICAgICBzb2NrX3JlY3YsXHJcbiAgICAgICAgICAgIHNvY2tfc2VuZCxcclxuICAgICAgICAgICAgc29ja19zaHV0ZG93bixcclxuICAgICAgICB9LFxyXG4gICAgfTtcclxuXHJcbiAgICBpbnRlcmZhY2UgRXhwb3J0cyB7XHJcbiAgICAgICAgbWVtb3J5OiAgICAgICAgICAgICAgICAgV2ViQXNzZW1ibHkuTWVtb3J5LFxyXG4gICAgICAgIG1haW46ICAgICAgICAgICAgICAgICAgICgpID0+IHZvaWQsIC8vIFhYWDogcmlnaHQgc2lnbmF0dXJlP1xyXG5cclxuICAgICAgICBhc3luY2lmeV9zdGFydF9yZXdpbmQ6ICAoYWRkcjogbnVtYmVyKSA9PiB2b2lkLFxyXG4gICAgICAgIGFzeW5jaWZ5X3N0YXJ0X3Vud2luZDogIChhZGRyOiBudW1iZXIpID0+IHZvaWQsXHJcbiAgICAgICAgYXN5bmNpZnlfc3RvcF9yZXdpbmQ6ICAgKCkgPT4gdm9pZCxcclxuICAgICAgICBhc3luY2lmeV9zdG9wX3Vud2luZDogICAoKSA9PiB2b2lkLFxyXG4gICAgfVxyXG5cclxuICAgIGNvbnN0IGJpbmFyeSA9IGF0b2Iod2FzbSk7XHJcbiAgICBjb25zdCB0eXBlZGFycmF5ID0gbmV3IFVpbnQ4QXJyYXkoYmluYXJ5Lmxlbmd0aCk7XHJcbiAgICBmb3IgKHZhciBpPTA7IGk8YmluYXJ5Lmxlbmd0aDsgKytpKSB7IHR5cGVkYXJyYXlbaV0gPSBiaW5hcnkuY2hhckNvZGVBdChpKTsgfVxyXG5cclxuICAgIFdlYkFzc2VtYmx5LmNvbXBpbGUodHlwZWRhcnJheSkudGhlbihmdW5jdGlvbiAobSkge1xyXG4gICAgICAgIGlmIChmYWxzZSkge1xyXG4gICAgICAgICAgICBXZWJBc3NlbWJseS5Nb2R1bGUuaW1wb3J0cyhtKS5mb3JFYWNoKGZ1bmN0aW9uIChpbXApIHtcclxuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiaW1wb3J0XCIsIGltcCk7XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICBXZWJBc3NlbWJseS5Nb2R1bGUuZXhwb3J0cyhtKS5mb3JFYWNoKGZ1bmN0aW9uIChleHApIHtcclxuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiZXhwb3J0XCIsIGV4cCk7XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gV2ViQXNzZW1ibHkuaW5zdGFudGlhdGUobSwgaW1wb3J0cyk7XHJcbiAgICB9KS50aGVuKGZ1bmN0aW9uIChtKSB7XHJcbiAgICAgICAgZXhwb3J0cyA9IDxFeHBvcnRzPjx1bmtub3duPm0uZXhwb3J0cztcclxuXHJcbiAgICAgICAgbWVtb3J5ID0gZXhwb3J0cy5tZW1vcnk7XHJcbiAgICAgICAgYXN5bmNpZnlfcGFnZV9pZHggPSBtZW1vcnkuZ3Jvdyhhc3luY2lmeV9wYWdlX2NvdW50KTtcclxuICAgICAgICBjb25zb2xlLmFzc2VydChhc3luY2lmeV9wYWdlX2lkeCAhPT0gLTEpO1xyXG4gICAgICAgIGFzeW5jaWZ5X2J5dGVfaWR4ID0gV0FTTV9QQUdFX1NJWkUgKiBhc3luY2lmeV9wYWdlX2lkeDtcclxuXHJcbiAgICAgICAgbWFpbigpO1xyXG4gICAgfSk7XHJcbn1cclxuIiwiZnVuY3Rpb24gbWFpbl9kb20oKSB7XHJcbiAgICB0eXBlIE1vZGUgPSBcInJhd1wiIHwgXCJsaW5lYnVmZmVyZWRcIjtcclxuICAgIGNvbnN0IG1vZGUgPSBmdW5jdGlvbigpOiBNb2RlIHsgcmV0dXJuIFwibGluZWJ1ZmZlcmVkXCI7IH0oKTtcclxuICAgIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoXCJrZXlwcmVzc1wiLCBmdW5jdGlvbihlKSB7XHJcbiAgICAgICAgdmFyIHRleHQgPSBlLmNoYXIgfHwgU3RyaW5nLmZyb21DaGFyQ29kZShlLmNoYXJDb2RlKTtcclxuICAgICAgICBpZiAodGV4dCA9PT0gXCJcXHJcIikgeyB0ZXh0ID0gXCJcXG5cIjsgfVxyXG4gICAgICAgIHN3aXRjaCAobW9kZSkge1xyXG4gICAgICAgICAgICBjYXNlIFwicmF3XCI6XHJcbiAgICAgICAgICAgICAgICBzd2l0Y2ggKHRleHQpIHtcclxuICAgICAgICAgICAgICAgICAgICBjYXNlIFwiXFxuXCI6XHJcbiAgICAgICAgICAgICAgICAgICAgY2FzZSBcIlxcclwiOlxyXG4gICAgICAgICAgICAgICAgICAgIGNhc2UgXCJcXHRcIjpcclxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gc2hvdWxkJ3ZlIGFscmVhZHkgYmVlbiBoYW5kbGVkIGJ5IGtleWRvd24gZXZlbnRcclxuICAgICAgICAgICAgICAgICAgICBkZWZhdWx0OlxyXG4gICAgICAgICAgICAgICAgICAgICAgICBzdGRpbi53cml0ZSh0ZXh0KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgY2FzZSBcImxpbmVidWZmZXJlZFwiOlxyXG4gICAgICAgICAgICAgICAgc3dpdGNoICh0ZXh0KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgY2FzZSBcIlxcblwiOlxyXG4gICAgICAgICAgICAgICAgICAgIGNhc2UgXCJcXHJcIjpcclxuICAgICAgICAgICAgICAgICAgICBjYXNlIFwiXFx0XCI6XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIHNob3VsZCd2ZSBhbHJlYWR5IGJlZW4gaGFuZGxlZCBieSBrZXlkb3duIGV2ZW50XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgICAgIGRlZmF1bHQ6XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbi5pbnB1dC50ZXh0Q29udGVudCArPSB0ZXh0O1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgIH1cclxuICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XHJcbiAgICAgICAgZS5zdG9wUHJvcGFnYXRpb24oKTtcclxuICAgIH0pO1xyXG4gICAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcihcImtleWRvd25cIiwgZnVuY3Rpb24oZSkge1xyXG4gICAgICAgIHZhciBrZXkgPSBcIlwiO1xyXG4gICAgICAgIGlmIChlLmN0cmxLZXkgICApIGtleSArPSBcIkN0cmwrXCI7XHJcbiAgICAgICAgaWYgKGUuYWx0S2V5ICAgICkga2V5ICs9IFwiQWx0K1wiO1xyXG4gICAgICAgIGlmIChlLnNoaWZ0S2V5ICApIGtleSArPSBcIlNoaWZ0K1wiO1xyXG4gICAgICAgIGtleSArPSAoZS5rZXkgfHwgZS5jb2RlKTtcclxuXHJcbiAgICAgICAgc3dpdGNoIChtb2RlKSB7XHJcbiAgICAgICAgICAgIGNhc2UgXCJyYXdcIjpcclxuICAgICAgICAgICAgICAgIHN3aXRjaCAoa2V5KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgY2FzZSBcIkJhY2tzcGFjZVwiOiAgIHN0ZGluLndyaXRlKFwiXFx4MDhcIik7ICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgICAgIGNhc2UgXCJFbnRlclwiOiAgICAgICBzdGRpbi53cml0ZShcIlxcblwiKTsgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgICAgICBjYXNlIFwiTnVtcGFkRW50ZXJcIjogc3RkaW4ud3JpdGUoXCJcXG5cIik7ICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICAgICAgY2FzZSBcIlRhYlwiOiAgICAgICAgIHN0ZGluLndyaXRlKFwiXFx0XCIpOyAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgICAgIGNhc2UgXCJFc2NcIjogICAgICAgICBzdGRpbi53cml0ZShcIlxceDFCXCIpOyAgICBicmVhaztcclxuICAgICAgICAgICAgICAgICAgICBjYXNlIFwiRXNjYXBlXCI6ICAgICAgc3RkaW4ud3JpdGUoXCJcXHgxQlwiKTsgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICAgICAgZGVmYXVsdDogICAgICAgICAgICByZXR1cm47IC8vIHByb2Nlc3Mgbm8gZnVydGhlclxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIGNhc2UgXCJsaW5lYnVmZmVyZWRcIjpcclxuICAgICAgICAgICAgICAgIHN3aXRjaCAoa2V5KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgY2FzZSBcIkJhY2tzcGFjZVwiOlxyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoISFjb24uaW5wdXQudGV4dENvbnRlbnQpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbi5pbnB1dC50ZXh0Q29udGVudCA9IGNvbi5pbnB1dC50ZXh0Q29udGVudC5zdWJzdHIoMCwgY29uLmlucHV0LnRleHRDb250ZW50Lmxlbmd0aC0xKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBlbHNlIFRPRE86IHNvbWUga2luZCBvZiBhbGVydD9cclxuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICAgICAgY2FzZSBcIkVudGVyXCI6XHJcbiAgICAgICAgICAgICAgICAgICAgY2FzZSBcIk51bXBhZEVudGVyXCI6XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBidWZmZXIgPSAoY29uLmlucHV0LnRleHRDb250ZW50IHx8IFwiXCIpICsgXCJcXG5cIjtcclxuICAgICAgICAgICAgICAgICAgICAgICAgY29uLmlucHV0LnRleHRDb250ZW50ID0gXCJcIjtcclxuICAgICAgICAgICAgICAgICAgICAgICAgc3RkaW4ud3JpdGUoYnVmZmVyKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICAgICAgY2FzZSBcIlRhYlwiOiAgICAgY29uLmlucHV0LnRleHRDb250ZW50ID0gKGNvbi5pbnB1dC50ZXh0Q29udGVudCB8fCBcIlwiKSArIFwiXFx0XCI7IGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgICAgIGNhc2UgXCJFc2NcIjogICAgIGNvbi5pbnB1dC50ZXh0Q29udGVudCA9IChjb24uaW5wdXQudGV4dENvbnRlbnQgfHwgXCJcIikgKyBcIlxceDFCXCI7IGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgICAgIGNhc2UgXCJFc2NhcGVcIjogIGNvbi5pbnB1dC50ZXh0Q29udGVudCA9IChjb24uaW5wdXQudGV4dENvbnRlbnQgfHwgXCJcIikgKyBcIlxceDFCXCI7IGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgICAgIGRlZmF1bHQ6ICAgICAgICByZXR1cm47IC8vIHByb2Nlc3Mgbm8gZnVydGhlclxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcclxuICAgICAgICBlLnN0b3BQcm9wYWdhdGlvbigpO1xyXG4gICAgfSk7XHJcblxyXG4gICAgZXhlY19iYXNlNjRfd2FzbShcIntCQVNFNjRfV0FTTTMyfVwiKTtcclxufVxyXG4iLCJuYW1lc3BhY2Ugc3RkaW4ge1xyXG4gICAgdmFyIGJ1ZiAgICAgICAgICAgOiBudW1iZXJbXSA9IFtdO1xyXG4gICAgdmFyIHBlbmRpbmdfaW8gICAgOiB7IG1heDogbnVtYmVyLCBjYWxsYmFjazogKChpbnB1dDogbnVtYmVyW10pID0+IHZvaWQpIH1bXSA9IFtdO1xyXG5cclxuICAgIGV4cG9ydCBmdW5jdGlvbiByZWFkKG1heDogbnVtYmVyKTogUHJvbWlzZTxudW1iZXJbXT4ge1xyXG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgoY2FsbGJhY2spID0+IHtcclxuICAgICAgICAgICAgcGVuZGluZ19pby5wdXNoKHttYXgsIGNhbGxiYWNrfSk7XHJcbiAgICAgICAgICAgIGRpc3BhdGNoKCk7XHJcbiAgICAgICAgfSk7XHJcbiAgICB9XHJcblxyXG4gICAgZXhwb3J0IGZ1bmN0aW9uIHdyaXRlKHRleHQ6IHN0cmluZykge1xyXG4gICAgICAgIGNvbi53cml0ZSh0ZXh0KTtcclxuICAgICAgICB2YXIgYnl0ZXMgPSBuZXcgVGV4dEVuY29kZXIoKS5lbmNvZGUodGV4dCk7XHJcbiAgICAgICAgZm9yICh2YXIgaT0wOyBpPGJ5dGVzLmxlbmd0aDsgKytpKSB7XHJcbiAgICAgICAgICAgIGJ1Zi5wdXNoKGJ5dGVzW2ldKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgZGlzcGF0Y2goKTtcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBkaXNwYXRjaCgpIHtcclxuICAgICAgICB3aGlsZSAoYnVmLmxlbmd0aCA+IDAgJiYgcGVuZGluZ19pby5sZW5ndGggPiAwKSB7XHJcbiAgICAgICAgICAgIGNvbnN0IGlvID0gcGVuZGluZ19pby5zaGlmdCgpO1xyXG4gICAgICAgICAgICBpZiAoaW8gPT09IHVuZGVmaW5lZCkgY29udGludWU7XHJcbiAgICAgICAgICAgIGNvbnN0IG5yZWFkID0gTWF0aC5taW4oYnVmLmxlbmd0aCwgaW8ubWF4KTtcclxuICAgICAgICAgICAgY29uc3QgcmVhZCA9IGJ1Zi5zbGljZSgwLCBucmVhZCk7XHJcbiAgICAgICAgICAgIGNvbnN0IGFmdGVyID0gYnVmLnNsaWNlKG5yZWFkKTtcclxuICAgICAgICAgICAgYnVmID0gYWZ0ZXI7XHJcbiAgICAgICAgICAgIChpby5jYWxsYmFjaykocmVhZCk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG59XHJcbiJdfQ==