use mmrbi::*;
use serde::*;

use std::borrow::Cow;
use std::path::{Path, PathBuf};
use std::time::SystemTime;



#[derive(Deserialize, Serialize, Debug, Default)]
pub(crate) struct Mount {
    #[serde(default)]
    pub source:     Option<PathBuf>,
    pub mount:      String,
    #[serde(default = "bool_true")]
    pub writable:   bool,
    #[serde(default)]
    pub persist:    Option<MountPersist>,
}

#[derive(Deserialize, Serialize, Debug)]
#[serde(rename_all = "kebab-case", tag = "type")]
pub(crate) enum MountPersist {
    LocalStorage {
        /// key of the root localStorage blob & prefix of secondary blobs
        key:        String,
        /// if true, unmodified files aren't stored and can be updated on the original filesystem
        overlay:    bool,
    },
    // ...network mounts?
    // IndexedDB mounts?
    // ...?
}

fn bool_true() -> bool { true }

pub(crate) struct Dir  { pub relative: String }
pub(crate) struct File { pub relative: String, pub src: PathBuf }

pub(crate) struct GatheredMount<'a> {
    pub mount:          &'a Mount,
    pub dirs:           Vec<Dir>,
    pub files:          Vec<File>,
    pub last_modified:  SystemTime,
    pub errors:         bool,
}

impl<'a> GatheredMount<'a> {
    pub fn from(root: &Path, mount: &'a Mount) -> Self {
        let mut gm =  Self {
            mount,
            dirs:           Vec::new(),
            files:          Vec::new(),
            last_modified:  SystemTime::UNIX_EPOCH,
            errors:         false,
        };
        if !mount.mount.starts_with("/") {
            error!("expected all mounts to start with `/` but `{}` does not", mount.mount);
            gm.errors = true;
        }
        if let Some(source) = mount.source.as_ref() {
            gm.gather(&root.join(source), "");
        } else {
            if !mount.mount.ends_with("/") {
                error!("`{}`: file mount missing source (if this was intended to be a directory mount, end it with `/`)", mount.mount);
                gm.errors = true;
            }
            gm.dirs.push(Dir { relative: String::new() });
        }
        gm
    }

    pub fn gather(&mut self, src: &Path, rel: &str) {
        let meta = match src.metadata() {
            Ok(meta) => meta,
            Err(err) => {
                error!("`{}`: unable to get metadata: {}", src.display(), err);
                self.errors = true;
                return;
            },
        };

        if rel == "" {
            if !self.mount.mount.ends_with("/") && meta.is_dir() {
                error!("`{}`: file mount sources from a directory (if you meant to mount a directory, end the mount with `/`)", self.mount.mount);
                self.errors = true;
            }

            if self.mount.mount.ends_with("/") && meta.is_file() {
                error!("`{}`: directory mount sources from a file (if you meant to mount a file, do not end the mount with `/`)", self.mount.mount);
                self.errors = true;
            }
        }

        match meta.modified() {
            Ok(modified) => {
                if modified > self.last_modified {
                    self.last_modified = modified;
                }
            },
            Err(err) => {
                error!("`{}`: unable to get last modified time: {}", src.display(), err);
                self.errors = true;
            },
        }

        if meta.is_dir() {
            self.dirs.push(Dir { relative: rel.to_owned() });
            match std::fs::read_dir(src) {
                Ok(dir) => {
                    for e in dir {
                        match e {
                            Ok(ent) => {
                                let path = ent.path();
                                let name = ent.file_name();
                                let name = name.to_string_lossy();
                                if matches!(&name, Cow::Owned(_)) { warning!("`{}`: name contains invalid Unicode sequences, replacing with U+FFFD", path.display()); }
                                self.gather(&path, &format!("{}{}{}", rel, if rel.is_empty() { "" } else { "/" }, name));
                            },
                            Err(err) => {
                                error!("`{}`: errors while enumerating: {}", src.display(), err);
                                self.errors = true;
                            },
                        }
                    }
                },
                Err(err) => {
                    error!("`{}` cannot be enumerated: {}", src.display(), err);
                    self.errors = true;
                },
            }
        } else if meta.is_file() {
            self.files.push(File { relative: rel.to_owned(), src: src.to_owned() });
        } else {
            error!("`{}` not a file or directory", src.display());
            self.errors = true;
        }
    }
}
