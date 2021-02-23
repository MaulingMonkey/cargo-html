namespace wasi_snapshot_preview1 {
    /**
     * Provide input/output related syscall implementations.
     */
    export function io(memory: MemoryLE, asyncifier: Asyncifier, {}: {}) {
        const FDS : (Handle | HandleAsync | undefined)[] = [
            ConReader.try_create({ // stdin
                mode:       "linebuffered",
                listen_to:  document,
                input:      "cargo-html-console-input",
                echo:       con.write,
            }),
            new ConWriter(), // stdout
            new ConWriter(), // stderr
        ];

        function fd_read(fd: Fd, iovec_array_ptr: ptr, iovec_array_len: usize, nread_ptr: ptr): Errno { return asyncifier.asyncify(async () => {
            // https://docs.rs/wasi/0.10.2+wasi-snapshot-preview1/src/wasi/lib_generated.rs.html#1754
            // https://github.com/WebAssembly/WASI/blob/main/phases/snapshot/docs.md#fd_read

            const handle = FDS[fd];
            if (handle          === undefined) return ERRNO_BADF;   // handle does not exist
            if (handle.fd_read  === undefined) return ERRNO_ACCESS; // handle cannot be written to (ERRNO_IO? ERRNO_PIPE?)

            const iovec = new IovecArray(memory, iovec_array_ptr, iovec_array_len);
            var nwritten = 0;
            try {
                if (handle.async) {
                    nwritten = await handle.fd_read!(iovec);
                } else {
                    nwritten = handle.fd_read!(iovec);
                }
            } catch (errno) {
                if (typeof errno === "number") {
                    memory.write_usize(nread_ptr, 0, 0 as usize);
                    return errno as Errno;
                } else {
                    throw errno;
                }
            }
            memory.write_usize(nread_ptr, 0, nwritten as usize);
            return ERRNO_SUCCESS;
        }, ERRNO_ASYNCIFY)}

        function fd_write(fd: Fd, ciovec_array_ptr: ptr, ciovec_array_len: usize, nwritten_ptr: ptr): Errno { return asyncifier.asyncify(async () => {
            // https://docs.rs/wasi/0.10.2+wasi-snapshot-preview1/src/wasi/lib_generated.rs.html#1796
            // https://github.com/WebAssembly/WASI/blob/main/phases/snapshot/docs.md#fd_write
            // https://nodejs.org/api/wasi.html

            const handle = FDS[fd];
            if (handle          === undefined) return ERRNO_BADF;   // handle does not exist
            if (handle.fd_write === undefined) return ERRNO_ACCESS; // handle cannot be written to (ERRNO_IO? ERRNO_PIPE?)

            const ciovec = new IovecArray(memory, ciovec_array_ptr, ciovec_array_len);
            var nwritten = 0;
            try {
                if (handle.async) {
                    nwritten = await handle.fd_write!(ciovec);
                } else {
                    nwritten = handle.fd_write!(ciovec);
                }
            } catch (errno) {
                if (typeof errno === "number") {
                    memory.write_usize(nwritten_ptr, 0, 0 as usize);
                    return errno as Errno;
                } else {
                    throw errno;
                }
            }
            memory.write_usize(nwritten_ptr, 0, nwritten as usize);
            return ERRNO_SUCCESS;
        }, ERRNO_ASYNCIFY)}

        return { fd_read, fd_write };
    }
}
