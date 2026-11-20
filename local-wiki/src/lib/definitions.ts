
import {
  createDocument,
  writeDocument,
} from "@/lib/tauri";
import { notifyLibraryChanged } from "./libraryEvents";

export async function createDefinition(
  term: string,
  description = ""
): Promise<string> {
  const name = term.trim();
  const body = description.trim();

  if (
    !name ||
    !/^[\p{L}\p{N}_ -]+$/u.test(name)
  ) {
    throw new Error("Invalid definition name.");
  }

  const relativePath = `.def/${name}.md`;

  // Must reject existing files, not overwrite them.
  await createDocument(relativePath);

  // Every definition gets a heading.
  // The body is optional.
  const markdown = `# ${name}

${body}${body ? "\n" : ""}`;

  await writeDocument(relativePath, markdown);
  notifyLibraryChanged({
  type: "created",
  relativePath,
});

  return relativePath;
}
