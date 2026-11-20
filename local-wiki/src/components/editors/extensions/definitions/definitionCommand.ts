
import { Prec } from "@codemirror/state";
import { keymap, type Command } from "@codemirror/view";

export interface DefinitionRequest {
  term: string;
  from: number;
  to: number;
}

export type DefinitionMode = "full" | "quick";

export function definitionCommands(
  onCreateDefinition: (
    request: DefinitionRequest,
    mode: DefinitionMode
  ) => void
) {
  function createCommand(mode: DefinitionMode): Command {
    return (view) => {
      const { from, to } = view.state.selection.main;

      const term = view.state.doc
        .sliceString(from, to)
        .trim();

      onCreateDefinition(
        { term, from, to },
        mode
      );

      return true;
    };
  }

  return Prec.highest(
    keymap.of([
      {
        // Create definition with description
        key: "Mod-Shift-d",
        run: createCommand("full"),
      },
      {
        // Create placeholder definition
        key: "Mod-Alt-d",
        run: createCommand("quick"),
      },
    ])
  );
}
