namespace wasi_snapshot_preview1 {
    /**
     * Provide input/output related syscall implementations.
     */
    export function io(memory: MemoryLE, asyncifier: Asyncifier, {}: {}) {
        function fd_read(fd: Fd, iovec_array_ptr: ptr, iovec_array_len: usize, nread_ptr: ptr): Errno { return asyncifier.asyncify(async () => {
            // https://docs.rs/wasi/0.10.2+wasi-snapshot-preview1/src/wasi/lib_generated.rs.html#1754
            // https://github.com/WebAssembly/WASI/blob/main/phases/snapshot/docs.md#fd_read

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
            // https://github.com/WebAssembly/WASI/blob/main/phases/snapshot/docs.md#fd_write
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

        return { fd_read, fd_write };
    }
}
