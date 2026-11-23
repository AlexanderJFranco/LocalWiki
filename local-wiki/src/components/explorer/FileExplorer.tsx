
import { useState, useEffect, useCallback } from "react";

// Tauri plugin that opens the operating system's folder picker.
import { open } from "@tauri-apps/plugin-dialog";

// Allows React to listen for events sent by the Rust application.
import { listen } from "@tauri-apps/api/event";

// Our custom TypeScript functions that communicate with Rust.
import { openLibrary, listDirectory, checkLibraryDirectories, initializeLibraryDirectories, getLibraryIndex, createDirectory } from "../../lib/tauri";

// The structure of a file or folder returned by Rust.
import type { ExplorerEntry } from "../../types/explorer";

// Our reusable button component.
import { OpenLibraryButton } from "../features/OpenLibraryButton";
import { ExplorerNode } from "./ExplorerNode";
import { createDocument, deleteEntry, renameEntry } from "@/lib/tauri";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useLibraryIndex } from "@/contexts/LibraryIndexContext";
import { LIBRARY_CHANGED_EVENT, notifyLibraryChanged } from "@/lib/libraryEvents";import { VscNewFile } from "react-icons/vsc";
import { FaSearch } from "react-icons/fa";


import {
  FaFolder,
  FaFileMedical,
  FaFolderPlus,
  FaSyncAlt,
  FaCompressAlt,
} from "react-icons/fa";
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
  const { refreshIndex, clearIndex } = useLibraryIndex();
  const [collapseVersion, setCollapseVersion] = useState(0);

  function handleCollapseAll() {
    setCollapseVersion((previous) => previous + 1);
  }

  const [searchQuery, setSearchQuery] = useState("");
  const [visiblePaths, setVisiblePaths] = useState<Set<string>>(
    new Set()
  );
    

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
  const refreshEntries = useCallback(async () => {
  const rootEntries = await listDirectory("");
  setEntries(rootEntries);
}, []);


useEffect(() => {
  function handleShortcut(event: KeyboardEvent) {
    const modifier = event.ctrlKey || event.metaKey;

    if (!modifier || event.altKey || event.repeat) return;

    const key = event.key.toLowerCase();

    // Open Library
    if (key === "o" && !event.shiftKey) {
      event.preventDefault();
      void handleOpenLibrary();
    }

    // New File
    if (key === "n" && !event.shiftKey) {
      event.preventDefault();
      void handleCreateDocument();
    }

    // New Directory
    if (key === "n" && event.shiftKey) {
      event.preventDefault();
      void handleCreateDirectory();
    }
  }

  window.addEventListener("keydown", handleShortcut, true);

  return () => {
    window.removeEventListener("keydown", handleShortcut, true);
  };
}, [
  handleOpenLibrary,
  handleCreateDocument,
  handleCreateDirectory,
]);

useEffect(() => {
  let cancelled = false;

  if (!searchQuery.trim()) {
    setVisiblePaths(new Set());
    return;
  }

  const timeout = window.setTimeout(async () => {
    try {
      const matches = await findMatchingPaths(
        "",
        searchQuery.trim()
      );

      if (!cancelled) {
        setVisiblePaths(matches);
      }
    } catch (error) {
      console.error("File search failed:", error);
    }
  }, 200);

  return () => {
    cancelled = true;
    window.clearTimeout(timeout);
  };
}, [searchQuery, refreshKey]);


useEffect(() => {
  function handleLibraryChanged() {
    // Refresh root-level file and folder entries.
    void refreshEntries().catch((error) => {
      console.error(
        "Failed to refresh File Explorer:",
        error
      );
    });

    // Notify existing ExplorerNode components
    // that their directory contents may have changed.
    setRefreshKey((previous) => previous + 1);
  }

  window.addEventListener(
    LIBRARY_CHANGED_EVENT,
    handleLibraryChanged
  );

  return () => {
    window.removeEventListener(
      LIBRARY_CHANGED_EVENT,
      handleLibraryChanged
    );
  };
}, [refreshEntries]);

