
import {
  Decoration,
  EditorView,
  MatchDecorator,
  ViewPlugin,
  type ViewUpdate,
} from "@codemirror/view";

// Detect [[Wiki Links]] within the editor.
const wikiLinkMatcher = new MatchDecorator({
  regexp: /\[\[[^\]\n]*\]\]/g,
  decoration: Decoration.mark({
    class: "cm-wiki-link",
  }),
});

// Apply and maintain decorations.
const wikiLinkPlugin = ViewPlugin.fromClass(
  class {
    decorations;

    constructor(view: EditorView) {
      this.decorations = wikiLinkMatcher.createDeco(view);
    }

    update(update: ViewUpdate) {
      this.decorations = wikiLinkMatcher.updateDeco(
        update,
        this.decorations
      );
    }
  },
  {
    decorations: (plugin) => plugin.decorations,
  }
);

// Style the decorated text directly through CodeMirror.
const wikiLinkTheme = EditorView.baseTheme({
  "& .cm-wiki-link": {
    color: "#60a5fa",
    borderRadius: "3px",
    cursor: "pointer",
  },

  "& .cm-wiki-link:hover": {
    backgroundColor: "rgba(59, 130, 246, 0.3)",
    textDecoration: "underline",
    textUnderlineOffset: "3px",
  },
});

// Export both the decoration plugin and its styling.
export const wikiLinkDecorations = [
  wikiLinkPlugin,
  wikiLinkTheme,
];
