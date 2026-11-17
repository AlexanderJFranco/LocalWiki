
import {
  Decoration,
  EditorView,
  ViewPlugin,
  type DecorationSet,
  type ViewUpdate,
} from "@codemirror/view";

interface ImplicitMatch {
  from: number;
  to: number;
  target: string;
}

const explicitLinkRegex = /\[\[([^\]\n]+)\]\]/g;

function escapeRegex(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function isWordCharacter(char: string): boolean {
  return /[\p{L}\p{N}_]/u.test(char);
}

function getImplicitMatches(view: EditorView): ImplicitMatch[] {
  const doc = view.state.doc;

  // A term maps to its wiki-link destination.
  // null means the same term points to conflicting destinations.
  const terms = new Map<string, string | null>();

  const lines: {
    from: number;
    text: string;
    excluded: { from: number; to: number }[];
  }[] = [];

  let fence: string | null = null;

  // First pass: collect explicit links.
  for (let n = 1; n <= doc.lines; n++) {
    const line = doc.line(n);
    const fenceMatch = line.text.match(/^\s*(`{3,}|~{3,})/);

    if (fenceMatch) {
      if (fence === null) {
        fence = fenceMatch[1][0];
      } else if (fence === fenceMatch[1][0]) {
        fence = null;
      }
      continue;
    }

    if (fence !== null) continue;

    const excluded: { from: number; to: number }[] = [];

    // Ignore basic inline-code spans.
    for (const match of line.text.matchAll(/`+[^`]*`+/g)) {
      excluded.push({
        from: match.index,
        to: match.index + match[0].length,
      });
    }

    for (const match of line.text.matchAll(explicitLinkRegex)) {
      const start = match.index;
      const end = start + match[0].length;

      if (excluded.some(r => start < r.to && end > r.from)) {
        continue;
      }

      excluded.push({ from: start, to: end });

      const [rawTarget, rawAlias] = match[1].split("|");
      const target = rawTarget.trim();

      // Use the alias if supplied; otherwise use the page name.
      const pageName = target
        .split("/")
        .pop()!
        .replace(/\.md$/i, "");

      const term = (rawAlias?.trim() || pageName).toLowerCase();

      if (!target || !term) continue;

      if (terms.has(term) && terms.get(term) !== target) {
        terms.set(term, null);
      } else if (!terms.has(term)) {
        terms.set(term, target);
      }
    }

    lines.push({
      from: line.from,
      text: line.text,
      excluded,
    });
  }

  // Ignore ambiguous terms.
  const validTerms = [...terms.entries()]
    .filter((entry): entry is [string, string] => entry[1] !== null)
    .sort((a, b) => b[0].length - a[0].length);

  if (validTerms.length === 0) return [];

  const termMap = new Map(validTerms);
  const pattern = new RegExp(
    validTerms.map(([term]) => escapeRegex(term)).join("|"),
    "gi"
  );

  const matches: ImplicitMatch[] = [];

  // Second pass: find ordinary occurrences of those terms.
  for (const line of lines) {
    for (const match of line.text.matchAll(pattern)) {
      const start = match.index;
      const end = start + match[0].length;

      // Don't decorate existing links or inline code.
      if (line.excluded.some(r => start < r.to && end > r.from)) {
        continue;
      }

      // Only match whole words.
      const before = line.text[start - 1] ?? "";
      const after = line.text[end] ?? "";

      if (
        (before && isWordCharacter(before)) ||
        (after && isWordCharacter(after))
      ) {
        continue;
      }

      const target = termMap.get(match[0].toLowerCase());

      if (!target) continue;

      matches.push({
        from: line.from + start,
        to: line.from + end,
        target,
      });
    }
  }

  // Avoid overlapping decorations.
  matches.sort((a, b) => a.from - b.from || b.to - a.to);

  return matches.filter((match, index, all) =>
    index === 0 || match.from >= all[index - 1].to
  );
}

export function implicitWikiLinks(
  onNavigate: (target: string) => void
) {
  const plugin = ViewPlugin.fromClass(
    class {
      matches: ImplicitMatch[];
      decorations: DecorationSet;

      constructor(view: EditorView) {
        this.matches = getImplicitMatches(view);
        this.decorations = this.createDecorations();
      }

      createDecorations(): DecorationSet {
        return Decoration.set(
          this.matches.map(match =>
            Decoration.mark({
              class: "cm-implicit-wiki-link",
            }).range(match.from, match.to)
          ),
          true
        );
      }

      update(update: ViewUpdate) {
        if (update.docChanged) {
          this.matches = getImplicitMatches(update.view);
          this.decorations = this.createDecorations();
        }
      }
    },
    {
      decorations: value => value.decorations,

      eventHandlers: {
        click(event, view) {
          if (!event.ctrlKey && !event.metaKey) {
            return false;
          }

          const position = view.posAtCoords({
            x: event.clientX,
            y: event.clientY,
          });

          if (position === null) return false;

          const instance = view.plugin(plugin);

          const match = instance?.matches.find(
            m => position >= m.from && position < m.to
          );

          if (!match) return false;

          event.preventDefault();
          onNavigate(match.target);
          return true;
        },
      },
    }
  );

  const theme = EditorView.baseTheme({
    "& .cm-implicit-wiki-link": {
      borderRadius: "3px",
      cursor: "pointer",
      transition: "background-color 120ms ease",
    },

    "& .cm-implicit-wiki-link:hover": {
      backgroundColor: "rgba(59, 130, 246, 0.25)",
      textDecoration: "underline",
      textDecorationColor: "#60a5fa",
      textUnderlineOffset: "3px",
    },
  });

  return [plugin, theme];
}
