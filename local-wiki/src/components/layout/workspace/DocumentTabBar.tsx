
import { useWorkspace } from "@/contexts/WorkspaceContext";

export function DocumentTabBar() {
  const {
    documents,
    activeDocument,
    activateDocument,
    closeDocument,
  } = useWorkspace();

  return (
    <div className="flex overflow-x-auto border-b border-gray-700 bg-gray-900">
      {documents.map((doc) => {
        const isActive = activeDocument?.id === doc.id;

        // Compare working content with last loaded content.
        const isDirty = doc.content !== doc.savedContent;

        return (
          <div
            key={doc.id}
            className={`
              flex shrink-0 items-center gap-3
              border-r border-gray-700 px-4 py-2
              ${isActive
                ? "bg-gray-800 text-white"
                : "bg-gray-900 text-gray-400"}
            `}
          >
            {/* Activate the selected document */}
            <button
              type="button"
              onClick={() => activateDocument(doc.id)}
              className="flex items-center gap-2"
            >
              <span>{doc.name}</span>

              {isDirty && (
                <span
                  className="text-blue-400"
                  title="Unsaved changes"
                >
                  ●
                </span>
              )}
            </button>

            {/* Close document */}
            <button
              type="button"
              onClick={() => closeDocument(doc.id)}
              className="hover:text-red-400"
              aria-label={`Close ${doc.name}`}
            >
              ×
            </button>
          </div>
        );
      })}
    </div>
  );
}