async function findMatchingPaths(
  directoryPath: string,
  query: string
): Promise<Set<string>> {
  const visiblePaths = new Set<string>();
  const normalizedQuery = query.trim().toLowerCase();

  async function searchDirectory(path: string): Promise<boolean> {
    const children = await listDirectory(path);
    let hasMatches = false;

    for (const child of children) {
      const nameMatches = child.name
        .toLowerCase()
        .includes(normalizedQuery);

      let descendantMatches = false;

      // Search every directory, even if it is collapsed.
      if (child.isDirectory) {
        descendantMatches = await searchDirectory(
          child.relativePath
        );
      }

      // Show matching entries AND directories containing matches.
      if (nameMatches || descendantMatches) {
        visiblePaths.add(child.relativePath);
        hasMatches = true;
      }
    }

    return hasMatches;
  }

  await searchDirectory(directoryPath);

  return visiblePaths;
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
  const selectedPath = await open({
    directory: true,
    multiple: false,
  });

  if (!selectedPath) return;

  try {
    setError("");

    // 1. Open the selected library in Rust.
    await openLibrary(selectedPath);

    // 2. Check which optional directories exist.
    const features = await checkLibraryDirectories();

    // 3. Identify the missing directories.
    const missingDirectories: string[] = [];

    if (!features.definitions) {
      missingDirectories.push(".def");
    }

    if (!features.tags) {
      missingDirectories.push(".tags");
    }

    // 4. Offer to initialize the missing directories.
    if (missingDirectories.length > 0) {
      const confirmed = await window.confirm(
        `This library is missing the following directories:\n\n` +
        missingDirectories.join("\n") +
        `\n\nWould you like to create them?`
      );

      if (confirmed) {
        console.log(missingDirectories);
        await initializeLibraryDirectories(missingDirectories);
      }
    }

    // 5. Update the library state.
    clearIndex();
    setLibraryPath(selectedPath);

    // 6. Refresh the File Explorer.
    await refreshEntries();
    setRefreshKey((previous) => previous + 1);

    // 7. Rebuild the library index.
    await refreshIndex();

  } catch (error) {
    console.error("Library opening failed:", error);
    setError(String(error));
  }
}



const rootDirectoryName = libraryPath
  ?.replace(/[\\/]+$/, "")
  .split(/[\\/]/)
  .pop();

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


async function handleCreateDirectory(parentPath: string = "") {
  // Only permit creation when a library is open.
  if (!libraryPath) {
    window.alert("Please open a library first.");
    return;
  }

  const input = window.prompt(
    "New directory name:",
    "New Folder"
  );

  if (input === null) return;

  const directoryName = input.trim();

  if (
    !directoryName ||
    directoryName === "." ||
    directoryName === ".." ||
    directoryName.includes("/") ||
    directoryName.includes("\\")
  ) {
    window.alert("Please enter a valid directory name.");
    return;
  }

  const relativePath = parentPath
    ? `${parentPath}/${directoryName}`
    : directoryName;

  try {
    await createDirectory(relativePath);

    // Refresh the root and expanded nested directories.
    await refreshEntries();

    // Update indexed wiki pages if needed.
    await refreshIndex();
  } catch (error) {
    window.alert(`Failed to create directory: ${error}`);
  }
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
    await refreshDirectory();
    setRefreshKey((key) => key + 1);
  } catch (error) {
    window.alert(`Rename failed: ${error}`);
  }
}

async function refreshDirectory(){
    await refreshEntries();
    await refreshIndex();
}

async function handleDeleteEntry(entry: ExplorerEntry) {
  if (isEntryOpen(entry)) {
    window.alert("Close affected document tabs before deleting.");
    return;
  }

  const confirmed = await window.confirm(
    entry.isDirectory
      ? `Permanently delete "${entry.name}" and everything inside it?`
      : `Permanently delete "${entry.name}"?`
  );

  if (!confirmed) return;

  try {
    await deleteEntry(entry.relativePath);
    refreshDirectory();
    setRefreshKey((key) => key + 1);
    
  } catch (error) {
    window.alert(`Delete failed: ${error}`);
  }
}



