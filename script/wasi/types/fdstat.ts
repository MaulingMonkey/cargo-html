/**
 * \[[WASI](https://github.com/WebAssembly/WASI/blob/main/phases/snapshot/docs.md#fdstat)\]
 * File descriptor attributes.
 */
interface FdStat {
    /** File type. */
    filetype:           FileType,

    /** File descriptor flags. */
    flags:              FdFlags,

    /** Rights that apply to this file descriptor. */
    rights_base:        Rights,

    /** Maximum set of rights that may be installed on new file descriptors that are created through this file descriptor, e.g., through `path_open`. */
    rights_inheriting:  Rights,
}

function write_fdstat(memory: MemoryLE, ptr: ptr, off: number, fdstat: FdStat) {
    memory.write_u8( ptr, off+ 0, fdstat.filetype           );
    // skip 1 byte of padding
    memory.write_u16(ptr, off+ 2, fdstat.flags              );
    // skip 4 bytes of padding
    memory.write_u64(ptr, off+ 8, fdstat.rights_base        );
    memory.write_u64(ptr, off+16, fdstat.rights_inheriting  );
}
