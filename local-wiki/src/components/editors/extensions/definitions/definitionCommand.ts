
import { Prec } from "@codemirror/state";
import { keymap, type Command } from "@codemirror/view";

// Wrap selected text in definition syntax.
const insertDefinition: Command = (view) => {
  const { from, to } = view.state.selection.main;

  const selectedText = view.state.doc.sliceString(from, to);

  // Avoid wrapping an existing definition.
  if (
    selectedText.startsWith("{{") &&
    selectedText.endsWith("}}")
  ) {
    return true;
  }

  const definition = `{{${selectedText}}}`;

  view.dispatch({
    changes: {
      from,
      to,
      insert: definition,
    },

    selection: {
      anchor:
        from === to
          ? from + 2
          : from + definition.length,
    },

    scrollIntoView: true,
  });

  return true;
};

// Ctrl+Shift+D on Windows/Linux.
// Cmd+Shift+D on macOS.
export const definitionCommands = Prec.highest(
  keymap.of([
    {
      key: "Mod-Shift-d",
      run: insertDefinition,
    },
  ])
);
