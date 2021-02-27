namespace wasi {
    /**
     * \[[WASI](https://github.com/WebAssembly/WASI/blob/main/phases/snapshot/docs.md#oflags)\]
     * Open flags used by `path_open`.
     */
    export type OFlags = u16 & { _not_real: "oflags" };



    export const OFLAGS_NONE = <OFlags>0;

    /** Create file if it does not exist. */
    export const OFLAGS_CREAT = <OFlags>(1 << 0);

    /** Fail if not a directory. */
    export const OFLAGS_DIRECTORY = <OFlags>(1 << 1);

    /** Fail if file already exists. */
    export const OFLAGS_EXCL = <OFlags>(1 << 2);

    /** Truncate file to size 0. */
    export const OFLAGS_TRUNC = <OFlags>(1 << 3);
}
