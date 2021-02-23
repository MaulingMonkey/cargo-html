namespace wasi_snapshot_preview1 {
    /**
     * Provide `args_*` and `environ_*` syscalls.
     *
     * **NOTE:** Rust appears to currently use libc environ emulation and ignore `environ_*`.
     */
    export function env(memory: MemoryLE, args: string[], env: { [id: string]: string }) {
        const utf8              = new TextEncoder();
        const utf8_arg          = args.map(arg => utf8.encode(`${arg}\0`));
        const utf8_env          = Object.entries(env).map((key, val) => utf8.encode(`${key}=${val}\0`)); // XXX: is this correct? See https://github.com/WebAssembly/WASI/issues/396
        const utf8_arg_total    = utf8_arg.reduce((prev, s) => prev + s.length, 0);
        const utf8_env_total    = utf8_env.reduce((prev, s) => prev + s.length, 0);

        function args_get(argv: ptr, argv_buf: ptr): Errno {
            // https://docs.rs/wasi/0.10.2+wasi-snapshot-preview1/src/wasi/lib_generated.rs.html#1676
            let out = 0;
            utf8_arg.forEach((arg, arg_idx) => {
                memory.write_ptr(argv, +4*arg_idx, (argv_buf + out) as ptr);
                arg.forEach(byte => {
                    memory.write_u8(argv_buf, out, byte as u8);
                    out += 1;
                });
            });
            return ERRNO_SUCCESS;
        }

        function args_sizes_get(out_argc: ptr, out_argv_buf_size: ptr): Errno {
            // https://docs.rs/wasi/0.10.2+wasi-snapshot-preview1/src/wasi/lib_generated.rs.html#1678
            memory.write_usize(out_argc, +0,            utf8_arg.length as usize);
            memory.write_usize(out_argv_buf_size, +0,   utf8_arg_total  as usize);
            return ERRNO_SUCCESS;
        }

        function environ_get(environ: ptr, environ_buf: ptr): Errno {
            // https://docs.rs/wasi/0.10.2+wasi-snapshot-preview1/src/wasi/lib_generated.rs.html#1681
            let out = 0;
            utf8_env.forEach((env, env_idx) => {
                memory.write_ptr(environ, +4*env_idx, (environ_buf + out) as ptr);
                env.forEach(byte => {
                    memory.write_u8(environ_buf, out, byte as u8);
                    out += 1;
                });
            });
            return ERRNO_SUCCESS;
        }

        function environ_sizes_get(out_environc: ptr, out_environ_buf_size: ptr): Errno {
            // https://docs.rs/wasi/0.10.2+wasi-snapshot-preview1/src/wasi/lib_generated.rs.html#1683
            memory.write_usize(out_environc, +0,            utf8_env.length as usize);
            memory.write_usize(out_environ_buf_size, +0,    utf8_env_total  as usize);
            return ERRNO_SUCCESS;
        }

        return { args_get, args_sizes_get, environ_get, environ_sizes_get };
    }
}
