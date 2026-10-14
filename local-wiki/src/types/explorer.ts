// Must match the JSON shape serialized by Rust.
export interface ExplorerEntry {
  name: string;
  relativePath: string;
  isDirectory: boolean;
}