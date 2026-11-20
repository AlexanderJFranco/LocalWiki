
export type LibraryEntryKind = "document" | "definition";

export interface LibraryLink {
  term: string;
  relativePath: string;
  kind: LibraryEntryKind;
  aliases: string[];
}

export interface LibraryIndex {
  entries: LibraryLink[];
  version: number;
}
