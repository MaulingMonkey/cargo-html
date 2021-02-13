pub(crate) trait PackageExt {
    fn is_html(&self) -> bool;
    fn is_wasi(&self) -> bool;
    fn is_wasm_pack(&self) -> bool;
}

impl PackageExt for cargo_metadata::Package {
    fn is_html(&self) -> bool {
        self.metadata.get("html").map_or(true, |html| html != false)
    }

    fn is_wasi(&self) -> bool {
        self.is_html() && self.targets.iter().any(|t| t.crate_types.iter().any(|ct| ct == "bin" || ct == "example"))
    }

    fn is_wasm_pack(&self) -> bool {
        self.is_html() && self.targets.iter().any(|t| t.crate_types.iter().any(|ct| ct == "cdylib")) && self.dependencies.iter().any(|d| d.name == "wasm-bindgen")
    }
}
