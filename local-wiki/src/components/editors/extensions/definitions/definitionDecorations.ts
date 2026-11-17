
import {
  Decoration,
  EditorView,
  MatchDecorator,
  ViewPlugin,
  type ViewUpdate,
} from "@codemirror/view";

// Detect definition references.
// Supports {{Ownership}} and {{Ownership|resource ownership}}.
const definitionMatcher = new MatchDecorator({
  regexp: /\{\{[^}\n]*\}\}/g,

  decoration: Decoration.mark({
    class: "cm-definition-link",
  }),
});

// Apply decorations and update them as users edit.
const definitionPlugin = ViewPlugin.fromClass(
  class {
    decorations;

    constructor(view: EditorView) {
      this.decorations = definitionMatcher.createDeco(view);
    }

    update(update: ViewUpdate) {
      this.decorations = definitionMatcher.updateDeco(
        update,
        this.decorations
      );
    }
  },
  {
    decorations: (plugin) => plugin.decorations,
  }
);

// CodeMirror-specific styling.
const definitionTheme = EditorView.baseTheme({
  "& .cm-definition-link": {
    color: "#22c55e",
    borderRadius: "3px",
    cursor: "pointer",
  },

  "& .cm-definition-link:hover": {
    backgroundColor: "rgba(34, 197, 94, 0.25)",
    textDecoration: "underline",
    textDecorationColor: "#22c55e",
    textUnderlineOffset: "3px",
  },
});

// Export both extensions.
export const definitionDecorations = [
  definitionPlugin,
  definitionTheme,
];
