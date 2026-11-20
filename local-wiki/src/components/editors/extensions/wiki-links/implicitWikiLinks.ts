
import { syntaxTree } from "@codemirror/language";

import {
  Decoration,
  EditorView,
  ViewPlugin,
  type DecorationSet,
  type ViewUpdate,
} from "@codemirror/view";

import { RangeSetBuilder } from "@codemirror/state";
import type { SyntaxNode } from "@lezer/common";
import { findImplicitLinks } from "@/lib/implicitLinkMatcher";
import type {
  LibraryLink,
  LibraryEntryKind,
} from "@/types/libraryIndex";

// Callback for navigating to indexed files.
type NavigateIndexedLink = (
  relativePath: string,
  kind: LibraryEntryKind
) => void;

// Determine whether text belongs to Markdown syntax
// that should not receive implicit links.

function isExcludedSyntax(
  view: EditorView,
  from: number,
  to: number
): boolean {
  const tree = syntaxTree(view.state);

  for (const position of [from, to - 1]) {
    // A syntax node can have a null parent.
    let node: SyntaxNode | null = tree.resolveInner(
      position,
      1
    );

    while (node !== null) {
      if (
        /Code|Link|URL|Image|HTML|Comment|Escape/i.test(
          node.name
        )
      ) {
        return true;
      }

      // The root node has no parent.
      node = node.parent;
    }
  }

  return false;
}


// Find the indexed reference at a document position.
function findLinkAt(
  view: EditorView,
  position: number,
  entries: LibraryLink[]
) {
  const line = view.state.doc.lineAt(position);

  return findImplicitLinks(line.text, entries).find(
    (match) => {
      const from = line.from + match.start;
      const to = line.from + match.end;

      return (
        position >= from &&
        position < to &&
        !isExcludedSyntax(view, from, to)
      );
    }
  );
}

export function implicitWikiLinks(
  entries: LibraryLink[],
  onNavigate: NavigateIndexedLink
) {
  // Build decorations from indexed terms.
  const plugin = ViewPlugin.fromClass(
    class {
      decorations: DecorationSet;

      constructor(view: EditorView) {
        this.decorations = this.buildDecorations(view);
      }

      update(update: ViewUpdate) {
        if (
          update.docChanged ||
          update.viewportChanged
        ) {
          this.decorations = this.buildDecorations(
            update.view
          );
        }
      }

      buildDecorations(
        view: EditorView
      ): DecorationSet {
        const builder =
          new RangeSetBuilder<Decoration>();

        // Only inspect visible document ranges.
        for (const range of view.visibleRanges) {
          let position = range.from;

          while (position <= range.to) {
            const line = view.state.doc.lineAt(position);

            const matches = findImplicitLinks(
              line.text,
              entries
            );

            for (const match of matches) {
              const from = line.from + match.start;
              const to = line.from + match.end;

              // Include only matches beginning in this
              // visible range to avoid duplicate marks.
              if (
                from < range.from ||
                from > range.to
              ) {
                continue;
              }

              if (isExcludedSyntax(view, from, to)) {
                continue;
              }

              const className =
                match.kind === "definition"
                  ? "cm-implicit-definition"
                  : "cm-implicit-document";

              builder.add(
                from,
                to,
                Decoration.mark({
                  class: className,
                })
              );
            }

            if (line.to >= range.to) break;

            position = line.to + 1;
          }
        }

        return builder.finish();
      }
    },
    {
      decorations: (value) => value.decorations,
    }
  );

  // Ctrl+Click or Cmd+Click to navigate.
  const navigation = EditorView.domEventHandlers({
    click(event, view) {
      if (!event.ctrlKey && !event.metaKey) {
        return false;
      }

      const position = view.posAtCoords({
        x: event.clientX,
        y: event.clientY,
      });

      if (position === null) return false;

      const match = findLinkAt(
        view,
        position,
        entries
      );

      if (!match) return false;

      event.preventDefault();

      onNavigate(
        match.relativePath,
        match.kind
      );

      return true;
    },
  });

  // Implicit links remain visually neutral until hover.
  const theme = EditorView.baseTheme({
    "& .cm-implicit-definition": {
      color: "inherit",
      cursor: "pointer",
    },

    "& .cm-implicit-definition:hover": {
      color: "#22c55e",
      textDecoration: "underline",
      textUnderlineOffset: "3px",
      backgroundColor: "rgba(34,197,94,0.12)",
    },

    "& .cm-implicit-document": {
      color: "inherit",
      cursor: "pointer",
    },

    "& .cm-implicit-document:hover": {
      color: "#60a5fa",
      textDecoration: "underline",
      textUnderlineOffset: "3px",
      backgroundColor: "rgba(96,165,250,0.12)",
    },
  });

  return [plugin, navigation, theme];
}
