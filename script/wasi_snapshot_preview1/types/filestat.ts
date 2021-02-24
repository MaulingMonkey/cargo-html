type Device         = u64 & { _not_real: "device" };
type Inode          = u64 & { _not_real: "inode" };
type LinkCount      = u64;
type FileSize       = u64;
type TimeStamp      = u64;

interface FileStat {
    dev:            Device,
    ino:            Inode,
    filetype:       FileType,
    nlink:          LinkCount,
    size:           FileSize,
    access_time:    TimeStamp,
    modified_time:  TimeStamp,
    change_time:    TimeStamp,
}
