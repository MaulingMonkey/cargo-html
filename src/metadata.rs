use crate::*;

use cargo_metadata::Package;

use std::collections::*;
use std::path::*;
use std::sync::Arc;



#[derive(Debug)]
pub(crate) struct Metadata {
    workspace:          Workspace,
    selected:           Selected,
    target_directory:   PathBuf,
}

#[derive(Debug)]
pub(crate) struct Workspace {
    pub packages:           BTreeMap<String, Arc<Package>>,
    pub targets:            BTreeMap<(TargetType, String), Arc<Package>>,
}

#[derive(Debug, Default)]
pub(crate) struct Selected {
    pub packages:           BTreeMap<String, Arc<Package>>,
    pub targets:            BTreeMap<(TargetType, String), Arc<Package>>,
}



impl Metadata {
    pub fn from_args(args: &Arguments) -> Self {
        let mut metadata = cargo_metadata::MetadataCommand::new();
        if let Some(manifest_path) = args.manifest_path.as_ref() {
            metadata.manifest_path(manifest_path);
        }
        let mut metadata : cargo_metadata::Metadata = metadata.exec().unwrap_or_else(|err| fatal!("failed to run/parse `cargo metadata`: {}", err));

        // Reprocess packages, targets

        let workspace_member_ids    = std::mem::take(&mut metadata.workspace_members).into_iter().collect::<BTreeSet<_>>();

        let mut all_packages        = BTreeMap::<String, Arc<Package>>::new();
        let mut workspace_packages  = BTreeMap::<String, Arc<Package>>::new();
        let mut workspace_targets   = BTreeMap::<(TargetType, String), Arc<Package>>::new();

        for package in std::mem::take(&mut metadata.packages).into_iter() {
            let package = Arc::new(package);

            assert!(all_packages.insert(package.name.clone(), package.clone()).is_none());
            if workspace_member_ids.contains(&package.id) {
                assert!(workspace_packages.insert(package.name.clone(), package.clone()).is_none());

                for target in package.targets.iter() {
                    for ty in target.crate_types.iter() {
                        match ty.as_str() {
                            "cdylib"    => assert!(workspace_targets.insert((TargetType::Cdylib,   target.name.clone()), package.clone()).is_none()),
                            "example"   => assert!(workspace_targets.insert((TargetType::Example,  target.name.clone()), package.clone()).is_none()),
                            "bin"       => assert!(workspace_targets.insert((TargetType::Bin,      target.name.clone()), package.clone()).is_none()),
                            _other      => {},
                        }
                    }
                }
            }
        }

        let default_package = std::mem::take(&mut metadata.resolve)
            .and_then(|r| r.root)
            .and_then(|root| workspace_packages.values().find(|pkg| pkg.id == root).cloned());

        let mut metadata = Self {
            workspace: Workspace {
                packages:       workspace_packages,
                targets:        workspace_targets,
            },
            selected: Selected::default(),
            target_directory:   std::mem::take(&mut metadata.target_directory),
        };

        // Validate packages

        for pkg in args.packages.iter() {
            let pkg = metadata.workspace.packages.get(pkg).unwrap_or_else(|| fatal!("no such package `{}` in workspace", pkg));
            if !args.workspace {
                assert!(metadata.selected.packages.insert(pkg.name.clone(), pkg.clone()).is_none());
            }
        }

        // Select packages

        if args.workspace {
            metadata.selected.packages = metadata.workspace.packages.iter()
                .filter(|(_name, pkg)| pkg.is_html())
                .map(|(name, pkg)| (name.clone(), pkg.clone()))
                .collect();
        } else if args.packages.is_empty() {
            // neither --workspace nor any --package s specified
            if let Some(root) = default_package.as_ref() {
                if root.is_html() {
                    metadata.selected.packages.insert(root.name.clone(), root.clone());
                }
            }
            if metadata.selected.packages.is_empty() {
                // no root, or root isn't an HTML project
                // TODO: support workspace default members?
                metadata.selected.packages = metadata.workspace.packages.iter()
                    .filter(|(_name, pkg)| pkg.is_html())
                    .map(|(name, pkg)| (name.clone(), pkg.clone()))
                    .collect();
            }
        }

        // Validate targets

        for target in args.targets.iter() {
            let pkg = metadata.workspace.targets.get(target).unwrap_or_else(|| fatal!("no such {} `{}` in workspace", target.0.as_str(), target.1));
            if !metadata.selected.packages.contains_key(&pkg.name) { fatal!("{} `{}` exists in workspace, but the package `{}` isn't selected for building", target.0.as_str(), target.1, pkg.name); }
        }

        // Select targets

        metadata.selected.targets = metadata.workspace.targets.iter()
            .filter(|((ty, name), pkg)| metadata.selected.packages.contains_key(&pkg.name) && (args.targets.contains(&(*ty, name.clone())) || match ty {
                TargetType::Bin     => args.bins,
                TargetType::Cdylib  => args.cdylibs,
                TargetType::Example => args.examples,
            }))
            .map(|((ty, name), pkg)| ((ty.clone(), name.clone()), pkg.clone()))
            .collect();

        // All done

        metadata
    }

    pub fn selected_packages(&self)             -> impl Iterator<Item = &Package> { self.selected.packages.values().map(|v| &**v) }
    pub fn selected_packages_wasi(&self)        -> impl Iterator<Item = &Package> { self.selected_packages().filter(|p| p.is_wasi()) }
    pub fn selected_packages_wasm_pack(&self)   -> impl Iterator<Item = &Package> { self.selected_packages().filter(|p| p.is_wasm_pack()) }

    pub fn selected_targets(&self) -> impl Iterator<Item = &(TargetType, String)> { self.selected.targets.keys() }

    pub fn target_directory(&self) -> &Path { self.target_directory.as_path() }
}
