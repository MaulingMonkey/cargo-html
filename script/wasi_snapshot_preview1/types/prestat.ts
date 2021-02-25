/** \[[WASI](https://github.com/WebAssembly/WASI/blob/main/phases/snapshot/docs.md#preopentype)\] Identifiers for preopened capabilities. */
type PreOpenType = u8 & { _not_real: "preopentype"; }



/** A pre-opened directory. */
const PREOPENTYPE_DIR = <PreOpenType>0;



/** \[[WASI](https://github.com/WebAssembly/WASI/blob/main/phases/snapshot/docs.md#prestat)\] Information about a pre-opened capability. */
interface PreStat {
    tag:                PreOpenType;

    /** \[[WASI](https://github.com/WebAssembly/WASI/blob/main/phases/snapshot/docs.md#prestat_dir)\] The length of the directory name for use with fd_prestat_dir_name. */
    u_dir_pr_name_len?: usize; // PREOPENTYPE_DIR
}
