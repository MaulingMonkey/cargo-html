namespace wasi_snapshot_preview1 {
    export class ConReader implements HandleAsync {
        readonly async: true = true;

        async fd_read(iovec: IovecArray): Promise<number> {
            const read = await stdin.read(iovec.total_bytes());
            const nread = read.length;
            iovec.forEach8(buf => {
                const n = buf.length;
                for (let i = 0; i < n; ++i) {
                    const byte = read.shift();
                    if (byte === undefined) return;
                    buf[i] = byte;
                }
            });
            return nread;
        }
    }
}
