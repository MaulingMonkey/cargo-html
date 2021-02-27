/**
 * \[[WASI](https://github.com/WebAssembly/WASI/blob/main/phases/snapshot/docs.md#device)\]
 * Identifier for a device containing a file system.
 * Can be used in combination with inode to uniquely identify a file or directory in the filesystem.
 */
type Device = u64 & { _not_real: "device" };

/** \[[WASI](https://github.com/WebAssembly/WASI/blob/main/phases/snapshot/docs.md#inode)\] File serial number that is unique within its file system. */
type Inode = u64 & { _not_real: "inode" };

/** \[[WASI](https://github.com/WebAssembly/WASI/blob/main/phases/snapshot/docs.md#linkcount)\] Number of hard links to an inode. */
type LinkCount = u64;

/** \[[WASI](https://github.com/WebAssembly/WASI/blob/main/phases/snapshot/docs.md#filedelta)\] Relative offset within a file. */
type FileDelta = i64;

/** \[[WASI](https://github.com/WebAssembly/WASI/blob/main/phases/snapshot/docs.md#filesize)\] Non-negative file size or length of a region within a file. */
type FileSize = u64;

/** \[[WASI](https://github.com/WebAssembly/WASI/blob/main/phases/snapshot/docs.md#timestamp)\] Timestamp in nanoseconds. */
type TimeStamp = u64;



/**
 * \[[WASI](https://github.com/WebAssembly/WASI/blob/main/phases/snapshot/docs.md#filestat)\]
 * File attributes.
 */
interface FileStat {
    dev:            Device,
    ino:            Inode,
    filetype:       FileType,
    nlink:          LinkCount,
    size:           FileSize,
    access_time:    TimeStamp,
    modified_time:  TimeStamp,
    change_time:    TimeStamp,
}

function write_filestat(memory: MemoryLE, ptr: ptr, off: number, filestat: FileStat) {
    memory.write_u64(ptr, off+ 0, filestat.dev          );
    memory.write_u64(ptr, off+ 8, filestat.ino          );
    memory.write_u8( ptr, off+16, filestat.filetype     );
    memory.write_u64(ptr, off+24, filestat.nlink        );
    memory.write_u64(ptr, off+32, filestat.size         );
    memory.write_u64(ptr, off+40, filestat.access_time  );
    memory.write_u64(ptr, off+48, filestat.modified_time);
    memory.write_u64(ptr, off+56, filestat.change_time  );
}
