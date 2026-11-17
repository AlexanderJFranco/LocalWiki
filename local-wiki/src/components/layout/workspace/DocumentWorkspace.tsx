
import { TextEditor } from "@/components/editors/TextEditor";
import { useWorkspace } from "@/contexts/WorkspaceContext";

import { ViewModeToolbar } from "@/components/layout/workspace/ViewModeToolbar";
import { MarkdownPreview } from "@/components/layout/workspace/MarkdownPreview";
import { resolveWikiLink } from "@/lib/tauri";
import { useCallback, useEffect } from "react";

export function DocumentWorkspace() {
  const {
    activeDocument,
    editDocument,
    setViewMode,
    saveDocument,
    openDocument,
  } = useWorkspace();


useEffect(() => {
  const documentId = activeDocument?.id;

  if (!documentId) return;

  function handleKeyDown(event: KeyboardEvent) {
    const isSaveShortcut =
      (event.ctrlKey || event.metaKey) &&
      event.key.toLowerCase() === "s";

    if (!isSaveShortcut) return;

    // Prevent the browser/webview's default save behavior.
    event.preventDefault();

    void saveDocument(documentId!).catch(console.error);
  }

  window.addEventListener("keydown", handleKeyDown);

  return () => {
    window.removeEventListener("keydown", handleKeyDown);
  };
}, [activeDocument?.id, saveDocument]);



const handleNavigate = useCallback(
  async (target: string) => {
    try {
      // Ask Rust to find the linked Markdown file.
      const relativePath = await resolveWikiLink(target);

      const name = relativePath.split("/").pop()!;

      // Open through the existing workspace.
      await openDocument({
        name,
        relativePath,
        isDirectory: false,
      });
    } catch (error) {
      window.alert(String(error));
    }
  },
  [openDocument]
);

  // No document currently selected.
  if (!activeDocument) {
    return (
      <div className="flex h-full items-center justify-center text-gray-500">
        Select a Markdown document from the explorer.
      </div>
    );
  }

  // Wait for the Rust file read to finish.
  if (activeDocument.isLoading) {
    return <div className="p-4">Loading document...</div>;
  }

  if (activeDocument.error) {
    return (
      <div className="p-4 text-red-400">
        Failed to load: {activeDocument.error}
      </div>
    );
  }

  const isDirty =
  activeDocument.content !== activeDocument.savedContent;



  const { id, content, viewMode } = activeDocument;

  return (
    
    <div className="flex h-full min-h-0 flex-col">


<div className="flex items-center justify-between border-b border-gray-700 px-3 py-2">
  <span className="text-sm text-gray-400">
    {activeDocument.isSaving
      ? "Saving..."
      : isDirty
        ? "Unsaved changes"
        : "Saved"}
  </span>

  <button
    type="button"
    disabled={
      !isDirty || activeDocument.isSaving
    }
    onClick={() =>
      void saveDocument(activeDocument.id).catch(console.error)
    }
    className="rounded bg-blue-600 px-3 py-1 text-sm text-white disabled:cursor-not-allowed disabled:opacity-40"
  >
    Save
  </button>
</div>

{activeDocument.saveError && (
  <p role="alert" className="px-3 py-2 text-sm text-red-400">
    Save failed: {activeDocument.saveError}
  </p>
)}

<ViewModeToolbar
  mode={activeDocument.viewMode}
  onModeChange={(mode) =>
    setViewMode(activeDocument.id, mode)
  }
/>


      {/* Source and/or preview panels */}
      <div className="flex min-h-0 flex-1 overflow-hidden">

        {/* Raw Markdown editor */}
        {viewMode !== "preview" && (
          <div className="min-w-0 flex-1 overflow-hidden">
            <TextEditor
              key={id}
              content={content}
              onChange={(value: string) =>
                editDocument(activeDocument.id, value)
              }
              onNavigate={handleNavigate}
            />
          </div>
        )}

        {/* Divider in split mode */}
        {viewMode === "split" && (
          <div className="w-px shrink-0 bg-gray-700" />
        )}

        {/* Formatted Markdown preview */}
        {viewMode !== "source" && (
          <div className="min-w-0 flex-1 overflow-hidden">
            <MarkdownPreview content={content}
            onNavigate={handleNavigate} />
          </div>
        )}

      </div>
    </div>
  );
}