async function handleCreateDocument(parentPath: string = "") {
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

  // Ensure the file has the Markdown extension.
  const fileName = filename.toLowerCase().endsWith(".md")
    ? filename
    : `${filename}.md`;

  // Construct the path relative to the library root.
  const relativePath = parentPath
    ? `${parentPath}/${fileName}`
    : fileName;

  try {
    // Create the file in the specified directory.
    await createDocument(relativePath);

    // Refresh the File Explorer and library index.
    await refreshEntries();
    await refreshIndex();

    // Open the newly created file.
    onFileSelect({
      name: fileName,
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
    
    <div className="flex h-full flex-col gap-2 px-3 py-5">
   
      {/* Display the panel heading. */}
      {libraryPath.length == 0 && 
      <h2 className="font-semibold whitespace-nowrap">
       
        <OpenLibraryButton onClick={handleOpenLibrary} />
      </h2>
      }
      




      


      {/* Only show an error message when error isn't empty. */}
      {error && (
        <p className="text-sm text-red-500">
          {error}
        </p>
      )}

      {libraryPath && (
    

    <span
      className="truncate text-sm font-semibold text-black"
      title={libraryPath}
    >
      

{libraryPath && (
  <div className="grid w-full min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-1 border-b border-gray-700 px-2 py-2">

    {/* Root directory */}
    <div
      className="flex min-w-0 items-center gap-1 overflow-hidden"
      title={libraryPath}
    >
      <FaFolder className="shrink-0 text-yellow-500" />

      <span className="min-w-0 truncate text-sm font-semibold text-Black-200">
        {rootDirectoryName}
      </span>
    </div>

    {/* Explorer actions */}
    <div className="flex shrink-0 items-center gap-0.5">

            {/* New File */}
      <button
        type="button"
        onClick={() => void handleCreateDocument()}
        title="New File"
        aria-label="New File"
        className="rounded bg-transparent p-1.5 text-gray-400 hover:bg-gray-700 hover:text-white"
      >
        <FaFileMedical size={14} />
      </button>

      {/* New Directory */}
      <button
        type="button"
        onClick={() => void handleCreateDirectory()}
        title="New Directory"
        aria-label="New Directory"
        className="rounded bg-transparent p-1.5 text-gray-400 hover:bg-gray-700 hover:text-white"
      >
        <FaFolderPlus size={14} />
      </button>

      {/* Refresh */}
      <button
        type="button"
        onClick={() => {
          void refreshEntries();
          setRefreshKey((value) => value + 1);
        }}
        title="Refresh Explorer"
        aria-label="Refresh Explorer"
        className="rounded bg-transparent p-1.5 text-gray-400 hover:bg-gray-700 hover:text-white"
      >
        <FaSyncAlt size={14} />
      </button>

      {/* Collapse All */}
      <button
        type="button"
        onClick={handleCollapseAll}
        title="Collapse All"
        aria-label="Collapse All"
        className="rounded bg-transparent p-1.5 text-gray-400 hover:bg-gray-700 hover:text-white"
      >
        <FaCompressAlt size={14} />
      </button>

    </div>
  </div>
)}

  
{/* File Explorer Search */}
<div className="relative w-full">
  <FaSearch
    className="
      pointer-events-none
      absolute left-1 top-1/2
      -translate-y-1/2
      text-sm text-gray-500
    "
  />

  <input
    id="explorer-search"
    type="text"
    value={searchQuery}
    onChange={(event) => setSearchQuery(event.target.value)}
    placeholder="Search files..."
    className="
      peer h-10 w-full
      !rounded-none !border-0
      !border-b !border-gray-400
      !bg-transparent
      pl-7 pr-7
      text-sm !text-black
      placeholder:text-gray-500
      !shadow-none outline-none
      transition-colors
      focus:!border-blue-500
      focus:!outline-none
    "
  />

  {searchQuery && (
    <button
      type="button"
      onClick={() => setSearchQuery("")}
      aria-label="Clear search"
      className="
        absolute right-1 top-1/2
        -translate-y-1/2
        !border-0 !bg-transparent
        !p-1 !text-gray-500
        hover:!text-blue-500
      "
    >
      ×
    </button>
  )}
</div>


    </span>
    
 
)}

{/* Display the currently opened library path.
          truncate prevents long paths from overflowing. */}
      <p
        className="truncate text-xs text-gray-500"
        title={libraryPath}
      >
        {libraryPath || ""}
      </p>

      <div className="flex min-h-0 flex-1 flex-col ">
        {entries.map((entry) => {
  const isVisible =
    !searchQuery.trim() ||
    visiblePaths.has(entry.relativePath);

  return (
    <div
      key={entry.relativePath}
      className={isVisible ? "" : "hidden"}
    >
      <ExplorerNode
        entry={entry}
        refreshVersion={refreshKey}
        collapseVersion={collapseVersion}
        searchQuery={searchQuery}
        visiblePaths={visiblePaths}
        onFileSelect={onFileSelect}
        onRename={handleRenameEntry}
        onDelete={handleDeleteEntry}
        onCreateFile={handleCreateDocument}
        onCreateDirectory={handleCreateDirectory}
      />
    </div>
  );
})}


        

      </div>
    </div>
  );
}
