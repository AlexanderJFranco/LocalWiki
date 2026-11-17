use tauri::State;
use std::fs;
use std::path::{Component, Path};

use crate::state::AppState;
use crate::services::libraries as library_service;
use crate::domain::explorer::ExplorerEntry;
use crate::repositories::filesystem;

use std::fs::OpenOptions;


//Called when creating a document within application

#[tauri::command]
pub fn create_document(
    state: State<'_, AppState>,
    relative_path: String,
) -> Result<(), String> {
    let path = Path::new(&relative_path);

    // Only allow files inside the active library.
    if path.is_absolute()
        || path.components().any(|component| {
            !matches!(component, Component::Normal(_))
        })
    {
        return Err("Invalid document path".into());
    }

    // Restrict creation to Markdown files.
    if path.extension().and_then(|ext| ext.to_str()) != Some("md") {
        return Err("Document must have a .md extension".into());
    }

    let guard = state
        .active_library
        .lock()
        .map_err(|e| e.to_string())?;

    let library = guard
        .as_ref()
        .ok_or("No library is currently open")?;

    let root = library.canonicalize()
        .map_err(|e| e.to_string())?;

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
pub fn open_library(
    path: String,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let root = library_service::open_library(&path)?;

    let mut active = state.active_library
    .lock()
    .map_err(|_| "Workspace state lock failed")?;

    *active = Some(root);
    Ok(())
}

#[tauri::command]
pub fn write_document(
    state: State<'_,AppState>,
    relative_path: String,
    content: String,
    ) -> Result<(), String>{

        // 1. Retrieve the currently opened library.
        let library_guard = state
            .active_library
            .lock()
            .map_err(|_| "Failed to lock library state".to_string())?;

        let library_path = library_guard
            .as_ref()
            .ok_or("No library is currently open")?;

        // 2. Resolve the library's actual filesystem path.
        let library_root = library_path
            .canonicalize()
            .map_err(|e| e.to_string())?;

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
        fs::write(&document_path, content)
            .map_err(|e| format!("Failed to save document: {e}"))?;

        Ok(())
    }

//Called when React needs a directory's children
#[tauri::command]
pub fn list_directory(
    relative_path: String,
    state: State<'_, AppState>,
) -> Result<Vec<ExplorerEntry>, String> {

    let active = state.active_library.lock()
    .map_err(|_| "Workspace state lock failed")?;

    let root = active
    .as_ref()
    .ok_or("No library is open")?;

    library_service::list_directory(root, &relative_path)
}

#[tauri::command]
pub fn read_from_document(
    path: String,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let root = library_service::open_library(&path)?;

    let mut active = state.active_library
    .lock()
    .map_err(|_| "Workspace state lock failed")?;

    *active = Some(root);
    Ok(())
}


// Reads a document from the currently opened library.
//
// React will call this command using:
// invoke<string>("read_document", { relativePath: "Notes/Rust.md" })
#[tauri::command]
pub fn read_document(
    relative_path: String,
    state: State<'_, AppState>,
) -> Result<String, String> {

    // STEP 1: Retrieve the currently selected library.
    //
    // lock() gives us access to the shared application state.
    // ? returns an error if the lock fails.
    let active = state.active_library
        .lock()
        .map_err(|_| "Failed to lock library state".to_string())?;

    // Get the library path, or return an error if none exists.
    //
    // clone() creates an owned PathBuf so we can release
    // the mutex before reading the filesystem.
    let root = active
        .as_ref()
        .ok_or("No library is open")?
        .clone();

    // Release the mutex lock.
    drop(active);

    // STEP 2: Validate the path received from React.
    let relative = Path::new(&relative_path);

    if !relative.components().all(|component| {
        matches!(component, Component::Normal(_))
    }) {
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
    let resolved_path = fs::canonicalize(full_path)
        .map_err(|error| error.to_string())?;

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