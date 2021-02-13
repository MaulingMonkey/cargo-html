namespace stdin {
    var buf           : number[] = [];
    var pending_io    : { max: number, callback: ((input: number[]) => void) }[] = [];

    export function read(max: number): Promise<number[]> {
        return new Promise((callback) => {
            pending_io.push({max, callback});
            dispatch();
        });
    }

    export function write(text: string) {
        con.write(text);
        var bytes = new TextEncoder().encode(text);
        for (var i=0; i<bytes.length; ++i) {
            buf.push(bytes[i]);
        }
        dispatch();
    }

    function dispatch() {
        while (buf.length > 0 && pending_io.length > 0) {
            const io = pending_io.shift();
            if (io === undefined) continue;
            const nread = Math.min(buf.length, io.max);
            const read = buf.slice(0, nread);
            const after = buf.slice(nread);
            buf = after;
            (io.callback)(read);
        }
    }
}
