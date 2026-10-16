
import { useState, useEffect } from "react";

// Tauri plugin that opens the operating system's folder picker.
import { open } from "@tauri-apps/plugin-dialog";

// Allows React to listen for events sent by the Rust application.
import { listen } from "@tauri-apps/api/event";

// Our custom TypeScript functions that communicate with Rust.
import { openLibrary, listDirectory } from "../../lib/tauri";

// The structure of a file or folder returned by Rust.
import type { ExplorerEntry } from "../../types/explorer";

// Our reusable button component.
import { OpenLibraryButton } from "../features/OpenLibraryButton";
import { ExplorerNode } from "./ExplorerNode";

// FUTURE:
// Import ExplorerNode when you create the component.
// import { ExplorerNode } from "./ExplorerNode";

interface FileExplorerProps{
  onFileSelect: (entry: ExplorerEntry) => void;
}

export function FileExplorer({onFileSelect}: FileExplorerProps) {

  // ========================================================
  // 1. REACT STATE
  // ========================================================
  //
  // State is information React remembers between renders.
  //
  // Whenever we call a state setter, React schedules a
  // rerender so the interface reflects the updated data.


  // Holds the files and folders directly inside the
  // selected library's root directory.
  //
  // ExplorerEntry[] means an array of ExplorerEntry objects.
  //
  // Example:
  // [
  //   { name: "Definitions", relativePath: "Definitions",
  //     isDirectory: true },
  //
  //   { name: "README.md", relativePath: "README.md",
  //     isDirectory: false }
  // ]
  const [entries, setEntries] = useState<ExplorerEntry[]>([]);


  // Stores the absolute path of the currently opened library.
  //
  // Example: C:\Users\Developer\Documents\MyWiki
  //
  // An empty string means no library has been selected yet.
  const [libraryPath, setLibraryPath] = useState("");


  // Holds an error message to display when an operation fails.
  //
  // Empty string means there is currently no error.
  const [error, setError] = useState("");


  // ========================================================
  // 2. OPEN LIBRARY
  // ========================================================
  //
  // This function is our central library-opening workflow.
  //
  // It can be called by:
  //   - The Open Library button.
  //   - File -> Open Library in the native menu.
  //
  // Both actions should execute exactly the same logic.

  async function handleOpenLibrary() {
    try {

      // Clear any error left over from a previous operation.
      setError("");

      // Ask the operating system to show its folder picker.
      //
      // await means:
      // "Wait for the user to select a folder or cancel."
      const selectedPath = await open({
        directory: true,
        multiple: false,
        title: "Open Local Wiki Library",
      });


      // The dialog returns null if the user cancels.
      //
      // In that case, leave the current library unchanged.
      if (selectedPath === null) {
        return;
      }


      // IMPORTANT:
      // The folder picker only gives us a path.
      //
      // It does not automatically tell our Rust backend
      // that this directory is now the active library.
      //
      // openLibrary() calls the Rust "open_library" command,
      // which validates and stores the selected directory
      // in AppState.active_library.
      await openLibrary(selectedPath);


      // Request the immediate children of the library root.
      //
      // The empty string "" means:
      // "Start at the root of the currently opened library."
      //
      // Rust returns ExplorerEntry objects for each
      // file and folder it discovers.
      const rootEntries = await listDirectory("");


      // Save the successfully opened library path.
      //
      // React will rerender any elements displaying
      // the current library.
      setLibraryPath(selectedPath);


      // Save the root-level files and folders.
      //
      // IMPORTANT FOR EXPLORERNODE:
      //
      // FileExplorer will own ONLY these root entries.
      //
      // Individual ExplorerNode components will eventually
      // load and manage the contents of nested folders.
      setEntries(rootEntries);

    } catch (err) {

      // Store the error so React can display it.
      setError(String(err));

      // Also log it for debugging in development.
      console.error("Failed to open library:", err);
    }
  }


  // ========================================================
  // 3. NATIVE MENU EVENT LISTENER
  // ========================================================
  //
  // Rust emits "menu:open-library" when the user selects
  // File -> Open Library.
  //
  // React listens for that event and calls the same
  // handleOpenLibrary() function used by our button.

  useEffect(() => {

    // Track whether this component has been unmounted.
    let disposed = false;

    // The cleanup function returned by Tauri's listener.
    let unlisten: (() => void) | undefined;


    // Register an event listener with Tauri.
    //
    // listen() is asynchronous and returns a Promise.
    void listen("menu:open-library", () => {

      // The void keyword intentionally ignores the Promise
      // returned by our asynchronous handler.
      //
      // It does NOT mean handleOpenLibrary returns nothing.
      void handleOpenLibrary();

    }).then((removeListener) => {

      // If the component unmounted while registration
      // was happening, immediately remove the listener.
      if (disposed) {
        removeListener();
      } else {
        unlisten = removeListener;
      }

    }).catch((err) => {
      console.error("Failed to register menu listener:", err);
    });


    // Cleanup function:
    // React executes this when FileExplorer unmounts.
    //
    // Removing listeners prevents duplicate callbacks
    // and unnecessary memory usage.
    return () => {
      disposed = true;
      unlisten?.();
    };

  }, []);


  // ========================================================
  // 4. DIRECTORY NAVIGATION (MOVING TO EXPLORERNODE)
  // ========================================================
  //
  // Previously, FileExplorer contained a function named:
  //
  // handleOpenDirectory(relativePath)
  //
  // That function called listDirectory(relativePath) and
  // replaced the entire entries array.
  //
  // We no longer want that behavior.
  //
  // Instead:
  //
  // - FileExplorer displays root entries.
  // - ExplorerNode handles expansion of individual folders.
  // - Each ExplorerNode requests its own child entries.
  // - Other folders remain visible.
  //
  // Therefore, handleOpenDirectory has been removed.


  // ========================================================
  // 5. RENDER FILE EXPLORER
  // ========================================================

  return (
    <div className="flex h-full flex-col gap-2 p-3">

      {/* Display the panel heading. */}
      {libraryPath.length == 0 && 
      <h2 className="font-semibold whitespace-nowrap">
        File Explorer
        <OpenLibraryButton onClick={handleOpenLibrary} />
      </h2>
      }
      




      {/* Display the currently opened library path.
          truncate prevents long paths from overflowing. */}
      <p
        className="truncate text-xs text-gray-500"
        title={libraryPath}
      >
        {libraryPath || "No library selected"}
      </p>


      {/* Only show an error message when error isn't empty. */}
      {error && (
        <p className="text-sm text-red-500">
          {error}
        </p>
      )}



      <div className="flex min-h-0 flex-1 flex-col ">

        {entries.length > 0 && entries.map((entry) => (

          <div
            key={`${libraryPath}:${entry.relativePath}`}
            className="flex items-center gap-2 py-1"
          >
            
              <ExplorerNode
              entry={entry}
              onFileSelect={onFileSelect}
              />
          </div>

        ))}

        

      </div>
    </div>
  );
}
