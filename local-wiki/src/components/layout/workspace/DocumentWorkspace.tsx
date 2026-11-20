
import { TextEditor } from "@/components/editors/TextEditor";
import { useWorkspace } from "@/contexts/WorkspaceContext";

import { ViewModeToolbar } from "@/components/layout/workspace/ViewModeToolbar";
import { MarkdownPreview } from "@/components/layout/workspace/MarkdownPreview";
import { resolveWikiLink } from "@/lib/tauri";
import { resolveDefinition } from "@/lib/tauri";
import { useCallback, useEffect, useState } from "react";
import { getDocumentTags, setDocumentTags } from "@/lib/documentTags";
import { getTags } from "@/lib/tags";
import type { LibraryEntryKind } from "@/types/libraryIndex";
import type { WikiTag } from "@/types/tag";

import { LIBRARY_CHANGED_EVENT } from "@/lib/libraryEvents";

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


  const [availableTags, setAvailableTags] =
    useState<WikiTag[]>([]);

  
useEffect(() => {
  function handleSaveShortcut(event: KeyboardEvent) {
    if (
      (event.ctrlKey || event.metaKey) &&
      !event.shiftKey &&
      event.key.toLowerCase() === "s"
    ) {
      event.preventDefault();

      if (!activeDocument) return;

      void saveDocument(activeDocument.id);
    }
  }

  window.addEventListener(
    "keydown",
    handleSaveShortcut,
    true
  );

  return () => {
    window.removeEventListener(
      "keydown",
      handleSaveShortcut,
      true
    );
  };
}, [activeDocument?.id, saveDocument]);


  useEffect(() => {
    let cancelled = false;

    async function loadTags() {
      try {
        const result = await getTags();

        if (!cancelled) {
          setAvailableTags(result);
        }
      } catch (error) {
        console.error("Failed to load tags:", error);

        if (!cancelled) {
          setAvailableTags([]);
        }
      }
    }

    function handleLibraryChanged() {
      void loadTags();
    }

    void loadTags();

    window.addEventListener(
      LIBRARY_CHANGED_EVENT,
      handleLibraryChanged
    );

    return () => {
      cancelled = true;

      window.removeEventListener(
        LIBRARY_CHANGED_EVENT,
        handleLibraryChanged
      );
    };
  }, [activeDocument?.id]);


const handleOpenIndexedLink = useCallback(
  async (
    relativePath: string,
    kind: LibraryEntryKind
  ) => {
    try {
      // Example:
      // ".def/Ownership.md" -> "Ownership.md"
      // "Programming/Rust.md" -> "Rust.md"
      const name = relativePath.split("/").pop()!;

      // Reuse the existing workspace tab management.
      await openDocument({
        name,
        relativePath,
        isDirectory: false,
      });

    } catch (error) {
      console.error(
        `Failed to open ${kind}:`,
        error
      );

      window.alert(
        `Unable to open ${kind}: ${relativePath}`
      );
    }
  },
  [openDocument]
);


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


const handleDefinitionNavigate = useCallback(
  async (target: string) => {
    try {
      const relativePath = await resolveDefinition(target);

      const name = relativePath.split("/").pop()!;

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

 
  const documentTags = getDocumentTags(activeDocument.content);

  const tagMap = new Map(
    availableTags.map((tag) => [
      tag.name.toLowerCase(),
      tag,
    ])
  );

  const isDirty =
  activeDocument.content !== activeDocument.savedContent;



  const { id, content, viewMode } = activeDocument;

  return (
    
    <div className="flex h-full min-h-0 flex-col">

{/*}
    <div className="flex items-center justify-between border-b border-gray-700 px-3 py-2">
      <span className="text-sm text-gray-400">
        {activeDocument.isSaving
          ? "Saving..."
          : isDirty
            ? "Unsaved changes"
            : "Saved"}
      </span>

    </div>
    */}

    {activeDocument.saveError && (
      <p role="alert" className="px-3 py-2 text-sm text-red-400">
        Save failed: {activeDocument.saveError}
      </p>
    )}

    
{/* Document toolbar: Tags + View Mode */}
<div className="flex min-w-0 items-center justify-between gap-4  px-4 py-2">

  {/* Document tags - Left */}
  <div className="flex min-w-0 flex-1 items-center gap-2 overflow-x-auto">
    {documentTags.map((tagName) => {
      const tag = tagMap.get(tagName);
      const color = tag?.color ?? "#A855F7";

      return (
        <span
          key={tagName}
          className="shrink-0 rounded-md border px-2 py-1 text-xs font-medium"
          style={{
            color,
            borderColor: color,
            backgroundColor: `${color}18`,
          }}
        >
          #{tagName}
        </span>
      );
    })}
  </div>

  {/* View mode buttons - Right */}
  <div className="shrink-0">
    <ViewModeToolbar
      mode={activeDocument.viewMode}
      onModeChange={(mode) =>
        setViewMode(activeDocument.id, mode)
      }
    />
  </div>

</div>



      {/* Source and/or preview panels */}
      <div className="flex min-h-0 min-w-0 flex-1 gap-4 overflow-hidden p-3">

        {/* Raw Markdown editor */}
       
    {viewMode !== "preview" && (
      <div className="flex min-h-0 min-w-0 flex-1 flex-col
        overflow-hidden rounded-3xl
        bg-white text-gray-900 
      ">
        <TextEditor
          key={id}
          content={content}
          onChange={(value: string) =>
            editDocument(activeDocument.id, value)
          }
          onNavigate={handleNavigate}
          onNavigateDefinition={handleDefinitionNavigate}
          onOpenIndexedLink={handleOpenIndexedLink}
        />
      </div>
    )}


       

        {/* Formatted Markdown preview */}
        {viewMode !== "source" && (
          <div className="flex min-h-0 min-w-0 flex-1 flex-col
        overflow-hidden rounded-3xl
        bg-white text-gray-900 shadow-lg
      ">
            <MarkdownPreview content={content}
            onNavigate={handleNavigate}
            onNavigateDefinition={handleDefinitionNavigate}
            onOpenIndexedLink={handleOpenIndexedLink} />
          </div>
        )}

      </div>
    </div>
  );
}
