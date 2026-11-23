//Imports

mod commands;
mod domain;
mod library_index;
mod menu; //Manage sub-menus
mod repositories;
mod services;
mod state; //Manage Directory state

use commands::libraries::{
    check_library_directories, create_directory, create_document, delete_entry,
    initialize_library_directories, list_directory, open_library, read_document, rename_entry,
    resolve_definition, resolve_wiki_link, write_document,
};
use library_index::get_library_index;
use state::AppState;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        // Register shared application state.
        .manage(AppState::default())
        // Keep this if you installed the dialog plugin.
        .plugin(tauri_plugin_dialog::init())
        // Configure the native desktop menu.
        .setup(|app| {
            menu::setup_menu(app.handle())?;
            Ok(())
        })
        // Expose these Rust commands to React.
        .invoke_handler(tauri::generate_handler![
            open_library,
            list_directory,
            read_document,
            write_document,
            create_document,
            rename_entry,
            delete_entry,
            resolve_wiki_link,
            check_library_directories,
            initialize_library_directories,
            resolve_definition,
            get_library_index,
            create_directory,
        ])
        .run(tauri::generate_context!())
        .expect("error while running Tauri");
}
