
import {
  createDocument,
  writeDocument,
} from "@/lib/tauri";

export async function createDefinition(
  term: string
): Promise<string> {
  const name = term.trim();

  // Keep filenames simple for now.
  if (
    !name ||
    name.length > 80 ||
    !/^[\p{L}\p{N}_ -]+$/u.test(name)
  ) {
    throw new Error("Invalid definition name.");
  }

  // Definitions always belong in .def.
  const relativePath = `.def/${name}.md`;

  // Create a new file without overwriting existing definitions.
  await createDocument(relativePath);

  // Generate the initial Markdown content.
  const content = `---
term: ${JSON.stringify(name)}
aliases: []
---

# ${name}

Write your definition here.

## Related Concepts

`;

  // Populate the new definition.
  await writeDocument(relativePath, content);

  return relativePath;
}
