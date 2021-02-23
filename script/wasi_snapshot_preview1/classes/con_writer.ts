namespace wasi_snapshot_preview1 {
    export class ConWriter implements Handle {
        readonly async: false = false;

        fd_write(ciovec: CIovecArray): number {
            var nwritten = 0;
            var text = "";
            ciovec.forEach8(buf => {
                text += new TextDecoder().decode(buf);
                nwritten += buf.length;
            });
            con.write(text);
            return nwritten;
        }
    }
}
