namespace wasi {
    /**
     * \[[WASI](https://github.com/WebAssembly/WASI/blob/main/phases/snapshot/docs.md#fdflags)\]
     * File descriptor flags.
     */
    export type FdFlags = u16 & { _not_real: "fdflags" };



    export const FDFLAGS_NONE = <FdFlags>0;

    /** Append mode: Data written to the file is always appended to the file's end. */
    export const FDFLAGS_APPEND = <FdFlags>(1 << 0);

    /**
     * Write according to synchronized I/O data integrity completion.
     * Only the data stored in the file is synchronized.
     */
    export const FDFLAGS_DSYNC = <FdFlags>(1 << 1);

    /** Non-blocking mode. */
    export const FDFLAGS_NONBLOCK = <FdFlags>(1 << 2);

    /** Synchronized read I/O operations. */
    export const FDFLAGS_RSYNC = <FdFlags>(1 << 3);

    /**
     * Write according to synchronized I/O file integrity completion.
     * In addition to synchronizing the data stored in the file, the implementation may also synchronously update the file's metadata.
     */
    export const FDFLAGS_SYNC = <FdFlags>(1 << 4);
}
