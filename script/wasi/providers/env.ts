namespace wasi {
    /**
     * Provide `args_*` and `environ_*` syscalls.
     *
     * **NOTE:** Rust appears to currently use libc environ emulation and ignore `environ_*`.
     */
    export function env(i: Imports, memory: MemoryLE, args: string[], env: { [id: string]: string }) {
        const utf8              = new TextEncoder();
        const utf8_arg          = args.map(arg => utf8.encode(`${arg}\0`));
        const utf8_env          = Object.entries(env).map(([key, val]) => utf8.encode(`${key}=${val}\0`));
        const utf8_arg_total    = utf8_arg.reduce((prev, s) => prev + s.length, 0);
        const utf8_env_total    = utf8_env.reduce((prev, s) => prev + s.length, 0);

        i.wasi_snapshot_preview1.args_get = function args_get(argv: ptr, argv_buf: ptr): Errno {
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

        i.wasi_snapshot_preview1.args_sizes_get = function args_sizes_get(out_argc: ptr, out_argv_buf_size: ptr): Errno {
            memory.write_usize(out_argc, +0,            utf8_arg.length as usize);
            memory.write_usize(out_argv_buf_size, +0,   utf8_arg_total  as usize);
            return ERRNO_SUCCESS;
        }

        i.wasi_snapshot_preview1.environ_get = function environ_get(environ: ptr, environ_buf: ptr): Errno {
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

        i.wasi_snapshot_preview1.environ_sizes_get = function environ_sizes_get(out_environc: ptr, out_environ_buf_size: ptr): Errno {
            memory.write_usize(out_environc, +0,            utf8_env.length as usize);
            memory.write_usize(out_environ_buf_size, +0,    utf8_env_total  as usize);
            return ERRNO_SUCCESS;
        }
    }
}
