pub(crate) trait PackageExt {
    fn is_html(&self) -> bool;
    fn is_cargo_web(&self) -> bool;
    fn is_wasi(&self) -> bool;
    fn is_wasm_pack(&self) -> bool;
}

impl PackageExt for cargo_metadata::Package {
    fn is_html(&self)       -> bool { self.metadata.get("html").map_or(true, |html| html != false) }
    fn is_cargo_web(&self)  -> bool { self.is_html() && self.has_bin_or_example() && self.has_stdweb_dependency() }
    fn is_wasi(&self)       -> bool { self.is_html() && self.has_bin_or_example() && !self.has_stdweb_dependency() }
    fn is_wasm_pack(&self)  -> bool { self.is_html() && self.has_cdylib() && self.has_wasm_bindgen_dependency() }
}

trait IntPackageExt {
    fn has_dependency(&self, name: &str) -> bool;
    fn has_target_crate_type(&self, list: &[&str]) -> bool;

    fn has_stdweb_dependency        (&self) -> bool { self.has_dependency("stdweb") }
    fn has_wasm_bindgen_dependency  (&self) -> bool { self.has_dependency("wasm-bindgen") }

    fn has_bin_or_example   (&self) -> bool { self.has_target_crate_type(&["bin", "example"]) }
    fn has_cdylib           (&self) -> bool { self.has_target_crate_type(&["cdylib"]) }
}

impl IntPackageExt for cargo_metadata::Package {
    fn has_dependency(&self, name: &str) -> bool {
        self.dependencies.iter().any(|d| d.name == name)
    }

    fn has_target_crate_type(&self, list: &[&str]) -> bool {
        self.targets.iter().any(|t| t.crate_types.iter().any(|ct| list.contains(&ct.as_str())))
    }
}
