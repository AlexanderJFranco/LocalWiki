use serde::Serialize;
use std::fs;
use std::path::{Component, Path, PathBuf};
use tauri::State;

use crate::domain::explorer::ExplorerEntry;
use crate::repositories::filesystem;
use crate::services::libraries as library_service;
use crate::state::AppState;
use std::io::{ErrorKind, Write};

use std::fs::OpenOptions;

#[tauri::command]
pub fn create_directory(
    state: tauri::State<'_, AppState>,
    relative_path: String,
) -> Result<(), String> {
    use std::fs;

    let library_path = {
        let active_library = state
            .active_library
            .lock()
            .map_err(|_| "Failed to lock active library")?;

        active_library
            .clone()
            .ok_or("No library is currently open")?
    };

    // Reject absolute paths and parent-directory traversal.
    let relative = std::path::Path::new(&relative_path);

    if relative.as_os_str().is_empty()
        || relative
            .components()
            .any(|component| !matches!(component, std::path::Component::Normal(_)))
    {
        return Err("Invalid directory path".to_string());
    }

    let target_path = library_path.join(relative);

    // Do not create a directory over an existing entry.
    if target_path.exists() {
        return Err("An entry with that name already exists".to_string());
    }

    fs::create_dir(&target_path).map_err(|error| format!("Failed to create directory: {error}"))?;

    Ok(())
}

#[tauri::command]
pub fn resolve_definition(state: State<'_, AppState>, target: String) -> Result<String, String> {
    let name = target.trim();
    let name = name.strip_suffix(".md").unwrap_or(name);

    // Definition names are filenames, not arbitrary paths.
    let path = Path::new(name);

    if name.is_empty()
        || path.components().count() != 1
        || !matches!(path.components().next(), Some(Component::Normal(_)))
    {
        return Err("Invalid definition name".into());
    }

    let guard = state.active_library.lock().map_err(|e| e.to_string())?;

    let root = guard
        .as_ref()
        .ok_or("No library is open")?
        .canonicalize()
        .map_err(|e| e.to_string())?;

    let definitions = root
        .join(".def")
        .canonicalize()
        .map_err(|_| "Definitions are not enabled for this library".to_string())?;

    if !definitions.starts_with(&root) {
        return Err("Invalid definitions directory".into());
    }

    let filename = format!("{name}.md");

    let file = definitions
        .join(&filename)
        .canonicalize()
        .map_err(|_| format!("Definition not found: {name}"))?;

    if !file.starts_with(&definitions) || !file.is_file() {
        return Err("Invalid definition file".into());
    }

    Ok(format!(".def/{filename}"))
}

//Resolve the target text to corresponding document in directory
#[tauri::command]
pub fn resolve_wiki_link(state: State<'_, AppState>, target: String) -> Result<String, String> {
    let target = target.trim().replace('\\', "/");
    let target = target.strip_suffix(".md").unwrap_or(&target);

    if target.is_empty()
        || target
            .split('/')
            .any(|part| part.is_empty() || part == "." || part == "..")
        || target.starts_with('/')
    {
        return Err("Invalid wiki link".into());
    }

    // Get the active library root.
    let guard = state.active_library.lock().map_err(|e| e.to_string())?;

    let root = guard
        .as_ref()
        .ok_or("No library is open")?
        .canonicalize()
        .map_err(|e| e.to_string())?;

    // Search all folders, starting at the root.
    let mut pending = vec![root.clone()];
    let mut matches = Vec::new();

    while let Some(directory) = pending.pop() {
        for item in fs::read_dir(directory).map_err(|e| e.to_string())? {
            let item = item.map_err(|e| e.to_string())?;
            let file_type = item.file_type().map_err(|e| e.to_string())?;

            // Don't follow symlinks outside the library.
            if file_type.is_symlink() {
                continue;
            }

            let path = item.path();

            if file_type.is_dir() {
                pending.push(path);
                continue;
            }

            if !file_type.is_file() || path.extension().and_then(|e| e.to_str()) != Some("md") {
                continue;
            }

            let relative = path.strip_prefix(&root).map_err(|e| e.to_string())?;

            // Normalize Windows and Unix separators.
            let relative_path = relative.to_string_lossy().replace('\\', "/");

            let relative_without_ext = relative_path.strip_suffix(".md").unwrap();

            // Explicit path: [[Programming/Ownership]]
            // Filename only: [[Ownership]]
            let is_match = if target.contains('/') {
                relative_without_ext.eq_ignore_ascii_case(target)
            } else {
                path.file_stem()
                    .and_then(|name| name.to_str())
                    .is_some_and(|name| name.eq_ignore_ascii_case(target))
            };

            if is_match {
                matches.push(relative_path);
            }
        }
    }

    match matches.len() {
        0 => Err(format!("Wiki page not found: {target}")),
        1 => Ok(matches.remove(0)),
        _ => Err(format!(
            "Multiple pages named '{target}'. Use a folder path."
        )),
    }
}

