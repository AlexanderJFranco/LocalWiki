
import {
  createContext,
  useCallback,
  useContext,
  useReducer,
  useRef,
  type ReactNode,
} from "react";

import type { ExplorerEntry } from "@/types/explorer";
import type { DocumentSession } from "@/types/document";
import { readDocument } from "@/lib/tauri";

interface WorkspaceState {
  documents: DocumentSession[];
  activeDocumentId: string | null;
}

type WorkspaceAction =
  | { type: "OPEN"; document: DocumentSession }
  | { type: "ACTIVATE"; id: string }
  | { type: "LOADED"; id: string; requestId: number; content: string }
  | { type: "FAILED"; id: string; requestId: number; error: string }
  | { type: "EDIT"; id: string; content: string }
  | { type: "CLOSE"; id: string }
  | {
    type: "SET_VIEW_MODE";
    id: string;
    mode: ViewMode;
  };

function workspaceReducer(
  state: WorkspaceState,
  action: WorkspaceAction
): WorkspaceState {
  switch (action.type) {
    case "OPEN": {
      const exists = state.documents.some(
        (doc) => doc.id === action.document.id
      );

      if (exists) {
        return {
          ...state,
          activeDocumentId: action.document.id,
        };
      }

      return {
        documents: [...state.documents, action.document],
        activeDocumentId: action.document.id,
      };
    }
    case "SET_VIEW_MODE":
      return {
        ...state,
        documents: state.documents.map((doc) =>
          doc.id === action.id
            ? { ...doc, viewMode: action.mode }
            : doc
        ),
      };
    case "ACTIVATE":
      return {
        ...state,
        activeDocumentId: action.id,
      };

    case "LOADED":
      return {
        ...state,
        documents: state.documents.map((doc) =>
          doc.id === action.id && doc.requestId === action.requestId
            ? {
                ...doc,
                content: action.content,
                savedContent: action.content,
                isLoading: false,
                error: null,
              }
            : doc
        ),
      };

    case "FAILED":
      return {
        ...state,
        documents: state.documents.map((doc) =>
          doc.id === action.id && doc.requestId === action.requestId
            ? { ...doc, error: action.error, isLoading: false }
            : doc
        ),
      };

    case "EDIT":
      return {
        ...state,
        documents: state.documents.map((doc) =>
          doc.id === action.id
            ? { ...doc, content: action.content }
            : doc
        ),
      };

    case "CLOSE": {
      const index = state.documents.findIndex(
        (doc) => doc.id === action.id
      );

      if (index === -1) return state;

      const remaining = state.documents.filter(
        (doc) => doc.id !== action.id
      );

      const nextActive =
        state.activeDocumentId === action.id
          ? remaining[Math.min(index, remaining.length - 1)]?.id ?? null
          : state.activeDocumentId;

      return {
        documents: remaining,
        activeDocumentId: nextActive,
      };
    }

    default:
      return state;
  }
}

interface WorkspaceContextValue {
  documents: DocumentSession[];
  activeDocument: DocumentSession | null;
  openDocument: (file: ExplorerEntry) => Promise<void>;
  activateDocument: (id: string) => void;
  editDocument: (id: string, content: string) => void;
  closeDocument: (id: string) => void;
  setViewMode: (id: string, mode: ViewMode) => void;
}

const WorkspaceContext =
  createContext<WorkspaceContextValue | null>(null);

export function WorkspaceProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [state, dispatch] = useReducer(workspaceReducer, {
    documents: [],
    activeDocumentId: null,
  });

  //Provide setViewMode function
  const setViewMode = (id: string, mode: ViewMode) => {
  dispatch({
    type: "SET_VIEW_MODE",
    id,
    mode,
  });
};

  // Tracks documents already opened, including pending reads.
  const openIds = useRef(new Set<string>());
  const nextRequestId = useRef(0);

  const openDocument = useCallback(async (file: ExplorerEntry) => {
    if (file.isDirectory) return;

    const id = file.relativePath;

    if (openIds.current.has(id)) {
      dispatch({ type: "ACTIVATE", id });
      return;
    }

    openIds.current.add(id);
    const requestId = ++nextRequestId.current;

    dispatch({
      type: "OPEN",
      document: {
        id,
        name: file.name,
        relativePath: file.relativePath,
        content: "",
        savedContent: "",
        viewMode: "source",
        isLoading: true,
        error: null,
        requestId,
      },
    });

    try {
      const content = await readDocument(file.relativePath);

      dispatch({ type: "LOADED", id, requestId, content });
    } catch (error) {
      dispatch({
        type: "FAILED",
        id,
        requestId,
        error: String(error),
      });
    }
  }, []);

  const activateDocument = (id: string) => {
    dispatch({ type: "ACTIVATE", id });
  };

  const editDocument = (id: string, content: string) => {
    dispatch({ type: "EDIT", id, content });
  };

  const closeDocument = (id: string) => {
    openIds.current.delete(id);
    dispatch({ type: "CLOSE", id });
  };

  const activeDocument =
    state.documents.find(
      (doc) => doc.id === state.activeDocumentId
    ) ?? null;

  return (
    <WorkspaceContext.Provider
      value={{
        documents: state.documents,
        activeDocument,
        openDocument,
        activateDocument,
        editDocument,
        closeDocument,
        setViewMode,
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  const context = useContext(WorkspaceContext);

  if (!context) {
    throw new Error(
      "useWorkspace must be used inside WorkspaceProvider"
    );
  }

  return context;
}
