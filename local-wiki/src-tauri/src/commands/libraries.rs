use tauri::State;
use std::fs;
use std::path::{Component, Path};

use crate::state::AppState;
use crate::services::libraries as library_service;
use crate::domain::explorer::ExplorerEntry;
use crate::repositories::filesystem;

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