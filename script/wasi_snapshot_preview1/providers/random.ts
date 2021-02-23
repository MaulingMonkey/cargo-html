namespace wasi_snapshot_preview1 {
    export function random(memory: MemoryLE, style: "disabled" | "insecure-nondeterministic" | "nondeterministic") {
        // https://github.com/WebAssembly/WASI/blob/main/phases/snapshot/docs.md#-random_getbuf-pointeru8-buf_len-size---errno
        // https://docs.rs/wasi/0.10.2+wasi-snapshot-preview1/src/wasi/lib_generated.rs.html#1914

        function random_get_crypto(buf: ptr, len: usize): Errno {
            self.crypto.getRandomValues(memory.slice8(buf, 0 as usize, len));
            return ERRNO_SUCCESS;
        }

        function insecure_random_get_math_random(buf: ptr, len: usize): Errno {
            for (var i=0; i<len; ++i) memory.write_u8(buf, i, (0xFF & Math.floor(Math.random()*0x100)) as u8);
            return ERRNO_SUCCESS;
        }

        switch (style) {
            case "disabled":                    return {};
            case "insecure-nondeterministic":   return { random_get: ("crypto" in self) ? random_get_crypto : insecure_random_get_math_random };
            case "nondeterministic":            console.assert("crypto" in self); return { random_get: random_get_crypto };
        }
    }
}
