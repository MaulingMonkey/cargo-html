namespace wasi {
    export interface Handle {
        readonly async: false;

        debug(): string;

        fd_advise?(offset: FileSize, len: FileSize, advice: Advice): void;
        fd_allocate?(offset: FileSize, len: FileSize): void;
        fd_close?(): void;
        fd_datasync?(): void;
        fd_fdstat_get?(): FdStat;
        fd_fdstat_set_flags?(flags: FdFlags): void;
        fd_fdstat_set_rights?(rights: Rights): void;
        fd_filestat_get?(): FileStat;
        fd_filestat_set_size?(size: FileSize): void;
        fd_filestat_set_times?(access_time: TimeStamp, modified_time: TimeStamp, fst_flags: FstFlags): void;
        fd_pread?(iovec: IovecArray, offset: FileSize): number;
        fd_prestat_dir_name?(): Uint8Array;
        fd_prestat_get?(): PreStat;
        fd_pwrite?(ciovec: CIovecArray, offset: FileSize): number;
        fd_read?(iovec: IovecArray): number;
        fd_readdir?(cookie: DirCookie, maxbytes: usize): DirEnt[];
        fd_seek?(offset: FileDelta, whence: Whence): FileSize;
        fd_sync?(): void;
        fd_tell?(): FileSize;
        fd_write?(ciovec: CIovecArray): number;

        // TODO: more I/O

        path_create_directory?(path: string): void;
        path_filestat_get?(flags: LookupFlags, path: string): FileStat;
        path_open?(dirflags: LookupFlags, path: string, oflags: OFlags, fs_rights_base: Rights, fs_rights_inheriting: Rights, fdflags: FdFlags): Handle;
    }

    export interface HandleAsync {
        readonly async: true;

        debug(): string;

        fd_advise?(offset: FileSize, len: FileSize, advice: Advice): Promise<void>;
        fd_allocate?(offset: FileSize, len: FileSize): Promise<void>;
        fd_close?(): Promise<void>;
        fd_datasync?(): Promise<void>;
        fd_fdstat_get?(): Promise<FdStat>;
        fd_fdstat_set_flags?(flags: FdFlags): Promise<void>;
        fd_fdstat_set_rights?(rights: Rights): Promise<void>;
        fd_filestat_get?(): Promise<FileStat>;
        fd_filestat_set_size?(size: FileSize): Promise<void>;
        fd_filestat_set_times?(access_time: TimeStamp, modified_time: TimeStamp, fst_flags: FstFlags): Promise<void>;
        fd_pread?(iovec: IovecArray, offset: FileSize): Promise<number>;
        fd_prestat_dir_name?(): Promise<Uint8Array>;
        fd_prestat_get?(): Promise<PreStat>;
        fd_pwrite?(ciovec: CIovecArray, offset: FileSize): Promise<number>;
        fd_read?(iovec: IovecArray): Promise<number>;
        fd_readdir?(cookie: DirCookie, maxbytes: usize): Promise<DirEnt[]>;
        fd_seek?(offset: FileDelta, whence: Whence): Promise<FileSize>;
        fd_sync?(): Promise<void>;
        fd_tell?(): Promise<FileSize>;
        fd_write?(ciovec: CIovecArray): Promise<number>;

        // TODO: more I/O

        path_create_directory?(path: string): Promise<void>;
        path_filestat_get?(flags: LookupFlags, path: string): Promise<FileStat>;
        path_open?(dirflags: LookupFlags, path: string, oflags: OFlags, fs_rights_base: Rights, fs_rights_inheriting: Rights, fdflags: FdFlags): Promise<Handle | HandleAsync>;
    }
}
