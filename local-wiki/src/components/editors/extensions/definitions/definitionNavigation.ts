
import { EditorView } from "@codemirror/view";

const DEFINITION_REGEX = /\{\{([^}\n]+)\}\}/g;

export function definitionNavigation(
  onNavigate: (target: string) => void
) {
  return EditorView.domEventHandlers({
    click(event, view) {
      // Ctrl+Click (Cmd+Click on Mac)
      if (!event.ctrlKey && !event.metaKey) {
        return false;
      }

      const position = view.posAtCoords({
        x: event.clientX,
        y: event.clientY,
      });

      if (position === null) return false;

      const line = view.state.doc.lineAt(position);

      for (const match of line.text.matchAll(DEFINITION_REGEX)) {
        const start = line.from + match.index;
        const end = start + match[0].length;

        if (position < start || position >= end) {
          continue;
        }

        // Supports {{Ownership|resource ownership}}
        const target = match[1].split("|")[0].trim();

        if (!target) return false;

        event.preventDefault();
        onNavigate(target);

        return true;
      }

      return false;
    },
  });
}
