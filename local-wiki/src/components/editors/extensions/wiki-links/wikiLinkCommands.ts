
import { Prec } from "@codemirror/state";
import { keymap, type Command } from "@codemirror/view";

const insertWikiLink: Command = (view) => {
  const { from, to } = view.state.selection.main;

  const selectedText = view.state.doc.sliceString(from, to);

  // Avoid nesting links when an entire existing link is selected.
  if (
    selectedText.startsWith("[[") &&
    selectedText.endsWith("]]")
  ) {
    return true;
  }

  // Works with or without a selection.
  const wikiLink = `[[${selectedText}]]`;

  view.dispatch({
    changes: {
      from,
      to,
      insert: wikiLink,
    },

    selection: {
      // Empty selection: caret goes inside [[]].
      // Text selection: caret goes after the link.
      anchor:
        from === to
          ? from + 2
          : from + wikiLink.length,
    },

    scrollIntoView: true,
  });

  return true;
};

export const wikiLinkCommands = Prec.highest(
  keymap.of([
    {
      key: "Mod-Shift-k",
      run: insertWikiLink,
    },
  ])
);
