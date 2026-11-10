
import { SetStateAction, useEffect, useState } from "react";
import CodeMirror from "@uiw/react-codemirror";
import { markdown } from "@codemirror/lang-markdown";

import { ExplorerEntry } from "@/types/explorer";
import { readDocument } from "@/lib/tauri";

interface OldTextEditorProps {
  selectedFile: ExplorerEntry | null;
}

export function OldTextEditor({ selectedFile }: OldTextEditorProps) {
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadFile() {
      if (!selectedFile || selectedFile.isDirectory) {
        setContent("");
        setError(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      setContent("");

      try {
        // Call the existing Tauri/Rust read command.
        const text = await readDocument(selectedFile.relativePath);

        // Ignore results from an obsolete file selection.
        if (!cancelled) {
          setContent(text);
        }
      } catch (err) {
        if (!cancelled) {
          setError(String(err));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadFile();

    return () => {
      cancelled = true;
    };
  }, [selectedFile?.relativePath, selectedFile?.isDirectory]);

  if (!selectedFile || selectedFile.isDirectory) {
    return <div>Select a document to begin editing.</div>;
  }

  if (loading) {
    return <div>Loading document...</div>;
  }

  if (!selectedFile) {
    return <div>No file selected</div>;
  }

  if (error) {
    return <div className="text-red-500">{error}</div>;
  }

  return (
    <div className="flex h-full flex-col">
      <header className="border-b p-3">
        <h2 className="font-semibold">{selectedFile.name}</h2>
      </header>

      <div className="min-h-0 flex-1 overflow-auto">
        <CodeMirror
          key={selectedFile.relativePath}
          value={content}
          height="100%"
          extensions={[markdown()]}
          onChange={(value: string) => setContent(value)}
        />
      </div>
    </div>
  );
}
