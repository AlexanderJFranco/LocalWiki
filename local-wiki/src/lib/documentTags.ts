
export function getDocumentTags(markdown: string): string[] {
  // Find YAML frontmatter at the beginning of a document.
  const frontmatter = markdown.match(
    /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/
  );

  if (!frontmatter) return [];

  // Recognize our simple inline tags format.
  const tags = frontmatter[1].match(
    /^tags:\s*\[([^\]\r\n]*)\]\s*$/m
  );

  if (!tags) return [];

  return tags[1]
    .split(",")
    .map((tag) => tag.trim().replace(/^["']|["']$/g, ""))
    .filter(Boolean)
    .map((tag) => tag.toLowerCase());
}


export function setDocumentTags(
  markdown: string,
  tags: string[]
): string {
  const tagLine = `tags: [${tags.join(", ")}]`;

  // Match an existing frontmatter block.
  const frontmatter = markdown.match(
    /^(---\r?\n)([\s\S]*?)(\r?\n---)(?=\r?\n|$)/
  );

  if (frontmatter) {
    const [fullMatch, opening, body, closing] = frontmatter;

    // Only support the inline array format used
    // by our current getDocumentTags parser.
    if (/^tags:\s*$/m.test(body)) {
      throw new Error(
        "Block-style YAML tags are not supported by the tag editor."
      );
    }

    const updatedBody = /^tags:\s*\[[^\]\r\n]*\]\s*$/m.test(body)
      ? body.replace(
          /^tags:\s*\[[^\]\r\n]*\]\s*$/m,
          tagLine
        )
      : `${body}\n${tagLine}`;

    return (
      opening +
      updatedBody +
      closing +
      markdown.slice(fullMatch.length)
    );
  }

  // If the document has no frontmatter,
  // prepend a new block.
  return `---\n${tagLine}\n---\n\n${markdown}`;
}
