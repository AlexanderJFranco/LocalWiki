
use tauri::{
    menu::{MenuBuilder, SubmenuBuilder},
    Emitter,
};

// Creates and registers the native application menu.
//
// The AppHandle gives us access to application-wide
// functionality, including emitting events to React.
pub fn setup_menu(app: &tauri::AppHandle) -> tauri::Result<()> {
    // On macOS, the first submenu becomes the application menu.
    // On Windows/Linux, this also provides the Quit action.
    let app_menu = SubmenuBuilder::new(app, "Local Wiki")
        .text("quit", "Quit Local Wiki")
        .build()?;

    // Define the File menu and its available actions.
    // "open_library" is the internal ID of the menu item.
    let file_menu = SubmenuBuilder::new(app, "File")
        .text("open_library", "Open Library...")
        .build()?;

    // Combine the submenus into one native menu bar.
    let menu = MenuBuilder::new(app)
        //.items(&[&app_menu, &file_menu])
        .items(&[&file_menu])
        .build()?;

    // Attach the menu to the desktop application.
    app.set_menu(menu)?;

    // Register the callback invoked when a menu item is clicked.
    app.on_menu_event(|app_handle, event| {
        match event.id().0.as_str() {
            "open_library" => {
                // Notify React to execute the existing folder picker.
                if let Err(error) =
                    app_handle.emit("menu:open-library", ())
                {
                    eprintln!("Failed to emit menu event: {error}");
                }
            }

            "quit" => {
                app_handle.exit(0);
            }

            _ => {}
        }
    });

    Ok(())
}