//Resolve the file at the specified path
fn resolve_entry(root: &Path, relative_path: &str) -> Result<PathBuf, String> {
    let relative = Path::new(relative_path);

    if relative.as_os_str().is_empty()
        || relative
            .components()
            .any(|part| !matches!(part, Component::Normal(_)))
    {
        return Err("Invalid path".into());
    }

    let resolved = root
        .join(relative)
        .canonicalize()
        .map_err(|e| e.to_string())?;

    if !resolved.starts_with(root) || resolved == root {
        return Err("Path is outside the library".into());
    }

    Ok(resolved)
}

#[tauri::command]
pub fn rename_entry(
    state: State<'_, AppState>,
    relative_path: String,
    new_name: String,
) -> Result<(), String> {
    // Accept a name, not a destination path.
    let name = Path::new(&new_name);

    if new_name.is_empty()
        || name.components().count() != 1
        || !matches!(name.components().next(), Some(Component::Normal(_)))
    {
        return Err("Invalid new name".into());
    }

    let guard = state.active_library.lock().map_err(|e| e.to_string())?;

    let root = guard
        .as_ref()
        .ok_or("No library is open")?
        .canonicalize()
        .map_err(|e| e.to_string())?;

    let source = resolve_entry(&root, &relative_path)?;

    let destination = source
        .parent()
        .ok_or("Missing parent directory")?
        .join(new_name);

    if destination.exists() || fs::symlink_metadata(&destination).is_ok() {
        return Err("An item with that name already exists".into());
    }

    fs::rename(source, destination).map_err(|e| format!("Rename failed: {e}"))
}

#[tauri::command]
pub fn delete_entry(state: State<'_, AppState>, relative_path: String) -> Result<(), String> {
    let guard = state.active_library.lock().map_err(|e| e.to_string())?;

    let root = guard
        .as_ref()
        .ok_or("No library is open")?
        .canonicalize()
        .map_err(|e| e.to_string())?;

    let target = resolve_entry(&root, &relative_path)?;

    if target.is_dir() {
        fs::remove_dir_all(target).map_err(|e| format!("Delete failed: {e}"))
    } else {
        fs::remove_file(target).map_err(|e| format!("Delete failed: {e}"))
    }
}

//Called when creating a document within application
#[tauri::command]
pub fn create_document(state: State<'_, AppState>, relative_path: String) -> Result<(), String> {
    let path = Path::new(&relative_path);

    // Only allow files inside the active library.
    if path.is_absolute()
        || path
            .components()
            .any(|component| !matches!(component, Component::Normal(_)))
    {
        return Err("Invalid document path".into());
    }

    // Restrict creation to Markdown files.
    if path.extension().and_then(|ext| ext.to_str()) != Some("md") {
        return Err("Document must have a .md extension".into());
    }

    let guard = state.active_library.lock().map_err(|e| e.to_string())?;

    let library = guard.as_ref().ok_or("No library is currently open")?;

    let root = library.canonicalize().map_err(|e| e.to_string())?;

    let destination = root.join(path);

    let parent = destination
        .parent()
        .ok_or("Invalid parent directory")?
        .canonicalize()
        .map_err(|e| e.to_string())?;

    // Also protects against symlinked directories escaping the library.
    if !parent.starts_with(&root) {
        return Err("Cannot create a file outside the library".into());
    }

    // create_new prevents accidentally overwriting existing files.
    OpenOptions::new()
        .write(true)
        .create_new(true)
        .open(destination)
        .map_err(|e| format!("Failed to create document: {e}"))?;

    Ok(())
}

