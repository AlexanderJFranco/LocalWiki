
import { useEffect, useState } from "react";
import type { ExplorerEntry } from "@/types/explorer";
import { readDocument } from "@/lib/tauri";

interface RawTextViewerProps {
    selectedFile: ExplorerEntry | null;
}

export function RawTextViewer({ selectedFile }: RawTextViewerProps) {

    // Holds the text retrieved from our Rust backend.
    const [fileData, setFileData] = useState("");

    // Runs whenever the selected file changes.
    useEffect(() => {
        // Clear the previously displayed file.
        setFileData("");

        // No file selected? Nothing to read.
        if (!selectedFile) return;

        let cancelled = false;

        // Async function to retrieve the file's contents.
        async function loadFile() {
            try {
                // Ask Rust to read this document.
                const text = await readDocument(selectedFile!.relativePath);

                // Update React state when the result arrives.
                if (!cancelled) {
                    setFileData(text);
                }
            } catch (error) {
                console.error("Failed to read document:", error);
            }
        }

        void loadFile();

        // Ignore an old request if another file is selected.
        return () => {
            cancelled = true;
        };
    }, [selectedFile?.relativePath]);

    return (
        <div>
            <h2>{selectedFile?.name ?? "No file selected"}</h2>

            {/* pre preserves spaces and line breaks in raw text. */}
            <pre className="whitespace-pre-wrap">
                {fileData}
            </pre>
        </div>
    );
}
