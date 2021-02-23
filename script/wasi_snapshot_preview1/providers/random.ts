namespace wasi_snapshot_preview1 {
    /**
     * Provide the `random_get` syscall.  This has three available `style`s:
     * 
     * *    `"disabled"` - don't provide the syscall at all.
     * 
     *      **NOTE WELL:** Rust's `HashMap`s will panic when they fail to randomize their seed!
     * 
     * 
     * *    `"nondeterministic"` - use [`Crypto.getRandomValues()`](https://developer.mozilla.org/en-US/docs/Web/API/Crypto/getRandomValues),
     *      asserting if it's unavailable.
     * 
     *      MDN recommends against using this to generate encryption keys, recommending
     *      [`SubtleCrypto.generateKey()`](https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/generateKey)
     *      instead.  See the linked MDN documentation for more details.
     * 
     * 
     * *    `"insecure-nondeterministic"` - use [`Crypto.getRandomValues()`](https://developer.mozilla.org/en-US/docs/Web/API/Crypto/getRandomValues), or [`Math.random()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/random).
     * 
     *      **NOTE WELL:** WASI expects implementations to provide "high-quality random data" and *block* if unable to
     *      provide it.  `Math.random()` does *not* provide cryptographically secure random numbers, so this
     *      implementation arguably violates the WASI spec.  Usable for terrible insecure single player web games, but
     *      you should *not* use this for secure communications!
     *
     *
     * *    `"insecure-deterministic"` - not yet implemented.
     * 
     *      This might be created in the future to provide a 100% deterministic and replayable execution environment.
     *      Potentially incredibly useful for bug repros.
     *      Potentially incredibly insecure.
     */
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
