/**
 * File descriptor rights, determining which actions may be performed.
 *
 * ### See Also
 *
 * * [WASI standard documentation](https://github.com/WebAssembly/WASI/blob/main/phases/snapshot/docs.md#-rights-record)
 */
type Rights = u64 & { _not_real: "rights" }; // RIGHTS_*



/** The right to invoke `fd_datasync`. If `path_open` is set, includes the right to invoke `path_open` with `fdflags::dsync`. */
const RIGHTS_FD_DATASYNC = <Rights>BigInt(1 << 0);

/** The right to invoke fd_read and sock_recv. If rights::fd_seek is set, includes the right to invoke fd_pread. */
const RIGHTS_FD_READ = <Rights>BigInt(1 << 1);

/** The right to invoke fd_seek. This flag implies rights::fd_tell. */
const RIGHTS_FD_SEEK = <Rights>BigInt(1 << 2);

/** The right to invoke fd_fdstat_set_flags. */
const RIGHTS_FD_FDSTAT_SET_FLAGS = <Rights>BigInt(1 << 3);

/** The right to invoke fd_sync. If path_open is set, includes the right to invoke path_open with fdflags::rsync and fdflags::dsync. */
const RIGHTS_FD_SYNC = <Rights>BigInt(1 << 4);

/** The right to invoke fd_seek in such a way that the file offset remains unaltered (i.e., whence::cur with offset zero), or to invoke fd_tell. */
const RIGHTS_FD_TELL = <Rights>BigInt(1 << 5);

/** The right to invoke fd_write and sock_send. If rights::fd_seek is set, includes the right to invoke fd_pwrite. */
const RIGHTS_FD_WRITE = <Rights>BigInt(1 << 6);

/** The right to invoke fd_advise. */
const RIGHTS_FD_ADVISE = <Rights>BigInt(1 << 7);

/** The right to invoke fd_allocate. */
const RIGHTS_FD_ALLOCATE = <Rights>BigInt(1 << 8);

/** The right to invoke path_create_directory. */
const RIGHTS_PATH_CREATE_DIRECTORY = <Rights>BigInt(1 << 9);

/** If path_open is set, the right to invoke path_open with oflags::creat. */
const RIGHTS_PATH_CREATE_FILE = <Rights>BigInt(1 << 10);

/**  The right to invoke path_link with the file descriptor as the source directory. */
const RIGHTS_PATH_LINK_SOURCE = <Rights>BigInt(1 << 11);

/** The right to invoke path_link with the file descriptor as the target directory. */
const RIGHTS_PATH_LINK_TARGET = <Rights>BigInt(1 << 12);

/** The right to invoke path_open. */
const RIGHTS_PATH_OPEN = <Rights>BigInt(1 << 13);

/** The right to invoke fd_readdir. */
const RIGHTS_FD_READDIR = <Rights>BigInt(1 << 14);

/** The right to invoke path_readlink. */
const RIGHTS_PATH_READLINK = <Rights>BigInt(1 << 15);

/** The right to invoke path_rename with the file descriptor as the source directory. */
const RIGHTS_PATH_RENAME_SOURCE = <Rights>BigInt(1 << 16);

/** The right to invoke path_rename with the file descriptor as the target directory. */
const RIGHTS_PATH_RENAME_TARGET = <Rights>BigInt(1 << 17);

/** The right to invoke path_filestat_get. */
const RIGHTS_PATH_FILESTAT_GET = <Rights>BigInt(1 << 18);

/** The right to change a file's size (there is no path_filestat_set_size). If path_open is set, includes the right to invoke path_open with oflags::trunc. */
const RIGHTS_PATH_FILESTAT_SET_SIZE = <Rights>BigInt(1 << 19);

/** The right to invoke path_filestat_set_times. */
const RIGHTS_PATH_FILESTAT_SET_TIMES = <Rights>BigInt(1 << 20);

/** The right to invoke fd_filestat_get. */
const RIGHTS_FD_FILESTAT_GET = <Rights>BigInt(1 << 21);

/** The right to invoke fd_filestat_set_size. */
const RIGHTS_FD_FILESTAT_SET_SIZE = <Rights>BigInt(1 << 22);

/** The right to invoke fd_filestat_set_times. */
const RIGHTS_FD_FILESTAT_SET_TIMES = <Rights>BigInt(1 << 23);

/** The right to invoke path_symlink. */
const RIGHTS_PATH_SYMLINK = <Rights>BigInt(1 << 24);

/** The right to invoke path_remove_directory. */
const RIGHTS_PATH_REMOVE_DIRECTORY = <Rights>BigInt(1 << 25);

/** The right to invoke path_unlink_file. */
const RIGHTS_PATH_UNLINK_FILE = <Rights>BigInt(1 << 26);

/** If rights::fd_read is set, includes the right to invoke poll_oneoff to subscribe to eventtype::fd_read. If rights::fd_write is set, includes the right to invoke poll_oneoff to subscribe to eventtype::fd_write. */
const RIGHTS_POLL_FD_READWRITE = <Rights>BigInt(1 << 27);

/** The right to invoke sock_shutdown. */
const RIGHTS_SOCK_SHUTDOWN = <Rights>BigInt(1 << 28);
