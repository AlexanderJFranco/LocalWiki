
import { TextEditor } from "@/components/editors/TextEditor";
import { useWorkspace } from "@/contexts/WorkspaceContext";

import { ViewModeToolbar } from "@/components/layout/workspace/ViewModeToolbar";
import { MarkdownPreview } from "@/components/layout/workspace/MarkdownPreview";

export function DocumentWorkspace() {
  const {
    activeDocument,
    editDocument,
    setViewMode,
  } = useWorkspace();

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

  const { id, content, viewMode } = activeDocument;

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* Existing display mode controls */}
      <ViewModeToolbar
        mode={viewMode}
        onModeChange={(mode) => setViewMode(id, mode)}
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
                editDocument(id, value)
              }
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
            <MarkdownPreview content={content} />
          </div>
        )}

      </div>
    </div>
  );
}
