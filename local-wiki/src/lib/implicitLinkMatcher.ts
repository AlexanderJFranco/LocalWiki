
import type { LibraryLink } from "@/types/libraryIndex";

export interface ImplicitLinkMatch {
  start: number;
  end: number;
  text: string;
  relativePath: string;
  kind: "document" | "definition";
}

// Explicit links must not be transformed again.
const EXPLICIT_LINK_REGEX =
  /\[\[[^\]\n]*\]\]|\{\{[^}\n]*\}\}/g;

// Unicode-aware word boundaries.
const WORD_END = /[\p{L}\p{N}_]$/u;
const WORD_START = /^[\p{L}\p{N}_]/u;

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function normalizeTerm(value: string): string {
  return value.trim().toLowerCase();
}

// Determine which file should represent a term.
// Definitions take precedence over ordinary documents.
// Ambiguous matches are intentionally excluded.
function buildTermMap(
  entries: LibraryLink[]
): Map<string, LibraryLink> {
  const grouped = new Map<string, LibraryLink[]>();

  for (const entry of entries) {
    const terms = [entry.term, ...entry.aliases];

    for (const rawTerm of terms) {
      const term = normalizeTerm(rawTerm);

      if (!term) continue;

      const existing = grouped.get(term) ?? [];

      // Avoid duplicate entries pointing to the same file.
      if (
        !existing.some(
          (item) =>
            item.relativePath === entry.relativePath &&
            item.kind === entry.kind
        )
      ) {
        existing.push(entry);
      }

      grouped.set(term, existing);
    }
  }

  const result = new Map<string, LibraryLink>();

  for (const [term, candidates] of grouped) {
    const definitions = candidates.filter(
      (entry) => entry.kind === "definition"
    );

    // Prefer a unique definition.
    if (definitions.length === 1) {
      result.set(term, definitions[0]);
      continue;
    }

    // Multiple definitions are ambiguous.
    if (definitions.length > 1) continue;

    // Otherwise accept a unique document.
    const documents = candidates.filter(
      (entry) => entry.kind === "document"
    );

    if (documents.length === 1) {
      result.set(term, documents[0]);
    }
  }

  return result;
}

export function findImplicitLinks(
  text: string,
  entries: LibraryLink[]
): ImplicitLinkMatch[] {
  if (!text || entries.length === 0) return [];

  const termMap = buildTermMap(entries);

  if (termMap.size === 0) return [];

  // Longer names take precedence over shorter ones.
  const terms = [...termMap.keys()].sort(
    (a, b) => b.length - a.length
  );

  const matcher = new RegExp(
    terms.map(escapeRegex).join("|"),
    "giu"
  );

  // Collect regions occupied by explicit references.
  const protectedRanges = [
    ...text.matchAll(EXPLICIT_LINK_REGEX),
  ].map((match) => ({
    start: match.index,
    end: match.index + match[0].length,
  }));

  const results: ImplicitLinkMatch[] = [];

  for (const match of text.matchAll(matcher)) {
    const start = match.index;
    const end = start + match[0].length;

    // Ignore matches inside explicit references.
    const overlapsExplicit = protectedRanges.some(
      (range) =>
        start < range.end && end > range.start
    );

    if (overlapsExplicit) continue;

    // Avoid matching part of a larger word.
    const before = text.slice(0, start);
    const after = text.slice(end);

    if (WORD_END.test(before) || WORD_START.test(after)) {
      continue;
    }

    const entry = termMap.get(normalizeTerm(match[0]));

    if (!entry) continue;

    results.push({
      start,
      end,
      text: match[0],
      relativePath: entry.relativePath,
      kind: entry.kind,
    });
  }

  return results;
}
