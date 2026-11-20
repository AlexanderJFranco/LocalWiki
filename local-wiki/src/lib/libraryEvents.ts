
export const LIBRARY_CHANGED_EVENT =
  "local-wiki:library-changed";

export type LibraryChangeType =
  | "created"
  | "renamed"
  | "deleted"
  | "initialized";

export interface LibraryChangeDetail {
  type: LibraryChangeType;
  relativePath?: string;
}

// Notify React that the library structure has changed.
export function notifyLibraryChanged(
  detail: LibraryChangeDetail
): void {
  window.dispatchEvent(
    new CustomEvent<LibraryChangeDetail>(
      LIBRARY_CHANGED_EVENT,
      { detail }
    )
  );
}
