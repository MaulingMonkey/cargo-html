use serde::*;
use serde_json::Value;
use std::collections::*;



#[derive(Deserialize, Serialize, Debug, Default)]
pub(crate) struct PackageSettings {
    pub filesystem:     BTreeMap<String, String>,
    pub wasi:           BTreeMap<String, Value>,
}
