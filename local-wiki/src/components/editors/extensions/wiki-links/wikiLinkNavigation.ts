
import { EditorView } from "@codemirror/view";

// Find [[target]] or [[target|display text]].
const WIKI_LINK_REGEX = /\[\[([^\]\n]+)\]\]/g;

export function wikiLinkNavigation(
  onNavigate: (target: string) => void
) {
  return EditorView.domEventHandlers({
    click(event, view) {
      // Ctrl+Click on Windows/Linux.
      // Cmd+Click on macOS.
      if (!event.ctrlKey && !event.metaKey) {
        return false;
      }

      const position = view.posAtCoords({
        x: event.clientX,
        y: event.clientY,
      });
      

      if (position === null) {
        return false;
      }
      console.log("Clicked document position:", position);
      // Retrieve the line the user clicked.
      const line = view.state.doc.lineAt(position);
      console.log("Clicked line:", line.text);
      const text = line.text;

      // Find wiki links on this line.
      for (const match of text.matchAll(WIKI_LINK_REGEX)) {
        const start = line.from + match.index;
        const end = start + match[0].length;

        if (position < start || position >= end) {
          continue;
        }

        // Remove optional display text.
        // [[Ownership|ownership model]]
        // becomes "Ownership".
        const target = match[1].split("|")[0].trim();

        if (!target) {
          return false;
        }

        event.preventDefault();

        onNavigate(target);

        return true;
      }

      return false;
    },
  });
}
