import { useState, useEffect } from "react";
import type { ExplorerEntry } from "./types/explorer";




import "./App.css";
import { AppShell } from "./components/layout/AppShell";
import { Workspace } from "./components/layout/workspace/Workspace";
import { useWorkspace } from "./contexts/WorkspaceContext";
import { listen } from "@tauri-apps/api/event";

function LocalWikiLayout() {
  const { openDocument } = useWorkspace();


const [tagsOpen, setTagsOpen] = useState(false);

useEffect(() => {
  let disposed = false;
  let unlisten: (() => void) | undefined;

  // Native Tools menu event.
  void listen("menu:manage-tags", () => {
    setTagsOpen(true);
    console.log(tagsOpen);
  }).then((cleanup) => {
    if (disposed) cleanup();
    else unlisten = cleanup;
  }).catch(console.error);

  // Keyboard shortcut.
  function handleKeyDown(event: KeyboardEvent) {
    if (
      (event.ctrlKey || event.metaKey) &&
      event.shiftKey &&
      event.key.toLowerCase() === "t"
    ) {
      event.preventDefault();
      setTagsOpen(true);
    }
  }

  window.addEventListener("keydown", handleKeyDown);

  return () => {
    disposed = true;
    unlisten?.();

    window.removeEventListener(
      "keydown",
      handleKeyDown
    );
  };
}, []);


  return (
    
    <AppShell onFileSelect={openDocument}>
      <Workspace />
    </AppShell>
  );
}


export default function App(){
  const [entries, setEntries] = useState<ExplorerEntry[]>([]);
  const [libraryPath, setLibraryPath] = useState("");
  const [error, setError] = useState("");
  const [selectedFile, setSelectedFile] = useState<ExplorerEntry | null>(null);
  

  

 

  return (
    <main style={{ padding: 10 }}>
    
       <LocalWikiLayout/>
   
    </main>
  );
}