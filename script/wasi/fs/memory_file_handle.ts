namespace wasi.fs {
    export class MemoryFileHandle implements Handle {
        readonly async = false;
        readonly fs:    io.memory.FileSystem;
        readonly file:  io.memory.File;
        readonly write: boolean;

        position    = 0;
        blocking    = true;
        fdflags     = FDFLAGS_NONE;

        debug(): string { return `MemoryFileHandle` }

        constructor(fs: io.memory.FileSystem, file: io.memory.File, write: boolean) {
            if (write && !file.writeable) throw ERRNO_ROFS;

            if (write) {
                if (!file.writeable) throw ERRNO_ROFS;
                if (file.writers || file.readers) throw ERRNO_PERM;
                ++file.writers;
            } else {
                if (file.writers) throw ERRNO_PERM;
                ++file.readers;
            }

            this.fs     = fs;
            this.file   = file;
            this.write  = write;
        }

        fd_close() {
            if (this.write) {
                --this.file.writers;
            } else {
                --this.file.readers;
            }
        }

        fd_advise(_offset: FileSize, _len: FileSize, _advice: Advice) {}
        fd_datasync() {} // TODO: sync fs if it has persistence?
        fd_fdstat_set_flags(fdflags: FdFlags) { this.fdflags = fdflags; }
        fd_tell(): FileSize { return BigInt(this.position) as FileSize; }
        fd_sync() {} // TODO: sync fs if it has persistence?

        fd_allocate(offset: FileSize, len: FileSize) {
            if (!this.write) throw ERRNO_BADF;
            const maxb = offset + len;
            if (maxb >= Number.MAX_SAFE_INTEGER) throw ERRNO_FBIG;
            const max = Number(maxb);
            if (max > this.file.data.length) {
                const next_data = new Uint8Array(Math.max(max, 2 * Math.max(128, this.file.data.length)));
                for (let i=0; i<this.file.data.length; ++i) next_data[i] = this.file.data[i];
                this.file.data = next_data;
            }
        }

        fd_fdstat_get(): FdStat {
            return {
                filetype:           FILETYPE_DIRECTORY,
                flags:              this.fdflags,
                rights_base:        RIGHTS_ALL_FILE,
                rights_inheriting:  RIGHTS_NONE,
            };
        }

        fd_seek(offset: FileDelta, whence: Whence): FileSize {
            var abs : BigInt;
            switch (whence) {
                case WHENCE_SET:    abs = offset; break;
                case WHENCE_END:    abs = BigInt(this.file.length) + offset; break;
                case WHENCE_CUR:    abs = this.fd_tell() + offset; break;
                default:            throw ERRNO_INVAL;
            }
            if (abs < 0n) throw ERRNO_IO;
            if (abs >= BigInt(Number.MAX_SAFE_INTEGER)) throw ERRNO_FBIG;
            this.position = Number(abs);
            return abs as FileSize;
        }

        fd_filestat_get(): FileStat {
            return {
                dev:            0n as Device,
                ino:            BigInt(this.file.node) as Inode,
                filetype:       FILETYPE_REGULAR_FILE,
                nlink:          0n as LinkCount,
                size:           BigInt(this.file.length) as FileSize,
                access_time:    this.file.last_access_time,
                modified_time:  this.file.last_modified_time,
                change_time:    this.file.last_change_time,
            };
        }

        fd_filestat_set_size(size: FileSize) {
            if (!this.write) throw ERRNO_BADF;
            else if (size > BigInt(this.file.length)) this.fd_allocate(0n as FileSize, size);
            else if (size < this.file.length) {
                const smol = Number(size);
                for (let i=smol; i<this.file.length; ++i) this.file.data[i] = 0;
                this.file.length = smol;
            }
        }

        fd_filestat_set_times(access_time: TimeStamp, modified_time: TimeStamp, fst_flags: FstFlags) {
            const now = this.fs.now();
            if      (fst_flags & FSTFLAGS_ATIM)     this.file.last_access_time = access_time;
            else if (fst_flags & FSTFLAGS_ATIM_NOW) this.file.last_access_time = now;
            if      (fst_flags & FSTFLAGS_MTIM)     this.file.last_modified_time = modified_time;
            else if (fst_flags & FSTFLAGS_MTIM_NOW) this.file.last_modified_time = now;
        }

        fd_read(iovec: IovecArray): usize {
            if (!this.file.readable) throw ERRNO_NOTCAPABLE;

            let read = 0;
            iovec.forEach8(io => {
                let n = Math.min(io.length, this.file.length - this.position);
                for (let i = 0; i < n; ++i) io[i] = this.file.data[i];
                this.position += n;
                read += n;
            });
            return read as usize;
        }

        fd_write(ciovec: CIovecArray): usize {
            if (!this.write) throw ERRNO_NOTCAPABLE;
            if (this.fdflags & FDFLAGS_APPEND) this.position = this.file.length;

            const total = Math.min(0xFFFFFFFF, ciovec.total_bytes());
            const max = this.position + total;
            if (max >= Number.MAX_SAFE_INTEGER) throw ERRNO_FBIG;
            if (max > this.file.data.length) {
                const next_data = new Uint8Array(Math.max(max, 2 * Math.max(128, this.file.data.length)));
                for (let i=0; i<this.file.data.length; ++i) next_data[i] = this.file.data[i];
                this.file.data = next_data;
            }
            this.file.length = Math.max(this.file.length, max);

            ciovec.forEach8(io => io.forEach(b => { if (this.position < max) this.file.data[this.position++] = b; }));
            console.assert(this.position == max);
            return total as usize;
        }

        fd_pread(iovec: IovecArray, offset: FileSize): usize {
            if (!this.file.readable) throw ERRNO_NOTCAPABLE;
            if (offset >= this.file.length) return 0 as usize;

            const prev_pos = this.position;
            try {
                this.position = Number(offset);
                return this.fd_read(iovec);
            } finally {
                this.position = prev_pos;
            }
        }

        fd_pwrite(iovec: CIovecArray, offset: FileSize): usize {
            if (!this.file.writeable) throw ERRNO_NOTCAPABLE;
            if (offset >= Number.MAX_SAFE_INTEGER) throw ERRNO_FBIG;

            const prev_pos = this.position;
            try {
                this.position = Number(offset);
                return this.fd_read(iovec);
            } finally {
                this.position = prev_pos;
            }
        }
    }
}
