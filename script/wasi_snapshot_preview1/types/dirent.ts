/**
 * \[[WASI](https://github.com/WebAssembly/WASI/blob/main/phases/snapshot/docs.md#dircookie)\]
 * A reference to the offset of a directory entry.
 * The value 0 signifies the start of the directory.
 */
type DirCookie = u64 & { _not_real: "dircookie"; }

/**
 * \[[WASI](https://github.com/WebAssembly/WASI/blob/main/phases/snapshot/docs.md#dirnamlen)\]
 * The type for the `d_namlen` field of `DirEnt` struct.
 */
type DirNamLen = u32 & { _not_real: "dirnamlen"; }



/**
 * \[[WASI](https://github.com/WebAssembly/WASI/blob/main/phases/snapshot/docs.md#dirent)\]
 * A directory entry.
 *
 * **NOTE:** the WASI spec has a `d_namlen` field and then postpends the directory name "after" the struct.
 * This typescript interface instead replaces that with a `name` field that the name will be inferred from,
 * and includes the "trailing" bytes in the actual name string.
 */
interface DirEnt {
    /** The offset of the next directory entry stored in this directory. */     next:   DirCookie,
    /** The serial number of the file referred to by this directory entry. */   ino:    Inode,
    /** The length of the name of the directory entry. */                       name:   string,
    /** The type of the file referred to by this directory entry. */            type:   FileType,
}

const DIRENT_SIZE = 24;
const DIRENT_ALIGN = 8;
