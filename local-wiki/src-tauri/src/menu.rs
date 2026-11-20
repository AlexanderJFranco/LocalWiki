
use tauri::{
    menu::{MenuBuilder, SubmenuBuilder, MenuItemBuilder},
    Emitter,
};

// Creates and registers the native application menu.
pub fn setup_menu(app: &tauri::AppHandle) -> tauri::Result<()> {

    // ============================================
    // 1. APPLICATION MENU
    // ============================================

    let quit = MenuItemBuilder::with_id(
        "quit",
        "Quit Local Wiki",
    )
    .accelerator("Mod + Q")
    .build(app)?;

    let app_menu = SubmenuBuilder::new(app, "Local Wiki")
        .item(&quit)
        .build()?;


    // ============================================
    // 2. FILE MENU ITEMS
    // ============================================

    // Open an existing library.
    let open_library = MenuItemBuilder::with_id(
    "open_library",
    "Open Library...",
)
.accelerator("CmdOrCtrl+O")
.build(app)?;

    // Create a Markdown file in the library root.
    let new_file = MenuItemBuilder::with_id(
    "new_file",
    "New File",
)
.accelerator("CmdOrCtrl+N")
.build(app)?;

   let new_directory = MenuItemBuilder::with_id(
    "new_directory",
    "New Directory",
)
.accelerator("CmdOrCtrl+Shift+N")
.build(app)?;

    // Build the File submenu.
    let file_menu = SubmenuBuilder::new(app, "File")
        .item(&open_library)
        .separator()
        .item(&new_file)
        .item(&new_directory)
        .build()?;


    // ============================================
    // 3. TAGS MENU
    // ============================================

    let open_tags_manager = MenuItemBuilder::with_id(
    "open_tags_manager",
    "Open Tags Manager...",
)
.accelerator("CmdOrCtrl+Shift+Y")
.build(app)?;

    let tags_menu = SubmenuBuilder::new(app, "Tags")
        .item(&open_tags_manager)
        .build()?;


    // ============================================
    // 4. REGISTER APPLICATION MENU
    // ============================================

    let menu = MenuBuilder::new(app)
        .items(&[
            &app_menu,
            &file_menu,
            &tags_menu,
        ])
        .build()?;

    app.set_menu(menu)?;


    // ============================================
    // 5. HANDLE MENU EVENTS
    // ============================================

    app.on_menu_event(|app_handle, event| {

        match event.id().0.as_str() {

            // Open Library
            "open_library" => {
                if let Err(error) =
                    app_handle.emit("menu:open-library", ())
                {
                    eprintln!(
                        "Failed to emit open library event: {error}"
                    );
                }
            }

            // New File
            "new_file" => {
                if let Err(error) =
                    app_handle.emit("menu:new-file", ())
                {
                    eprintln!(
                        "Failed to emit new file event: {error}"
                    );
                }
            }

            // New Directory
            "new_directory" => {
                if let Err(error) =
                    app_handle.emit("menu:new-directory", ())
                {
                    eprintln!(
                        "Failed to emit new directory event: {error}"
                    );
                }
            }

            // Tags Manager
            "open_tags_manager" => {
                if let Err(error) =
                    app_handle.emit("menu:manage-tags", ())
                {
                    eprintln!(
                        "Failed to emit tags manager event: {error}"
                    );
                }
            }

            // Quit Application
            "quit" => {
                app_handle.exit(0);
            }

            _ => {}
        }
    });

    Ok(())
}
