//Imports

mod commands;
mod domain;
mod repositories;
mod services;           
mod state;              //Manage Directory state
mod menu;               //Manage sub-menus

use commands::libraries::{list_directory, open_library, read_document};
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
            read_document
        ])

        .run(tauri::generate_context!())
        .expect("error while running Tauri");
}

