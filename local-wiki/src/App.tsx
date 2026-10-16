import { useState } from "react";
import type { ExplorerEntry } from "./types/explorer";




import "./App.css";
import { AppShell } from "./components/layout/AppShell";
import { RawTextViewer } from "./components/editors/RawTextViewer";

export default function App(){
   const [entries, setEntries] = useState<ExplorerEntry[]>([]);
  const [libraryPath, setLibraryPath] = useState("");
  const [error, setError] = useState("");
  const [selectedFile, setSelectedFile] = useState<ExplorerEntry | null>(null);

  

 

  return (
    <main style={{ padding: 10 }}>
      <AppShell onFileSelect={setSelectedFile}>
      <RawTextViewer selectedFile={selectedFile}/>
      {/* CHILDREN */}
        <p>Opened File: {selectedFile?.name}</p>
      </AppShell>
    </main>
  );
}