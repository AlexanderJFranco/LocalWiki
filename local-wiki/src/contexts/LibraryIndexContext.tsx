
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { getLibraryIndex } from "@/lib/tauri";

import {
  LIBRARY_CHANGED_EVENT,
} from "@/lib/libraryEvents";

import type {
  LibraryIndex,
  LibraryLink,
} from "@/types/libraryIndex";

// Defines the values exposed to components
// consuming the LibraryIndexContext.
interface LibraryIndexContextValue {
  index: LibraryIndex;

  isLoading: boolean;
  hasLoaded: boolean;
  error: string | null;

  refreshIndex: () => Promise<void>;
  clearIndex: () => void;
}

// Create the context.
// Null allows us to detect usage outside the provider.
const LibraryIndexContext =
  createContext<LibraryIndexContextValue | null>(null);


export function LibraryIndexProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [entries, setEntries] = useState<LibraryLink[]>([]);
  const [version, setVersion] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const requestId = useRef(0);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
      requestId.current += 1;
    };
  }, []);

  // 1. Define the refresh function.
  const refreshIndex = useCallback(async (): Promise<void> => {
    const currentRequest = ++requestId.current;

    setIsLoading(true);
    setError(null);

    try {
      const result = await getLibraryIndex();

      if (
        !mountedRef.current ||
        currentRequest !== requestId.current
      ) {
        return;
      }

      setEntries(result);
      setVersion((previous) => previous + 1);
      setHasLoaded(true);
    } catch (err) {
      if (
        !mountedRef.current ||
        currentRequest !== requestId.current
      ) {
        return;
      }

      const message =
        err instanceof Error ? err.message : String(err);

      setError(message);
      setHasLoaded(false);

      throw err;
    } finally {
      if (
        mountedRef.current &&
        currentRequest === requestId.current
      ) {
        setIsLoading(false);
      }
    }
  }, []);

  // 2. Subscribe to library changes at component level.
  useEffect(() => {
    function handleLibraryChanged() {
      void refreshIndex().catch((error) => {
        console.error(
          "Failed to refresh library index:",
          error
        );
      });
    }

    window.addEventListener(
      LIBRARY_CHANGED_EVENT,
      handleLibraryChanged
    );

    return () => {
      window.removeEventListener(
        LIBRARY_CHANGED_EVENT,
        handleLibraryChanged
      );
    };
  }, [refreshIndex]);

  // 3. Reset the index when switching libraries.
  const clearIndex = useCallback(() => {
    requestId.current += 1;

    setEntries([]);
    setVersion((previous) => previous + 1);

    setIsLoading(false);
    setHasLoaded(false);
    setError(null);
  }, []);

  const index = useMemo<LibraryIndex>(
    () => ({ entries, version }),
    [entries, version]
  );

  const value = useMemo<LibraryIndexContextValue>(
    () => ({
      index,
      isLoading,
      hasLoaded,
      error,
      refreshIndex,
      clearIndex,
    }),
    [
      index,
      isLoading,
      hasLoaded,
      error,
      refreshIndex,
      clearIndex,
    ]
  );

  return (
    <LibraryIndexContext.Provider value={value}>
      {children}
    </LibraryIndexContext.Provider>
  );
}


// Custom hook used by any component that
// needs to read or refresh the library index.
export function useLibraryIndex(): LibraryIndexContextValue {
  const context = useContext(LibraryIndexContext);

  if (!context) {
    throw new Error(
      "useLibraryIndex must be used within LibraryIndexProvider"
    );
  }

  return context;
}
