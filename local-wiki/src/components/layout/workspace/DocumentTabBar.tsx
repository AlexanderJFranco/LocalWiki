
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useEffect, useRef } from "react";
import { ask } from "@tauri-apps/plugin-dialog";

export function DocumentTabBar() {
  const {
    documents,
    activeDocument,
    activateDocument,
    closeDocument,
  } = useWorkspace();

  const tabsRef = useRef<HTMLDivElement>(null);

  // Confirm before closing a document with unsaved changes.
  async function handleCloseDocument(
    id: string,
    content: string,
    savedContent: string
  ) {
    const isDirty = content !== savedContent;

    if (isDirty) {
      const shouldClose = await ask(
        "This document has unsaved changes. Close without saving?",
        {
          title: "Unsaved Changes",
          kind: "warning",
          okLabel: "Close",
          cancelLabel: "Cancel",
        }
      );

      if (!shouldClose) return;
    }

    closeDocument(id);
  }

  // Translate vertical mouse-wheel movement into horizontal
  // scrolling when hovering over the document tab bar.
  useEffect(() => {
    const container = tabsRef.current;

    if (!container) return;

    function handleWheel(event: WheelEvent) {
      if (!container) return;

      const maxScroll =
        container.scrollWidth - container.clientWidth;

      // Do nothing if all tabs are already visible.
      if (maxScroll <= 0) return;

      // Allow native horizontal trackpad gestures.
      if (Math.abs(event.deltaX) > Math.abs(event.deltaY)) {
        return;
      }

      const nextScroll = Math.max(
        0,
        Math.min(
          maxScroll,
          container.scrollLeft + event.deltaY
        )
      );

      if (nextScroll === container.scrollLeft) return;

      event.preventDefault();
      container.scrollLeft = nextScroll;
    }

    container.addEventListener("wheel", handleWheel, {
      passive: false,
    });

    return () => {
      container.removeEventListener("wheel", handleWheel);
    };
  }, []);

  return (
    <div
      ref={tabsRef}
      className="
        horizontal-scroll
        flex h-10 min-w-0
        overflow-x-auto overflow-y-hidden
        rounded-2xl bg-gray-300
      "
    >
      {documents.map((document) => {
        const isActive = activeDocument?.id === document.id;
        const isDirty =
          document.content !== document.savedContent;

        return (
          <div
            key={document.id}
            className={`
              group flex h-10 max-w-56 shrink-0
              items-center border-r border-gray-500
              hover:bg-blue-200
              ${isActive ? "bg-blue-500" : "bg-gray-400"}
            `}
          >
            {/* Document selection */}
            <button
              type="button"
              onClick={() => activateDocument(document.id)}
              className="
                !flex !min-w-0 !flex-1 !items-center !gap-2
                !border-0 !rounded-none !bg-transparent
                !px-3 !py-2 !shadow-none
                hover:!bg-transparent
                focus:!outline-none
              "
            >
              <span className="text-blue-900">◇</span>

              <span className="truncate text-sm font-medium !text-black">
                {document.name}
              </span>

              {isDirty && (
                <span
                  title="Unsaved changes"
                  className="text-red-700"
                >
                  ●
                </span>
              )}
            </button>

            {/* Close button */}
            <button
              type="button"
              onClick={() =>
                void handleCloseDocument(
                  document.id,
                  document.content,
                  document.savedContent
                )
              }
              aria-label={`Close ${document.name}`}
              className="
                !mr-2 !border-0 !rounded-none
                !bg-transparent !p-1 !shadow-none
                !text-black
                !opacity-0
                group-hover:!opacity-100
                group-focus-within:!opacity-100
                focus:!opacity-100
                hover:!bg-transparent
                focus:!outline-none
              "
            >
              ×
            </button>
          </div>
        );
      })}
    </div>
  );
}
