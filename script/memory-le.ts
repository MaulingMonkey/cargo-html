type ptr    = number & { _not_real: "ptr"; }
type u8     = number & { _not_real: "u8"; }
type u16    = number & { _not_real: "u16"; }
type u32    = number & { _not_real: "u32"; }
type u64    = number & { _not_real: "u64"; } // XXX: number only has 52 bits of precision
type usize  = number & { _not_real: "usize"; }

class MemoryLE {
    memory: WebAssembly.Memory;

    constructor(memory: WebAssembly.Memory) {
        this.memory = memory;
    }

    read_u8(   ptr: ptr, offset: number): u8       { return new DataView(this.memory.buffer).getUint8( ptr + offset      ) as u8; }
    read_u16(  ptr: ptr, offset: number): u16      { return new DataView(this.memory.buffer).getUint16(ptr + offset, true) as u16; }
    read_u32(  ptr: ptr, offset: number): u32      { return new DataView(this.memory.buffer).getUint32(ptr + offset, true) as u32; }
    read_usize(ptr: ptr, offset: number): usize    { return this.read_u32(  ptr, offset) as any; }
    read_ptr(  ptr: ptr, offset: number): ptr      { return this.read_usize(ptr, offset) as any; }
    
    // XXX: `number` only guarantees 52-bit precision, so this is pretty bogus
    read_u64_approx(  ptr: ptr, offset: number): u64 {
        let dv = new DataView(this.memory.buffer);
        let lo = dv.getUint32(ptr + offset + 0, true);
        let hi = dv.getUint32(ptr + offset + 4, true);
        return (hi * 0x100000000 + lo) as u64;
    }

    read_u64_pair(  ptr: ptr, offset: number): [u32, u32] {
        let dv = new DataView(this.memory.buffer);
        let lo = dv.getUint32(ptr + offset + 0, true) as u32;
        let hi = dv.getUint32(ptr + offset + 4, true) as u32;
        return [lo, hi];
    }

    write_u8(      ptr: ptr, offset: number, value: u8     ) { new DataView(this.memory.buffer).setUint8( ptr + offset, value      ); }
    write_u16(     ptr: ptr, offset: number, value: u16    ) { new DataView(this.memory.buffer).setUint16(ptr + offset, value, true); }
    write_u32(     ptr: ptr, offset: number, value: u32    ) { new DataView(this.memory.buffer).setUint32(ptr + offset, value, true); }
    write_usize(   ptr: ptr, offset: number, value: usize  ) { this.write_u32(  ptr, offset, value as any); }
    write_ptr(     ptr: ptr, offset: number, value: ptr    ) { this.write_usize(ptr, offset, value as any); }
    write_u64_pair(ptr: ptr, offset: number, [lo, hi]: [u32, u32]) {
        this.write_u32(ptr, offset+0, lo);
        this.write_u32(ptr, offset+4, hi);
    }

    slice(ptr: ptr, start: usize, end: usize): DataView { return new DataView(this.memory.buffer, ptr+start, end-start); }
    slice8(ptr: ptr, start: usize, end: usize): Uint8Array { return new Uint8Array(this.memory.buffer, ptr+start, end-start); }
}
