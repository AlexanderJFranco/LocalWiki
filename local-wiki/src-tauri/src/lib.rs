mod commands;
mod domain;
mod repositories;
mod services;
mod state;

use commands::libraries::{list_directory, open_library};
use state::AppState;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()

        // Register shared application state.
        .manage(AppState::default())

        // Keep this if you installed the dialog plugin.
        .plugin(tauri_plugin_dialog::init())

        // Keep any existing starter plugins, too.

        // Expose these Rust commands to React.
        .invoke_handler(tauri::generate_handler![
            open_library,
            list_directory,
            greet
        ])

        .run(tauri::generate_context!())
        .expect("error while running Tauri");
}

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}
/*
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![greet])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

*/
