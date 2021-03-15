use super::PackageSettings;
use cargo_metadata::{Node, PackageId, Target, Version};
use mmrbi::*;
use std::collections::BTreeMap;
use std::path::PathBuf;



#[derive(Debug)]
pub(crate) struct Package {
    pub id:             PackageId,
    pub name:           String,
    pub manifest_path:  PathBuf,
    pub targets:        Vec<Target>,
    pub directory:      PathBuf,

    pub wasm_bindgen:   Option<Version>,
    pub template:       Option<String>,
    pub settings:       PackageSettings,
    pub asyncify:       bool,

    pub is_html:        bool,
    pub is_cargo_web:   bool,
    pub is_wasi:        bool,
    pub is_wasm_pack:   bool,
}

impl Package {
    pub(super) fn new(p: cargo_metadata::Package, package_id_info: &BTreeMap<PackageId, (String, Version, Option<&Node>)>) -> Self {
        let has_cdylib  = p.targets.iter().any(|t| t.crate_types.iter().any(|ct| ct == "cdylib"  ));
        let has_bin     = p.targets.iter().any(|t| t.crate_types.iter().any(|ct| ct == "bin"     ));
        let has_example = p.targets.iter().any(|t| t.crate_types.iter().any(|ct| ct == "example" ));
        let has_bin_or_example = has_bin || has_example;

        let (_, _, p_node) = package_id_info[&p.id];

        let mut wasm_bindgen : Option<Version> = None;
        for p_dep in p_node.map(|node| node.deps.iter()).into_iter().flatten() {
            let (dep_name, dep_version, _) = &package_id_info[&p_dep.pkg];
            if dep_name == "wasm-bindgen" {
                if wasm_bindgen.is_some() { fatal!("package `{}` has dependencies on multiple versions of wasm-bindgen", p.name); }
                wasm_bindgen = Some(dep_version.clone());
            }
        }

        let template = p.metadata.pointer("/html/template").map(|t| t.as_str().unwrap_or_else(|| fatal!("package `{}`: `package.metadata.html.template` is not a string", p.name)).to_owned());

        let settings : PackageSettings = if let Some(html) = p.metadata.pointer("/html") {
            serde_json::from_value(html.clone()).unwrap_or_else(|err| fatal!("package `{}`: error deserializing `package.metadata.html` to package settings: {}", p.name, err))
        } else {
            PackageSettings::default()
        };

        // TODO: settings.mounts: validation
        // TODO: settings.wasi: validation

        let has_wasm_bindgen_dependency = wasm_bindgen.is_some();
        let has_stdweb_dependency = p.dependencies.iter().any(|d| d.name == "stdweb");

        let is_html         = p.metadata.get("html").map_or(true, |html| html != false);
        let is_cargo_web    = is_html && has_bin_or_example && p.metadata.pointer("/html/cargo-web").map_or_else(|| has_stdweb_dependency, |cargo_web| cargo_web != false);
        let is_wasi         = is_html && has_bin_or_example && !is_cargo_web;
        let is_wasm_pack    = is_html && has_cdylib && p.metadata.pointer("/html/wasm-pack").map_or_else(|| has_wasm_bindgen_dependency, |wasm_pack| wasm_pack != false);
        let asyncify        = is_html && p.metadata.pointer("/html/asyncify").map_or_else(|| is_wasi, |asyncify| asyncify != false);

        let mut directory = p.manifest_path.clone();
        directory.pop();

        Self {
            id:             p.id,
            name:           p.name,
            manifest_path:  p.manifest_path,
            targets:        p.targets,
            directory,

            wasm_bindgen,
            template,
            settings,
            asyncify,

            is_html,
            is_cargo_web,
            is_wasi,
            is_wasm_pack,
        }
    }
}
