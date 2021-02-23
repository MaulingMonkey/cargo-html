const WASM_PAGE_SIZE = (64 * 1024); // WASM pages are 64 KiB
// Ref: https://webassembly.github.io/spec/core/exec/runtime.html#memory-instances
// Ref: https://github.com/WebAssembly/spec/issues/208

type Fd = u32 & { _not_real: "fd"; }

function exec_base64_wasm(wasm: string) {
    var exports : Exports;
    const memory : MemoryLE = new MemoryLE(<any>undefined);
    const asyncifier = new Asyncifier();

    // References:
    // https://docs.rs/wasi-types/0.1.5/src/wasi_types/lib.rs.html
    // https://docs.rs/wasi/0.10.2+wasi-snapshot-preview1/src/wasi/lib_generated.rs.html
    // https://github.com/WebAssembly/WASI/blob/main/phases/snapshot/docs.md

    function fd_read(fd: Fd, iovec_array_ptr: ptr, iovec_array_len: usize, nread_ptr: ptr): Errno { return asyncifier.asyncify(async () => {
        // https://docs.rs/wasi/0.10.2+wasi-snapshot-preview1/src/wasi/lib_generated.rs.html#1754

        var nread = 0;
        var errno = ERRNO_SUCCESS;

        for (var iovec_idx = 0; iovec_idx < iovec_array_len; ++iovec_idx) {
            var buf_ptr = memory.read_ptr(iovec_array_ptr, 8 * iovec_idx + 0);
            var buf_len = memory.read_usize(iovec_array_ptr, 8 * iovec_idx + 4);
            if (buf_len <= 0) { continue; }

            switch (fd) {
                case 0: // stdin
                    var read = await stdin.read(buf_len);
                    for (var i=0; i<read.length; ++i) {
                        var b = read[i] as u8;
                        memory.write_u8(buf_ptr, i, b);
                    }
                    nread += read.length;
                    if (read.length < buf_len) {
                        memory.write_usize(nread_ptr, 0, nread as usize);
                        return errno;
                    }
                    break;
                default:
                    errno = ERRNO_BADF;
                    break;
            }
        }

        memory.write_usize(nread_ptr, 0, nread as usize);
        return errno;
    }, ERRNO_ASYNCIFY)}

    function fd_write(fd: Fd, ciovec_array_ptr: ptr, ciovec_array_len: usize, nwritten_ptr: ptr): Errno {
        // https://docs.rs/wasi/0.10.2+wasi-snapshot-preview1/src/wasi/lib_generated.rs.html#1796
        // https://nodejs.org/api/wasi.html

        var nwritten = 0;
        var errno = ERRNO_SUCCESS;

        var text = "";
        for (var ciovec_idx = 0; ciovec_idx < ciovec_array_len; ++ciovec_idx) {
            var buf_ptr = memory.read_ptr(ciovec_array_ptr, 8 * ciovec_idx + 0);
            var buf_len = memory.read_usize(ciovec_array_ptr, 8 * ciovec_idx + 4);

            switch (fd) {
                case 1: // stdout
                case 2: // stderr
                    text += new TextDecoder().decode(memory.slice(buf_ptr, 0 as usize, buf_len));
                    nwritten += buf_len;
                    break;
                default:
                    errno = ERRNO_BADF;
                    break;
            }
        }

        con.write(text);

        memory.write_usize(nwritten_ptr, 0, nwritten as usize);
        return errno;
    }

    const imports = {
        wasi_snapshot_preview1: Object.assign(
            {},
            wasi_snapshot_preview1.nyi      (),
            wasi_snapshot_preview1.random   (memory, "insecure-nondeterministic"),
            wasi_snapshot_preview1.time     (memory, { sleep: asyncifier, clock: "nondeterministic" }),
            wasi_snapshot_preview1.signals  (memory, "enabled"),
            {
                fd_read,
                fd_write,
            }
        ),
    };

    const binary = atob(wasm);
    const typedarray = new Uint8Array(binary.length);
    for (var i=0; i<binary.length; ++i) { typedarray[i] = binary.charCodeAt(i); }

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
        exports = <Exports><unknown>m.exports;

        memory.memory = exports.memory;

        asyncifier.launch(exports);
    });
}
