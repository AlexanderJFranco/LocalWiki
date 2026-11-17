
import { visit, SKIP } from "unist-util-visit";
import type { Root, PhrasingContent } from "mdast";

const LINK_REGEX = /\[\[([^\]\n]+)\]\]/g;
const DEFINITION_REGEX = /\{\{([^}\n]+)\}\}/g;

type ReferenceKind = "wiki" | "definition";

interface ReferenceMatch {
  start: number;
  end: number;
  target: string;
  label: string;
  explicit: boolean;
  kind: ReferenceKind;
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function isWordChar(value: string): boolean {
  return /[\p{L}\p{N}_]/u.test(value);
}

function makeLink(
  target: string,
  label: string,
  explicit: boolean,
  kind: ReferenceKind = "wiki"
): PhrasingContent {
  const className =
    kind === "definition"
      ? explicit
        ? "definition-link-explicit"
        : "definition-link-implicit"
      : explicit
        ? "wiki-link-explicit"
        : "wiki-link-implicit";

  return {
    type: "link",
    url: `${kind === "definition" ? "def" : "wiki"}:${encodeURIComponent(target)}`,
    data: {
      hProperties: {
        className: [className],
      },
    },
    children: [{ type: "text", value: label }],
  };
}

export function remarkWikiLinks() {
  return (tree: Root) => {
    // Maps a linked term to its destination.
    // Null means multiple destinations use the same term.
    const terms = new Map<string, string | null>();

    // ==========================================
    // PASS 1: Collect explicit wiki-link terms.
    // ==========================================

    visit(tree, "text", (node, _, parent) => {
      if (
        parent?.type === "link" ||
        parent?.type === "linkReference"
      ) {
        return;
      }

      for (const match of node.value.matchAll(LINK_REGEX)) {
        const [rawTarget, rawAlias] = match[1].split("|");
        const target = rawTarget.trim();

        if (!target) continue;

        const pageName = target
          .split("/")
          .pop()!
          .replace(/\.md$/i, "");

        const term = (rawAlias?.trim() || pageName)
          .toLowerCase();

        if (!term) continue;

        if (terms.has(term) && terms.get(term) !== target) {
          terms.set(term, null);
        } else if (!terms.has(term)) {
          terms.set(term, target);
        }
      }
    });

    const validTerms = [...terms.entries()]
      .filter(
        (entry): entry is [string, string] =>
          entry[1] !== null
      )
      .sort((a, b) => b[0].length - a[0].length);

    const termMap = new Map(validTerms);

    const implicitRegex = validTerms.length
      ? new RegExp(
          validTerms
            .map(([term]) => escapeRegex(term))
            .join("|"),
          "giu"
        )
      : null;

    // ==========================================
    // PASS 2: Transform references into links.
    // ==========================================

    visit(tree, "text", (node, index, parent) => {
      if (index === undefined || !parent) return;

      // Don't modify existing Markdown links.
      if (
        parent.type === "link" ||
        parent.type === "linkReference"
      ) {
        return;
      }

      const text = node.value;

      // IMPORTANT: Each text node gets its own matches.
      const matches: ReferenceMatch[] = [];

      // Explicit wiki links: [[Ownership]]
      for (const match of text.matchAll(LINK_REGEX)) {
        const [rawTarget, rawAlias] = match[1].split("|");
        const target = rawTarget.trim();

        if (!target) continue;

        matches.push({
          start: match.index,
          end: match.index + match[0].length,
          target,
          label: rawAlias?.trim() || target,
          explicit: true,
          kind: "wiki",
        });
      }

      // Explicit definitions: {{Ownership}}
      for (const match of text.matchAll(DEFINITION_REGEX)) {
        const [rawTarget, rawAlias] = match[1].split("|");
        const target = rawTarget.trim();

        if (!target) continue;

        matches.push({
          start: match.index,
          end: match.index + match[0].length,
          target,
          label: rawAlias?.trim() || target,
          explicit: true,
          kind: "definition",
        });
      }

      // Implicit wiki links: ordinary occurrences
      // of previously linked terms.
      if (implicitRegex) {
        for (const match of text.matchAll(implicitRegex)) {
          const start = match.index;
          const end = start + match[0].length;

          const before = text[start - 1] ?? "";
          const after = text[end] ?? "";

          if (
            (before && isWordChar(before)) ||
            (after && isWordChar(after))
          ) {
            continue;
          }

          const target = termMap.get(
            match[0].toLowerCase()
          );

          if (!target) continue;

          matches.push({
            start,
            end,
            target,
            label: match[0],
            explicit: false,
            kind: "wiki",
          });
        }
      }

      if (matches.length === 0) return;

      // Explicit references win over overlapping
      // implicit matches.
      matches.sort(
        (a, b) =>
          a.start - b.start ||
          Number(b.explicit) - Number(a.explicit) ||
          b.end - a.end
      );

      const replacement: PhrasingContent[] = [];
      let cursor = 0;

      for (const match of matches) {
        if (match.start < cursor) continue;

        if (match.start > cursor) {
          replacement.push({
            type: "text",
            value: text.slice(cursor, match.start),
          });
        }

        replacement.push(
          makeLink(
            match.target,
            match.label,
            match.explicit,
            match.kind
          )
        );

        cursor = match.end;
      }

      if (cursor < text.length) {
        replacement.push({
          type: "text",
          value: text.slice(cursor),
        });
      }

      if (replacement.length === 0) return;

      // Replace this text node with the new nodes.
      const container = parent as {
        children: PhrasingContent[];
      };

      container.children.splice(index, 1, ...replacement);

      // Resume after the inserted nodes.
      return [SKIP, index + replacement.length];
    });
  };
}