//Called when React asks to open a workspace
#[tauri::command]
pub fn open_library(path: String, state: State<'_, AppState>) -> Result<(), String> {
    let root = library_service::open_library(&path)?;

    let mut active = state
        .active_library
        .lock()
        .map_err(|_| "Workspace state lock failed")?;

    *active = Some(root);
    Ok(())
}

#[tauri::command]
pub fn write_document(
    state: State<'_, AppState>,
    relative_path: String,
    content: String,
) -> Result<(), String> {
    // 1. Retrieve the currently opened library.
    let library_guard = state
        .active_library
        .lock()
        .map_err(|_| "Failed to lock library state".to_string())?;

    let library_path = library_guard
        .as_ref()
        .ok_or("No library is currently open")?;

    // 2. Resolve the library's actual filesystem path.
    let library_root = library_path.canonicalize().map_err(|e| e.to_string())?;

    // 3. Resolve the requested document.
    let document_path = library_root
        .join(&relative_path)
        .canonicalize()
        .map_err(|e| e.to_string())?;

    // 4. Prevent writes outside the active library.
    if !document_path.starts_with(&library_root) {
        return Err("Document is outside the active library".into());
    }

    // 5. Only permit writing existing files.
    if !document_path.is_file() {
        return Err("Document does not exist".into());
    }

    // 6. Write the updated Markdown.
    fs::write(&document_path, content).map_err(|e| format!("Failed to save document: {e}"))?;

    Ok(())
}

//Called when React needs a directory's children
#[tauri::command]
pub fn list_directory(
    relative_path: String,
    state: State<'_, AppState>,
) -> Result<Vec<ExplorerEntry>, String> {
    let active = state
        .active_library
        .lock()
        .map_err(|_| "Workspace state lock failed")?;

    let root = active.as_ref().ok_or("No library is open")?;

    library_service::list_directory(root, &relative_path)
}


// Reads a document from the currently opened library.
//
// React will call this command using:
// invoke<string>("read_document", { relativePath: "Notes/Rust.md" })
#[tauri::command]
pub fn read_document(relative_path: String, state: State<'_, AppState>) -> Result<String, String> {
    // STEP 1: Retrieve the currently selected library.
    //
    // lock() gives us access to the shared application state.
    // ? returns an error if the lock fails.
    let active = state
        .active_library
        .lock()
        .map_err(|_| "Failed to lock library state".to_string())?;

    // Get the library path, or return an error if none exists.
    //
    // clone() creates an owned PathBuf so we can release
    // the mutex before reading the filesystem.
    let root = active.as_ref().ok_or("No library is open")?.clone();

    // Release the mutex lock.
    drop(active);

    // STEP 2: Validate the path received from React.
    let relative = Path::new(&relative_path);

    if !relative
        .components()
        .all(|component| matches!(component, Component::Normal(_)))
    {
        return Err("Invalid document path".to_string());
    }

    // STEP 3: Construct and resolve the full file path.
    //
    // Example:
    // root     = C:\Wiki
    // relative = Notes\Rust.md
    // full     = C:\Wiki\Notes\Rust.md
    let full_path = root.join(relative);

    // canonicalize() resolves the actual filesystem location,
    // including any symbolic links.
    let resolved_path = fs::canonicalize(full_path).map_err(|error| error.to_string())?;

    // Make sure the resolved file remains inside our library.
    if !resolved_path.starts_with(&root) {
        return Err("File is outside the active library".to_string());
    }

    // STEP 4: Verify that the path references a file.
    if !resolved_path.is_file() {
        return Err("Selected path is not a file".to_string());
    }

    // STEP 5: Call our existing, tested repository function.
    //
    // read_file() returns Result<String, String>.
    //
    // Ok(String)  = File contents.
    // Err(String) = Error message.
    //
    // No semicolon means we return that Result directly.
    filesystem::read_file(&resolved_path)
}

