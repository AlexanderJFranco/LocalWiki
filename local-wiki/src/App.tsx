import { useState } from "react";
import type { ExplorerEntry } from "./types/explorer";




import "./App.css";
import { AppShell } from "./components/layout/AppShell";
import { RawTextViewer } from "./components/editors/RawTextViewer";
import { OldTextEditor } from "./components/editors/OLDTEXTVIEWER";
import { TextEditor } from "./components/editors/TextEditor";
import { Workspace } from "./components/layout/workspace/Workspace";
import { useWorkspace } from "./contexts/WorkspaceContext";

import { WorkspaceProvider } from "./contexts/WorkspaceContext";


function LocalWikiLayout() {
  const { openDocument } = useWorkspace();

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