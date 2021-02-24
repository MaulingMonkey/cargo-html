type PreOpenType = u8 & { _not_real: "preopentype"; }
const PREOPENTYPE_DIR = <PreOpenType>0;

interface PreStat {
    tag:                PreOpenType;
    u_dir_pr_name_len?: usize; // PREOPENTYPE_DIR
}
