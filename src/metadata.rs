use crate::*;

use cargo_metadata::Package;

use std::collections::*;
use std::path::*;
use std::sync::Arc;



pub(crate) struct Metadata {
    pub all:                All,
    pub workspace:          Workspace,
    pub default_package:    Option<Arc<Package>>,
    pub target_directory:   PathBuf,
}

pub(crate) struct All {
    pub packages:           BTreeMap<String, Arc<Package>>,
}

pub(crate) struct Workspace {
    pub packages:           BTreeMap<String, Arc<Package>>,
    pub root:               PathBuf,
    pub metadata:           serde_json::Value,
}



impl Metadata {
    pub fn from_args(args: &Arguments) -> Self {
        let mut metadata = cargo_metadata::MetadataCommand::new();
        if let Some(manifest_path) = args.manifest_path.as_ref() {
            metadata.manifest_path(manifest_path);
        }
        let mut metadata : cargo_metadata::Metadata = metadata.exec().unwrap_or_else(|err| fatal!("failed to run/parse `cargo metadata`: {}", err));


        let workspace_member_ids    = std::mem::take(&mut metadata.workspace_members).into_iter().collect::<BTreeSet<_>>();
        let all_packages            = std::mem::take(&mut metadata.packages).into_iter().map(|p| (p.name.clone(), Arc::new(p))).collect::<BTreeMap<_,_>>();
        let workspace_packages      = all_packages.iter().filter(|(_name, pkg)| workspace_member_ids.contains(&pkg.id)).map(|(name, pkg)| (name.clone(), pkg.clone())).collect::<BTreeMap<_,_>>();
        let default_package         = std::mem::take(&mut metadata.resolve).and_then(|r| r.root).and_then(|root| workspace_packages.values().find(|pkg| pkg.id == root).cloned());

        Self {
            all: All {
                packages:       all_packages
            },
            workspace: Workspace {
                packages:       workspace_packages,
                root:           std::mem::take(&mut metadata.workspace_root),
                metadata:       std::mem::take(&mut metadata.workspace_metadata),
            },
            default_package,
            target_directory:   std::mem::take(&mut metadata.target_directory),
        }
    }
}
