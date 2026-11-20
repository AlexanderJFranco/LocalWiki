
import CodeMirror from "@uiw/react-codemirror";
import { markdown } from "@codemirror/lang-markdown";
import { wikiLinkCommands } from "./extensions/wiki-links/wikiLinkCommands";
import { wikiLinkNavigation } from "./extensions/wiki-links/wikiLinkNavigation";
import { wikiLinkDecorations } from "@/components/editors/extensions/wiki-links/wikiLinkDecorations";
import { implicitWikiLinks } from "./extensions/wiki-links/implicitWikiLinks";
import { definitionCommands, DefinitionRequest, DefinitionMode } from "./extensions/definitions/definitionCommand";
import { definitionDecorations } from "./extensions/definitions/definitionDecorations";
import { definitionNavigation } from "@/components/editors/extensions/definitions/definitionNavigation";
import { useMemo, useRef, useState, useCallback } from "react";
import { EditorView } from "@codemirror/view";
import { DefinitionPopover } from "@/components/editors/DefinitionPopover";
import { createDefinition } from "@/lib/definitions";
import { useLibraryIndex } from "@/contexts/LibraryIndexContext";
import type { LibraryEntryKind } from "@/types/libraryIndex";






interface TextEditorProps {
  content: string;
  onChange: (value: string) => void;

  // Existing explicit wiki navigation.
  onNavigate?: (target: string) => void;

  // Existing explicit definition navigation.
  onNavigateDefinition?: (target: string) => void;

  // NEW: Navigation to files discovered through
  // the library-wide index.
  onOpenIndexedLink?: (
    relativePath: string,
    kind: LibraryEntryKind
  ) => void;
}

export function TextEditor({
  content,
  onChange,
  onNavigate,
  onNavigateDefinition,
  onOpenIndexedLink,
}: TextEditorProps) {


interface PendingDefinition {
  request: DefinitionRequest;
  mode: DefinitionMode;
  document: EditorView["state"]["doc"];
  x: number;
  y: number;
}

const editorViewRef = useRef<EditorView | null>(null);


const [pendingDefinition, setPendingDefinition] =
  useState<PendingDefinition | null>(null);

const [definitionError, setDefinitionError] =
  useState<string | null>(null);

// Insert a reference only if the document has not
// changed since the definition action began.
const insertDefinitionReference = useCallback(
  (
    view: EditorView,
    request: DefinitionRequest,
    originalDoc: EditorView["state"]["doc"],
    term: string
  ) => {
    if (view.state.doc !== originalDoc) {
      throw new Error(
        "The document changed during definition creation. " +
        "The definition file was created, but the reference " +
        "was not inserted."
      );
    }

    view.dispatch({
      changes: {
        from: request.from,
        to: request.to,
        insert: `{{${term}}}`,
      },
    });
  },
  []
);

const handleDefinitionRequest = useCallback(
  (
    request: DefinitionRequest,
    mode: DefinitionMode
  ) => {
    const view = editorViewRef.current;
    if (!view) return;

    setDefinitionError(null);

    const originalDoc = view.state.doc;

    // Quick creation with a selected term:
    // create the file without opening the popover.
    if (mode === "quick" && request.term) {
      void (async () => {
        try {
          await createDefinition(request.term);

          insertDefinitionReference(
            view,
            request,
            originalDoc,
            request.term
          );

          view.focus();
        } catch (error) {
          setDefinitionError(String(error));
        }
      })();

      return;
    }

    // Full creation, or quick creation without
    // a selected term: open the popover.
    const position = view.coordsAtPos(request.from);

    const x = Math.max(
      8,
      Math.min(
        position?.left ?? 8,
        window.innerWidth - 336
      )
    );

    const y = Math.max(
      8,
      Math.min(
        (position?.bottom ?? 8) + 8,
        window.innerHeight - 360
      )
    );

    setPendingDefinition({
      request,
      mode,
      document: originalDoc,
      x,
      y,
    });
  },
  [insertDefinitionReference]
);

const scrollTheme = EditorView.theme({
  "&": {
    height: "100%",
  },
  ".cm-scroller": {
    overflow: "auto",
  },
});


async function handleCreateDefinition(
  term: string,
  description: string
) {
  const pending = pendingDefinition;
  const view = editorViewRef.current;

  if (!pending || !view) {
    throw new Error("No active definition request.");
  }

  // Check BEFORE writing the definition file.
  if (view.state.doc !== pending.document) {
    throw new Error(
      "The document changed. Cancel and try again."
    );
  }

  await createDefinition(term, description);

  insertDefinitionReference(
    view,
    pending.request,
    pending.document,
    term
  );

  setPendingDefinition(null);
  view.focus();
  
}

function handleCancelDefinition() {
  setPendingDefinition(null);
  editorViewRef.current?.focus();
}

  const { index } = useLibraryIndex();

  
const extensions = useMemo(
  () => [
    markdown(),

    // Explicit link keyboard commands.
    wikiLinkCommands,

    // Definition creation keyboard commands.
    definitionCommands(handleDefinitionRequest),

    // Explicit link styling.
    ...wikiLinkDecorations,
    ...definitionDecorations,

    // Explicit link navigation.
    ...(onNavigate
      ? [wikiLinkNavigation(onNavigate)]
      : []),

    ...(onNavigateDefinition
      ? [definitionNavigation(onNavigateDefinition)]
      : []),

    // NEW: Library-wide implicit references.
    ...(onOpenIndexedLink
      ? implicitWikiLinks(
          index.entries,
          onOpenIndexedLink
        )
      : []),
  ],
  [
    onNavigate,
    onNavigateDefinition,
    onOpenIndexedLink,
    handleDefinitionRequest,
    index.entries,
    scrollTheme,
  ]
);



  

return (
  <div className="relative flex h-full min-h-0 min-w-0 flex-col overflow-hidden">

    {/* CodeMirror editor */}
    <div className="min-h-0 min-w-0 flex-1 overflow-hidden">
      <CodeMirror
        className="h-full min-h-0"
        value={content}
        onChange={onChange}
        height="100%"
        theme="dark"
        extensions={extensions}
        onCreateEditor={(view) => {
          editorViewRef.current = view;
        }}
      />
    </div>

    {/* Definition creation popover */}
    {pendingDefinition && (
      <div
        className="fixed z-50"
        style={{
          left: pendingDefinition.x,
          top: pendingDefinition.y,
        }}
      >
        <DefinitionPopover
          initialTerm={pendingDefinition.request.term}
          mode={pendingDefinition.mode}
          onCreate={handleCreateDefinition}
          onCancel={handleCancelDefinition}
        />
      </div>
    )}

    {/* Definition error notification */}
    {definitionError && (
      <div
        role="alert"
        className="fixed bottom-4 right-4 z-50 max-w-sm rounded-lg border border-red-800 bg-gray-900 p-4 text-sm text-red-400 shadow-xl"
      >
        {definitionError}

        <button
          type="button"
          className="ml-3 bg-transparent text-gray-300 hover:text-white"
          onClick={() => setDefinitionError(null)}
        >
          Dismiss
        </button>
      </div>
    )}

  </div>
);
}
