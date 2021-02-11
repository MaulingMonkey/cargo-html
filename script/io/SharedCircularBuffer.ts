namespace io {
    const CAN_WAIT      = "wait" in Atomics;
    const PRODUCED_IDX  = 0;
    const CONSUMED_IDX  = 1;

    export class SharedCircularBuffer {
        readonly sab: SharedArrayBuffer;
        write_overflow?: number[];

        constructor(length_or_existing: number | SharedArrayBuffer) {
            if (typeof length_or_existing === "number") {
                const n = length_or_existing;
                console.assert(n === (n|0), "length isn't an integer");
                console.assert(n > 0, "length must be positive");
                console.assert((n & (n-1)) === 0, "length must be a power of 2");
                this.sab = new SharedArrayBuffer(n + 8);
            } else {
                console.assert(length_or_existing.byteLength > 8);
                this.sab = length_or_existing;
            }
        }

        // may block if the buffer is full
        write_all(data: Uint8Array | number[] | string) {
            let bytes : Uint8Array | number[];
            if (typeof data === "string") {
                bytes = new TextEncoder().encode(data);
            } else {
                bytes = data;
            }

            const atomics   = new Int32Array(this.sab, 0, 2);
            const memory    = new Uint8Array(this.sab, 8);
            const mask      = memory.length-1;

            let pos = 0;
            let produced = atomics[PRODUCED_IDX];
            while (pos < bytes.length) {
                // wait for free space
                let consumed = Atomics.load(atomics, CONSUMED_IDX);
                let writeable = memory.length - (produced - consumed)|0;
                if (writeable === 0) {
                    if (!CAN_WAIT) {
                        if (this.write_overflow === undefined) {
                            this.write_overflow = [];
                            setTimeout(() => {
                                let to_write = this.write_overflow;
                                this.write_overflow = undefined;
                                if (to_write !== undefined) {
                                    this.write_all(to_write);
                                }
                            }, 0);
                        }

                        const n = bytes.length-pos;
                        for (var i=0; i<n; ++i) {
                            this.write_overflow.push(bytes[pos+i]);
                        }
                        return;
                    }
                    Atomics.wait(atomics, CONSUMED_IDX, consumed);
                    consumed = Atomics.load(atomics, CONSUMED_IDX);
                    writeable = memory.length - (produced - consumed)|0;
                }
                console.assert(writeable > 0);

                // write data
                const n = Math.min(writeable, bytes.length-pos);
                for (var i=0; i<n; ++i) {
                    memory[(produced+i)&mask] = bytes[pos+i];
                }
                pos += n;
                produced = (produced + n)|0;
                Atomics.store(atomics, PRODUCED_IDX, produced);
                Atomics.notify(atomics, PRODUCED_IDX, +Infinity); // only necessary if talking to another worker thread, but harmless if talking to a DOM thread
            }
        }

        // may return 0 bytes in DOM/UI threads
        try_read(max: number): Uint8Array {
            const atomics   = new Int32Array(this.sab, 0, 2);
            const memory    = new Uint8Array(this.sab, 8);
            const mask      = memory.length-1;

            let consumed = atomics[CONSUMED_IDX];
            if (CAN_WAIT) { Atomics.wait(atomics, PRODUCED_IDX, consumed); }
            const produced = Atomics.load(atomics, PRODUCED_IDX);
            const read = Math.min(max, (produced-consumed)|0);
            const buf = new Uint8Array(read);
            for (let i=0; i<read; ++i) {
                buf[i] = memory[(consumed+i)&mask];
            }
            consumed = (consumed + read)|0;
            Atomics.store(atomics, CONSUMED_IDX, consumed);
            Atomics.notify(atomics, CONSUMED_IDX, +Infinity); // only necessary if talking to another worker thread, but harmless if talking to a DOM thread
            return buf;
        }
    }
}
