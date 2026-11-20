
import {
  listDirectory,
  readDocument,
  createDocument,
  writeDocument,
} from "@/lib/tauri";

import type { WikiTag } from "@/types/tag";

const TAG_DIRECTORY = ".tags";
const DEFAULT_COLOR = "#A855F7";

// Validate a six-digit hexadecimal color.
function isValidColor(color: string): boolean {
  return /^#[0-9A-Fa-f]{6}$/.test(color);
}

// Read the color from a tag's Markdown frontmatter.
function parseTagColor(content: string): string {
  const match = content.match(
    /^---\r?\n[\s\S]*?^color:\s*["']?(#[0-9A-Fa-f]{6})["']?\s*$/m
  );

  return match?.[1] ?? DEFAULT_COLOR;
}

// Load every tag in the library.
export async function getTags(): Promise<WikiTag[]> {
  const entries = await listDirectory(TAG_DIRECTORY);

  const files = entries.filter(
    (entry) =>
      !entry.isDirectory &&
      entry.name.toLowerCase().endsWith(".md") &&
      entry.name.toLowerCase() !== "readme.md"
  );

  const tags = await Promise.all(
    files.map(async (entry): Promise<WikiTag> => {
      const content = await readDocument(
        entry.relativePath
      );

      return {
        name: entry.name.replace(/\.md$/i, ""),
        color: parseTagColor(content),
        relativePath: entry.relativePath,
      };
    })
  );

  return tags.sort((a, b) =>
    a.name.localeCompare(b.name)
  );
}

// Create a new tag with a chosen color.
export async function createTag(
  name: string,
  color: string = DEFAULT_COLOR
): Promise<WikiTag> {
  
const normalizedName = name.trim().toLowerCase();

if (
  !normalizedName ||
  normalizedName === "." ||
  normalizedName === ".." ||
  /[<>:"/\\|?*\x00-\x1F]/.test(normalizedName) ||
  /[. ]$/.test(normalizedName) ||
  /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(normalizedName)
) {
  throw new Error("Invalid tag name or filename.");
}


  if (!isValidColor(color)) {
    throw new Error("Invalid hex color.");
  }

  const relativePath =
    `${TAG_DIRECTORY}/${normalizedName}.md`;

  // Existing files must not be overwritten.
  await createDocument(relativePath);

  const content = `---
color: "${color.toUpperCase()}"
---

# ${normalizedName}
`;

  await writeDocument(relativePath, content);

  return {
    name: normalizedName,
    color: color.toUpperCase(),
    relativePath,
  };
}
