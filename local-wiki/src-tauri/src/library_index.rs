use serde::Serialize;
use std::fs;
use std::path::Path;
use tauri::State;

use crate::state::AppState;

// Represents a document or definition that can
// be referenced by another Markdown document.
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LibraryLink {
    pub term: String,
    pub relative_path: String,
    pub kind: String,
    pub aliases: Vec<String>,
}

// Exposed to the React frontend through Tauri.
#[tauri::command]
pub fn get_library_index(state: State<'_, AppState>) -> Result<Vec<LibraryLink>, String> {
    // Retrieve the currently opened library directory.
    let guard = state.active_library.lock().map_err(|e| e.to_string())?;

    let root = guard.as_ref().ok_or("No library is open")?;

    let mut links = Vec::new();

    // Recursively scan the library for Markdown files.
    scan_directory(root, root, &mut links).map_err(|e| e.to_string())?;

    // Ensure results are returned consistently.
    links.sort_by(|a, b| a.relative_path.cmp(&b.relative_path));

    Ok(links)
}

// Walks through a directory and any nested folders.
fn scan_directory(
    root: &Path,
    current: &Path,
    links: &mut Vec<LibraryLink>,
) -> std::io::Result<()> {
    for entry in fs::read_dir(current)? {
        let entry = entry?;
        let path = entry.path();

        let file_type = entry.file_type()?;

        // Skip symbolic links to avoid traversing
        // outside the selected library.
        if file_type.is_symlink() {
            continue;
        }

        let name = entry.file_name();
        let name = name.to_string_lossy();

        // Recursively traverse subdirectories.
        if file_type.is_dir() {
            // Include .def/ but ignore other hidden
            // directories such as .tags/ and .git/.
            if name.starts_with('.') && name != ".def" {
                continue;
            }

            scan_directory(root, &path, links)?;
            continue;
        }

        if !file_type.is_file() {
            continue;
        }

        // Only index Markdown files.
        let is_markdown = path
            .extension()
            .and_then(|extension| extension.to_str())
            .is_some_and(|extension| extension.eq_ignore_ascii_case("md"));

        if !is_markdown {
            continue;
        }

        // Convert the absolute path into a path
        // relative to the opened library.
        let relative = path
            .strip_prefix(root)
            .expect("Indexed file must belong to library");

        // Normalize Windows paths to forward slashes.
        let relative_path = relative.to_string_lossy().replace('\\', "/");

        // Everything inside .def/ is a definition.
        let is_definition = relative_path.starts_with(".def/");

        // Ignore the template README in .def/.
        if is_definition && name.eq_ignore_ascii_case("README.md") {
            continue;
        }

        // Use the filename without .md as the term.
        let term = path
            .file_stem()
            .and_then(|stem| stem.to_str())
            .unwrap_or("")
            .to_string();

        if term.is_empty() {
            continue;
        }

        links.push(LibraryLink {
            term,
            relative_path,

            kind: if is_definition {
                "definition".to_string()
            } else {
                "document".to_string()
            },

            // Reserved for future aliases and tags.
            aliases: Vec::new(),
        });
    }

    Ok(())
}
