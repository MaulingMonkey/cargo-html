use super::Mount;
use serde::*;
use serde_json::Value;
use std::collections::*;



#[derive(Deserialize, Serialize, Debug, Default)]
pub(crate) struct PackageSettings {
    #[serde(default, rename = "mount")]
    pub mounts: Vec<Mount>,
    #[serde(default)]
    pub wasi:   BTreeMap<String, Value>,
}
