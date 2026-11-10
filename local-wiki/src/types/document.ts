
export type ViewMode = "source" | "split" | "preview";

export interface DocumentSession {
  id: string;
  name: string;
  relativePath: string;

  // Working copy of the document.
  content: string;

  // Last content successfully read from disk.
  savedContent: string;

  viewMode: ViewMode;
  isLoading: boolean;
  error: string | null;
  requestId: number;
}
