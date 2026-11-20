
import { visit, SKIP } from "unist-util-visit";
import type { Root, PhrasingContent } from "mdast";

import { findImplicitLinks } from "@/lib/implicitLinkMatcher";
import type {
  LibraryLink,
  LibraryEntryKind,
} from "@/types/libraryIndex";

const WIKI_REGEX = /\[\[([^\]\n]+)\]\]/g;
const DEFINITION_REGEX = /\{\{([^}\n]+)\}\}/g;

interface LinkMatch {
  start: number;
  end: number;
  target: string;
  label: string;
  kind: LibraryEntryKind;
  explicit: boolean;
  relativePath?: string;
}

// Construct a Markdown AST link.
function makeLink(match: LinkMatch): PhrasingContent {
  const className =
    match.kind === "definition"
      ? match.explicit
        ? "definition-link-explicit"
        : "definition-link-implicit"
      : match.explicit
        ? "wiki-link-explicit"
        : "wiki-link-implicit";

  // Explicit references still use the Rust resolvers.
  // Implicit references already have indexed paths.
  const url = match.explicit
    ? `${match.kind === "definition" ? "def" : "wiki"}:${encodeURIComponent(match.target)}`
    : `indexed:${encodeURIComponent(match.relativePath!)}`;

  return {
    type: "link",
    url,
    data: {
      hProperties: {
        className: [className],
      },
    },
    children: [
      {
        type: "text",
        value: match.label,
      },
    ],
  };
}

// Remark plugin factory.
// Receives the index from MarkdownPreview.
export function remarkWikiLinks(
  entries: LibraryLink[] = []
) {
  return (tree: Root) => {
    visit(tree, "text", (node, index, parent) => {
      if (index === undefined || !parent) return;

      // Never transform text inside existing links.
      if (
        parent.type === "link" ||
        parent.type === "linkReference"
      ) {
        return;
      }

      const text = node.value;
      const matches: LinkMatch[] = [];

      // 1. Explicit document references.
      for (const match of text.matchAll(WIKI_REGEX)) {
        const [rawTarget, rawAlias] = match[1].split("|");
        const target = rawTarget.trim();

        if (!target) continue;

        matches.push({
          start: match.index,
          end: match.index + match[0].length,
          target,
          label: rawAlias?.trim() || target,
          kind: "document",
          explicit: true,
        });
      }

      // 2. Explicit definition references.
      for (const match of text.matchAll(DEFINITION_REGEX)) {
        const [rawTarget, rawAlias] = match[1].split("|");
        const target = rawTarget.trim();

        if (!target) continue;

        matches.push({
          start: match.index,
          end: match.index + match[0].length,
          target,
          label: rawAlias?.trim() || target,
          kind: "definition",
          explicit: true,
        });
      }

      // 3. Implicit references from the library index.
      for (const match of findImplicitLinks(text, entries)) {
        matches.push({
          start: match.start,
          end: match.end,
          target: match.text,
          label: match.text,
          kind: match.kind,
          explicit: false,
          relativePath: match.relativePath,
        });
      }

      if (matches.length === 0) return;

      // Earlier positions first.
      // Explicit references win on overlapping ranges.
      matches.sort(
        (a, b) =>
          a.start - b.start ||
          Number(b.explicit) - Number(a.explicit) ||
          b.end - a.end
      );

      const replacement: PhrasingContent[] = [];
      let cursor = 0;

      for (const match of matches) {
        // Skip any match overlapping a previous match.
        if (match.start < cursor) continue;

        // Preserve ordinary text between matches.
        if (match.start > cursor) {
          replacement.push({
            type: "text",
            value: text.slice(cursor, match.start),
          });
        }

        replacement.push(makeLink(match));
        cursor = match.end;
      }

      // Preserve remaining text.
      if (cursor < text.length) {
        replacement.push({
          type: "text",
          value: text.slice(cursor),
        });
      }

      // Replace the original text node.
      const container = parent as {
        children: PhrasingContent[];
      };

      container.children.splice(
        index,
        1,
        ...replacement
      );

      // Do not reprocess newly inserted links.
      return [SKIP, index + replacement.length];
    });
  };
}
