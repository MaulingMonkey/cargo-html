namespace wasi_snapshot_preview1 {
    export interface Handle {
        readonly async: false;

        fd_read?(iovec: IovecArray): number;
        fd_write?(ciovec: CIovecArray): number;
        fd_close?(): void;
        fd_filestat_get?(): FileStat;
        fd_prestat_dir_name?(): Uint8Array;
        fd_prestat_get?(): PreStat;
        path_filestat_get?(flags: LookupFlags, path: string): FileStat;
        path_open?(dirflags: LookupFlags, path: string, oflags: OFlags, fs_rights_base: Rights, fs_rights_inheriting: Rights, fdflags: FdFlags): Handle;
    }

    export interface HandleAsync {
        readonly async: true;

        fd_read?(iovec: IovecArray): Promise<number>;
        fd_write?(ciovec: CIovecArray): Promise<number>;
        fd_close?(): Promise<void>;
        fd_filestat_get?(): Promise<FileStat>;
        fd_prestat_dir_name?(): Promise<Uint8Array>;
        fd_prestat_get?(): Promise<PreStat>;
        path_filestat_get?(flags: LookupFlags, path: string): Promise<FileStat>;
        path_open?(dirflags: LookupFlags, path: string, oflags: OFlags, fs_rights_base: Rights, fs_rights_inheriting: Rights, fdflags: FdFlags): Promise<Handle | HandleAsync>;
    }
}
