use std::fs;
use std::path::Path;

use crate::domain::explorer::ExplorerEntry;

// Reads only the immediate children of a directory.
pub fn read_directory(
    directory: &Path,
    root: &Path,
) -> Result<Vec<ExplorerEntry>, String> {

    // Collect the results into a vector (like an array).
    let mut entries = Vec::new();

    // Open the directory, returning a readable error on failure.
    let items = fs::read_dir(directory)
        .map_err(|error| error.to_string())?;

    for item in items {
        let item = item.map_err(|error| error.to_string())?;

        // Get filesystem metadata for the entry.
        let file_type = item
            .file_type()
            .map_err(|error| error.to_string())?;

        // Skip symbolic links in our first implementation.
        if file_type.is_symlink() {
            continue;
        }

        // Convert the absolute file path into a library-relative path.
        let relative_path = item
            .path()
            .strip_prefix(root)
            .map_err(|error| error.to_string())?
            .to_string_lossy()
            .into_owned();

        entries.push(ExplorerEntry {
            name: item.file_name().to_string_lossy().into_owned(),
            relative_path,
            is_directory: file_type.is_dir(),
        });
    }

    // Directories first, then filenames alphabetically.
    entries.sort_by(|a, b| {
        b.is_directory
            .cmp(&a.is_directory)
            .then_with(|| a.name.to_lowercase().cmp(&b.name.to_lowercase()))
    });

    Ok(entries)
}