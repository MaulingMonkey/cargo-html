namespace wasi_snapshot_preview1 {
    export type CIovecArray = IovecArray;
    export class IovecArray {
        readonly memory:    MemoryLE;
        readonly iovs_ptr:  ptr;
        readonly iovs_size: usize;

        constructor(memory: MemoryLE, iovs_ptr: ptr, iovs_size: usize) {
            this.memory     = memory;
            this.iovs_ptr   = iovs_ptr;
            this.iovs_size  = iovs_size;
        }

        total_bytes(): number {
            let n = 0;
            this.forEach8(b => n += b.byteLength);
            return n;
        }

        get8(iovs_idx: number): Uint8Array | undefined {
            console.assert((iovs_idx|0) == iovs_idx);
            console.assert(0 <= iovs_idx);
            if (iovs_idx >= this.iovs_size) return undefined;

            var buf_ptr = this.memory.read_ptr(  this.iovs_ptr, + 8 * iovs_idx + 0);
            var buf_len = this.memory.read_usize(this.iovs_ptr, + 8 * iovs_idx + 4);
            return this.memory.slice8(buf_ptr, +0 as usize, buf_len);
        }

        forEach8(each: (array: Uint8Array) => void) {
            for (let i = 0; i < this.iovs_size; ++i) each(this.get8(i)!);
        }
    }
}
