
import { useCallback, useEffect, useState } from "react";
import { listen } from "@tauri-apps/api/event";

import { useWorkspace } from "@/contexts/WorkspaceContext";
import { setDocumentTags } from "@/lib/documentTags";
import { ManageTagsModal } from "@/components/features/ManageTagsModal";

export function TagManagerHost() {
  const { activeDocument, editDocument } = useWorkspace();

  const [isOpen, setIsOpen] = useState(false);

  const closeModal = useCallback(() => {
    setIsOpen(false);
  }, []);

  

  // Listen for the existing Rust menu event.
  useEffect(() => {
    let disposed = false;
    let unlisten: (() => void) | undefined;

    void listen("menu:manage-tags", () => {
      setIsOpen(true);
    })
      .then((cleanup) => {
        if (disposed) cleanup();
        else unlisten = cleanup;
      })
      .catch(console.error);

    return () => {
      disposed = true;
      unlisten?.();
    };
  }, []);

  // Close when switching documents.
  useEffect(() => {
    setIsOpen(false);
  }, [activeDocument?.id]);

  function handleApplyTags(tags: string[]) {
    if (!activeDocument) return;

    const updatedMarkdown = setDocumentTags(
      activeDocument.content,
      tags
    );

    // Uses existing dirty-state tracking and saving.
    editDocument(activeDocument.id, updatedMarkdown);
  }


useEffect(() => {
  function handleKeyDown(event: KeyboardEvent) {
    if (
      (event.ctrlKey || event.metaKey) &&
      event.shiftKey &&
      !event.altKey &&
      event.code === "KeyY"
    ) {
      event.preventDefault();
      event.stopPropagation();

      setIsOpen(true);
    }
  }

  window.addEventListener("keydown", handleKeyDown, true);

  return () => {
    window.removeEventListener("keydown", handleKeyDown, true);
  };
}, []);


  return (
    <ManageTagsModal
      isOpen={isOpen}
      onClose={closeModal}
      documentId={activeDocument?.id ?? null}
      documentContent={activeDocument?.content ?? ""}
      onApply={handleApplyTags}
    />
  );
}
