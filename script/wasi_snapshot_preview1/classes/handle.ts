namespace wasi_snapshot_preview1 {
    export interface Handle {
        readonly async: false;

        fd_read?(iovec: IovecArray): number;
        fd_write?(ciovec: CIovecArray): number;
    }

    export interface HandleAsync {
        readonly async: true;

        fd_read?(iovec: IovecArray): Promise<number>;
        fd_write?(ciovec: CIovecArray): Promise<number>;
    }
}
