use tauri::State;

use crate::state::AppState;
use crate::services::libraries as library_service;
use crate::domain::explorer::ExplorerEntry;

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
