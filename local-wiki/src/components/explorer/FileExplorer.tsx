
import { useState, useEffect } from "react";

// Tauri plugin that opens the operating system's folder picker.
import { open } from "@tauri-apps/plugin-dialog";

// Allows React to listen for events sent by the Rust application.
import { listen } from "@tauri-apps/api/event";

// Our custom TypeScript functions that communicate with Rust.
import { openLibrary, listDirectory, checkLibraryDirectories, initializeLibraryDirectories } from "../../lib/tauri";

// The structure of a file or folder returned by Rust.
import type { ExplorerEntry } from "../../types/explorer";

// Our reusable button component.
import { OpenLibraryButton } from "../features/OpenLibraryButton";
import { ExplorerNode } from "./ExplorerNode";
import { createDocument, deleteEntry, renameEntry } from "@/lib/tauri";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { createDefinition } from "@/lib/definitions";

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

  const {documents} = useWorkspace();
  const [refreshKey, setRefreshKey] = useState(0);

  //Check if directory has supported feature folders
  const [libraryFeatures, setLibraryFeatures] = useState({
  definitions: false,
  tags: false,
  });


  // Holds an error message to display when an operation fails.
  //
  // Empty string means there is currently no error.
  const [error, setError] = useState("");

  // Refresh the files and folders at the library root.
  async function refreshEntries() {
    const rootEntries = await listDirectory("");
    setEntries(rootEntries);
  }


async function handleCreateDefinition() {
  if (!libraryPath) {
    window.alert("Open a library first.");
    return;
  }

  const term = window.prompt(
    "Definition name:",
    ""
  );

  if (term === null) return;

  try {
    // Create the definition inside .def/.
    const relativePath = await createDefinition(term);

    // Refresh root-level explorer entries.
    await refreshEntries();

    // Open the new definition in CodeMirror.
    onFileSelect({
      name: relativePath.split("/").pop()!,
      relativePath,
      isDirectory: false,
    });

  } catch (error) {
    window.alert(`Failed to create definition: ${error}`);
  }
}



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
    setError("");

    // Open the operating system's folder picker.
    const selectedPath = await open({
      directory: true,
      multiple: false,
      title: "Open Local Wiki Library",
    });

    if (selectedPath === null) return;

    // Register the library with the Rust backend.
    await openLibrary(selectedPath);

    // Check optional features.
    let features = await checkLibraryDirectories();

    // Determine which directories need creation.
    const missing: string[] = [];

    if (!features.definitions) missing.push(".def");
    if (!features.tags) missing.push(".tags");

    // Offer initialization.
    if (missing.length > 0) {
      const shouldCreate = window.confirm(
        `Missing optional directories:\n\n${missing.join("\n")}` +
        "\n\nCreate them with example templates?"
      );

      if (shouldCreate) {
        await initializeLibraryDirectories(missing);

        // Refresh feature availability after creation.
        features = await checkLibraryDirectories();
      }
    }

// Store availability in React state.
setLibraryFeatures(features);
    

    // Update the active library in the interface.
    setLibraryPath(selectedPath);

    // Refresh the explorer, including newly created folders.
    await refreshEntries();

  } catch (err) {
    setError(String(err));
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


function isEntryOpen(entry: ExplorerEntry): boolean {
  return documents.some((doc) =>
    doc.relativePath === entry.relativePath ||
    (
      entry.isDirectory &&
      doc.relativePath.startsWith(entry.relativePath + "/")
    )
  );
}

async function handleRenameEntry(entry: ExplorerEntry) {
  if (isEntryOpen(entry)) {
    window.alert("Close affected document tabs before renaming.");
    return;
  }

  const input = window.prompt("Rename item:", entry.name);
  if (input === null) return;

  const newName = input.trim();

  if (
    !newName ||
    newName === "." ||
    newName === ".." ||
    newName.includes("/") ||
    newName.includes("\\")
  ) {
    window.alert("Invalid name.");
    return;
  }

  try {
    await renameEntry(entry.relativePath, newName);
    await refreshEntries();
    setRefreshKey((key) => key + 1);
  } catch (error) {
    window.alert(`Rename failed: ${error}`);
  }
}

async function handleDeleteEntry(entry: ExplorerEntry) {
  if (isEntryOpen(entry)) {
    window.alert("Close affected document tabs before deleting.");
    return;
  }

  const confirmed = window.confirm(
    entry.isDirectory
      ? `Permanently delete "${entry.name}" and everything inside it?`
      : `Permanently delete "${entry.name}"?`
  );

  if (!confirmed) return;

  try {
    await deleteEntry(entry.relativePath);
    await refreshEntries();
    setRefreshKey((key) => key + 1);
  } catch (error) {
    window.alert(`Delete failed: ${error}`);
  }
}


async function handleCreateDocument() {
  // Only permit creation when a library is open.
  if (!libraryPath) {
    window.alert("Please open a library first.");
    return;
  }

  const input = window.prompt(
    "New Markdown filename:",
    "Untitled.md"
  );

  if (input === null) return;

  const filename = input.trim();

  if (
    !filename ||
    filename === "." ||
    filename === ".." ||
    filename.includes("/") ||
    filename.includes("\\")
  ) {
    window.alert("Please enter a valid filename.");
    return;
  }

  const relativePath = filename.endsWith(".md")
    ? filename
    : `${filename}.md`;

  try {
    // 1. Create the file in the active library.
    await createDocument(relativePath);

    // 2. Reload the root directory into React state.
    await refreshEntries();

    // 3. Open the new file in CodeMirror.
    onFileSelect({
      name: relativePath,
      relativePath,
      isDirectory: false,
    });

  } catch (error) {
    window.alert(`Failed to create file: ${error}`);
  }
}



  // ========================================================
  // 6 RENDER FILE EXPLORER
  // ========================================================

  return (
    <div className="flex h-full flex-col gap-2 p-3">
      <button
  type="button"
  onClick={handleCreateDocument}
  className="rounded px-2 py-1 text-sm hover:bg-gray-700"
  title="New Markdown File"
>
  + New File
</button>
      {/* Display the panel heading. */}
      {libraryPath.length == 0 && 
      <h2 className="font-semibold whitespace-nowrap">
       
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
        {entries.map((entry) => (
          <div
            key={`${libraryPath}:${entry.relativePath}`}
            className="group flex items-center gap-2 py-1"
          >
            <div className="min-w-0 flex-1">
              <ExplorerNode
               key={`${entry.relativePath}:${refreshKey}`}
                entry={entry}
                onFileSelect={onFileSelect}
                onRename={handleRenameEntry}
                onDelete={handleDeleteEntry}
              />
            </div>

            
          </div>
        ))}


        

      </div>
    </div>
  );
}
