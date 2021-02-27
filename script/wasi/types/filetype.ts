namespace wasi {
    /** \[[WASI](https://github.com/WebAssembly/WASI/blob/main/phases/snapshot/docs.md#filetype)\] The type of a file descriptor or file. */
    export type FileType = u8 & { _not_real: "filetype" };



    /** The type of the file descriptor or file is unknown or is different from any of the other types specified. */
    export const FILETYPE_UNKNOWN = <FileType>0;

    /** The file descriptor or file refers to a block device inode. */
    export const FILETYPE_BLOCK_DEVICE = <FileType>1;

    /** The file descriptor or file refers to a character device inode. */
    export const FILETYPE_CHARACTER_DEVICE = <FileType>2;

    /** The file descriptor or file refers to a directory inode. */
    export const FILETYPE_DIRECTORY = <FileType>3;

    /** The file descriptor or file refers to a regular file inode. */
    export const FILETYPE_REGULAR_FILE = <FileType>4;

    /** The file descriptor or file refers to a datagram socket. */
    export const FILETYPE_SOCKET_DGRAM = <FileType>5;

    /** The file descriptor or file refers to a byte-stream socket. */
    export const FILETYPE_SOCKET_STREAM = <FileType>6;

    /** The file refers to a symbolic link inode. */
    export const FILETYPE_SYMBOLIC_LINK = <FileType>7;
}
