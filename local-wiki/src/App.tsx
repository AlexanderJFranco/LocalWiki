import { useState } from "react";
import { open } from "@tauri-apps/plugin-dialog";

import { openLibrary, listDirectory } from "./lib/tauri";
import type { ExplorerEntry } from "./types/explorer";


import { OpenLibraryButton } from "./components/OpenLibraryButton";
import { invoke } from "@tauri-apps/api/core";


import "./App.css";

export default function App(){
   const [entries, setEntries] = useState<ExplorerEntry[]>([]);
  const [libraryPath, setLibraryPath] = useState("");
  const [error, setError] = useState("");

  // Opens the operating system's native folder picker.
  async function handleOpenLibrary() {
    try {
      setError("");

      const path = await open({
        directory: true,
        multiple: false,
        title: "Select a Local Wiki Library",
      });

      // User closed the picker without selecting a folder.
      if (path === null) return;

      // Tell Rust which directory is the active workspace.
      await openLibrary(path);

      // Fetch its immediate files and folders.
      const results = await listDirectory("");

      setLibraryPath(path);
      setEntries(results);
    } catch (err) {
      setError(String(err));
    }
  }

  // Requests the children of a selected folder.
  async function handleOpenDirectory(relativePath: string) {
    try {
      setError("");
      const results = await listDirectory(relativePath);
      setEntries(results);
    } catch (err) {
      setError(String(err));
    }
  }

  return (
    <main style={{ padding: 24 }}>
      <h1>Local Wiki</h1>

      <button onClick={handleOpenLibrary}>
        Open Library
      </button>

      <p>{libraryPath || "No library selected"}</p>

      {error && <p style={{ color: "red" }}>{error}</p>}

      <ul>
        {entries.map((entry) => (
          <li key={entry.relativePath}>
            <button
              disabled={!entry.isDirectory}
              onClick={() =>
                handleOpenDirectory(entry.relativePath)
              }
            >
              {entry.isDirectory ? "📁" : "📄"}
              {" "}
              {entry.name}
            </button>
          </li>
        ))}
      </ul>
    </main>
  );
}