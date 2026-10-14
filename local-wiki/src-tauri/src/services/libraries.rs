use std::fs;
use std::path::{Component, Path, PathBuf};

use crate::domain::explorer::ExplorerEntry;
use crate::repositories::filesystem;

//Validates and resolves the directory the user opens
pub fn open_library(path: &str) -> Result<PathBuf, String>{
    let root = fs::canonicalize(path).map_err(|error| error.to_string())?;

    if !root.is_dir(){
        return Err("Selected path is not a directory".into());
    }

    Ok(root)
}

pub fn list_directory(root: &Path, relative_path: &str,) -> Result<Vec<ExplorerEntry>, String>{
    let relative = Path::new(relative_path);

    //Only accept ordinary relative paths
    if !relative.components().all(|component| {matches!(component, Component::Normal(_))}){
        return Err("Invalid relative directory path.".into());
    }

    let requested = root.join(relative);

    //Resolve the actual location, including any symlinks
    let directory= fs::canonicalize(requested).map_err(|error| error.to_string())?;

    //Confirm resolved directory remains inside library
    if !directory.starts_with(root){
        return Err("Directory is outside the active library.".into());
    }

    if !directory.is_dir() {
        return Err("Requested path is not a directory".into());
    }

    filesystem::read_directory(&directory, root)
}