const DEFINITION_TEMPLATE: &str = r#"# Local Wiki — Definitions

This directory contains reusable definitions.

Each definition is a Markdown file named after
the concept it describes.

## Example: Ownership.md

Create a file named Ownership.md containing:

---
term: Ownership
aliases:
  - Resource Ownership
---

# Ownership

Ownership describes responsibility for
managing a resource.

## Related Concepts

- {{Borrowing}}
- [[Programming/Rust]]

## Referencing Definitions

Use double curly braces in your documents:

{{Ownership}}

Or provide alternative display text:

{{Ownership|resource ownership}}

Definitions are displayed in green and will
support hover descriptions.
"#;

const TAG_TEMPLATE: &str = r#"# Local Wiki — Tags

This directory contains reusable tag descriptions.

Each tag is represented by a Markdown file.

## Example: programming.md

Create programming.md containing:

---
name: programming
description: Software development topics
---

# Programming

Notes related to software development,
programming languages, and architecture.

## Using Tags

Reference tags within ordinary Markdown:

#programming

#rust

#important

Tags will eventually support document filtering
and searching.
"#;

// Only these two directory names are supported.
fn reserved_directory(name: &str) -> Option<&'static str> {
    match name {
        ".def" => Some(DEFINITION_TEMPLATE),
        ".tags" => Some(TAG_TEMPLATE),
        _ => None,
    }
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LibraryFeatures {
    pub definitions: bool,
    pub tags: bool,
}

#[tauri::command]
pub fn check_library_directories(state: State<'_, AppState>) -> Result<LibraryFeatures, String> {
    let guard = state.active_library.lock().map_err(|e| e.to_string())?;

    let root = guard.as_ref().ok_or("No library is open")?;

    Ok(LibraryFeatures {
        definitions: fs::symlink_metadata(root.join(".def"))
            .map(|metadata| metadata.file_type().is_dir())
            .unwrap_or(false),

        tags: fs::symlink_metadata(root.join(".tags"))
            .map(|metadata| metadata.file_type().is_dir())
            .unwrap_or(false),
    })
}
// Create only the selected missing directories.
#[tauri::command]
pub fn initialize_library_directories(
    state: State<'_, AppState>,
    directories: Vec<String>,
) -> Result<(), String> {
    let guard = state.active_library.lock().map_err(|e| e.to_string())?;

    let root = guard.as_ref().ok_or("No library is open")?;

    for name in directories {
        let template = reserved_directory(&name).ok_or(format!("Unsupported directory: {name}"))?;

        let path = root.join(&name);

        // Never modify an existing directory or file.
        match fs::create_dir(&path) {
            Ok(()) => {}
            Err(error) if error.kind() == ErrorKind::AlreadyExists => {
                let metadata = fs::symlink_metadata(&path).map_err(|e| e.to_string())?;

                if metadata.file_type().is_dir() {
                    continue;
                }

                return Err(format!("{name} is not a regular directory"));
            }
            Err(error) => return Err(error.to_string()),
        }

        let readme = path.join("README.md");

        // create_new prevents overwriting an existing template.
        let mut file = OpenOptions::new()
            .write(true)
            .create_new(true)
            .open(readme)
            .map_err(|e| e.to_string())?;

        file.write_all(template.as_bytes())
            .map_err(|e| e.to_string())?;
    }

    Ok(())
}
