
import { listDirectory } from "@/lib/tauri";
import type { ExplorerEntry } from "@/types/explorer";
import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
const MENU_OPEN_EVENT = "localwiki:explorer-menu-open";
import { FaFolder, FaFolderPlus, FaPen, FaRegFolderOpen, FaTrash } from "react-icons/fa";
import { FaFile } from "react-icons/fa";
import { RiGitbookFill, RiGitbookLine } from "react-icons/ri";
import { IoPricetagsOutline, IoPricetagsSharp } from "react-icons/io5";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { FaFileCirclePlus } from "react-icons/fa6";

interface ExplorerNodeProps {
  entry: ExplorerEntry;
  refreshVersion: number;

  onFileSelect: (entry: ExplorerEntry) => void;
  onRename: (entry: ExplorerEntry) => void;
  onDelete: (entry: ExplorerEntry) => void;

  onCreateFile:  (parentPath: string) => void;
  onCreateDirectory:  (parentPath: string) => void;

  collapseVersion: number;
  searchQuery: string;
  visiblePaths: Set<string>;
}

export function ExplorerNode({
  entry,
  refreshVersion,
  onFileSelect,
  onRename,
  onDelete,
  collapseVersion,
  onCreateFile,
  onCreateDirectory,
  searchQuery,
  visiblePaths,
}: ExplorerNodeProps) {

  // Tracks whether this directory is expanded.
  const [isExpanded, setIsExpanded] = useState(false);

  const hasMatchingDescendants =
  searchQuery.trim().length > 0 &&
  entry.isDirectory &&
  [...visiblePaths].some((path) =>
    path.replace(/\\/g, "/").startsWith(
      `${entry.relativePath.replace(/\\/g, "/")}/`
    )
  );

const shouldExpand = isExpanded || hasMatchingDescendants;

  // Stores this directory's children.
  const [entries, setEntries] = useState<ExplorerEntry[]>([]);
  const { activeDocument } = useWorkspace();

  const isActive = !entry.isDirectory && activeDocument?.id === entry.relativePath

  // Tracks the right-click context menu.
  const [menu, setMenu] = useState<{
    x: number;
    y: number;
  } | null>(null);



  // ============================================
  // 1. EXPAND OR COLLAPSE A DIRECTORY
  // ============================================

  function handleExpandDirectoryNode() {
    if (!entry.isDirectory) return;

    // Only update expansion state here.
    // The effect below handles loading children.
    setIsExpanded((previous) => !previous);
  }

  // ============================================
  // 2. LOAD AND REFRESH DIRECTORY CONTENTS
  // ============================================

  useEffect(() => {
    if (!entry.isDirectory || !shouldExpand) {
      return;
    }

    let cancelled = false;

    async function refreshDirectory() {
      try {
        const updatedEntries = await listDirectory(
          entry.relativePath
        );

        if (!cancelled) {
          setEntries(updatedEntries);
        }
      } catch (error) {
        console.error(
          `Failed to load directory ${entry.relativePath}:`,
          error
        );
      }
    }
    

    refreshDirectory();

    return () => {
      cancelled = true;
    };
  }, [
    entry.isDirectory,
    entry.relativePath,
    shouldExpand,
    refreshVersion,
  ]);

  // ============================================
  // 3. FILE SELECTION
  // ============================================

  function handleFileNodeSelect() {
    onFileSelect(entry);
    console.log("Selected", entry.relativePath);
  }

  // ============================================
  // 4. CONTEXT MENU
  // ============================================

  function handleContextMenu(event: React.MouseEvent) {
    event.preventDefault();
    event.stopPropagation();

    window.dispatchEvent(
      new CustomEvent(MENU_OPEN_EVENT, {
        detail: entry.relativePath,
      })
    );

    setMenu({
      x: event.clientX,
      y: event.clientY,
    });
  }


function getEntryIcon(entry: ExplorerEntry) {
  // Directories
  if (entry.isDirectory ) {
    if (entry.name === ".def" && !shouldExpand) {
      return <RiGitbookFill  className="text-green-700" />;
    }
    if (entry.name === ".def" && shouldExpand) {
      return <RiGitbookLine  className="text-green-700" />;
    }

    if (entry.name === ".tags" && !shouldExpand) {
      return <IoPricetagsSharp className="text-purple-600" />;
    }

    if (entry.name === ".tags" && shouldExpand) {
      return <IoPricetagsOutline className="text-purple-600" />;
    }

    return shouldExpand
      ? <FaRegFolderOpen className="text-yellow-500" />
      : <FaFolder className="text-yellow-500" />;
  }

  // Files
  if (entry.name.toLowerCase().endsWith(".md")) {
    return <FaFile className="text-blue-400" />;
  }

  return <FaFile className="text-gray-400" />;
}

useEffect(() => {
  setIsExpanded(false);
}, [collapseVersion]);



useEffect(() => {
  if (!menu) return;

  function handleOutsideClick(event: PointerEvent) {
    const target = event.target;

    // Ignore clicks inside the context menu.
    if (
      target instanceof Element &&
      target.closest("[data-explorer-menu]")
    ) {
      return;
    }

    // Close only when clicking outside.
    setMenu(null);
  }

  function handleEscape(event: KeyboardEvent) {
    if (event.key === "Escape") {
      setMenu(null);
    }
  }

  window.addEventListener("pointerdown", handleOutsideClick);
  window.addEventListener("keydown", handleEscape);

  return () => {
    window.removeEventListener(
      "pointerdown",
      handleOutsideClick
    );

    window.removeEventListener(
      "keydown",
      handleEscape
    );
  };
}, [menu]);


  // ============================================
  // 5. RENDER
  // ============================================

 
return (
  <div onContextMenu={handleContextMenu}>

    {/* File or directory row */}
    <div
      className={`
        flex items-center gap-2
        min-w-0 rounded-md px-2 py-1
        whitespace-nowrap cursor-pointer
        transition-colors duration-150
        text-black
        ${
          isActive
            ? "bg-blue-500 hover:bg-blue-500"
            : "bg-transparent hover:bg-blue-200"
        }
      `}
      onClick={
        entry.isDirectory
          ? handleExpandDirectoryNode
          : handleFileNodeSelect
      }
    >
      {/* File / folder icon */}
      <span className="flex shrink-0 items-center">
        {getEntryIcon(entry)}
      </span>

      {/* File / folder name */}
      <span className="min-w-0 truncate text-sm">
        {entry.name}
      </span>
    </div>

   
{/* Recursive directory children */}
{entry.isDirectory &&
  shouldExpand &&
  entries.map((child) => {
    const isVisible =
      !searchQuery.trim() ||
      visiblePaths.has(child.relativePath);

    return (
      <div
        key={child.relativePath}
        className={`pl-3 ${isVisible ? "" : "hidden"}`}
      >
        <ExplorerNode
          entry={child}
          refreshVersion={refreshVersion}
          collapseVersion={collapseVersion}
          searchQuery={searchQuery}
          visiblePaths={visiblePaths}
          onFileSelect={onFileSelect}
          onRename={onRename}
          onDelete={onDelete}
          onCreateFile={onCreateFile}
          onCreateDirectory={onCreateDirectory}
        />
      </div>
    );
  })}

    {/* Context menu */}
    {menu &&
      createPortal(
        <div
          data-explorer-menu
          role="menu"
          className="
            fixed z-[9999] w-52
            rounded-lg
            border border-[#454950]
            bg-[#25282E]
            p-1.5
            text-[#E6ECF5]
            shadow-[0_8px_24px_rgba(0,0,0,0.45)]
          "
          style={{
            left: menu.x,
            top: menu.y,
          }}
          onContextMenu={(event) => event.preventDefault()}
        >
          {/* Directory-specific actions */}
          {entry.isDirectory && (
            <>
              {/* Add File */}
              <button
                type="button"
                role="menuitem"
                className="
                  flex w-full items-center gap-3
                  rounded-md px-3 py-2
                  !border-0 !bg-transparent
                  text-left text-sm !text-[#E6ECF5]
                  hover:!bg-[#3A3F46]
                "
                onClick={() => {
                  setMenu(null);
                  onCreateFile(entry.relativePath);
                }}
              >
                <FaFileCirclePlus
                  className="shrink-0 text-[#ABB2BF]"
                />
                <span>Add File</span>
              </button>

              {/* Add Directory */}
              <button
                type="button"
                role="menuitem"
                className="
                  flex w-full items-center gap-3
                  rounded-md px-3 py-2
                  !border-0 !bg-transparent
                  text-left text-sm !text-[#E6ECF5]
                  hover:!bg-[#3A3F46]
                "
                onClick={() => {
                  setMenu(null);
                  onCreateDirectory(entry.relativePath);
                }}
              >
                <FaFolderPlus
                  className="shrink-0 text-[#ABB2BF]"
                />
                <span>Add Directory</span>
              </button>

              {/* Separator */}
              <div className="my-1.5 h-px bg-[#454950]" />
            </>
          )}

          {/* Rename */}
          <button
            type="button"
            role="menuitem"
            className="
              flex w-full items-center gap-3
              rounded-md px-3 py-2
              !border-0 !bg-transparent
              text-left text-sm !text-[#E6ECF5]
              hover:!bg-[#3A3F46]
            "
            onClick={() => {
              setMenu(null);
              onRename(entry);
            }}
          >
            <FaPen className="shrink-0 text-[#ABB2BF]" />
            <span>Rename</span>
          </button>

          {/* Delete */}
          <button
            type="button"
            role="menuitem"
            className="
              flex w-full items-center gap-3
              rounded-md px-3 py-2
              !border-0 !bg-transparent
              text-left text-sm !text-[#E06C75]
              hover:!bg-[#3A3F46]
            "
            onClick={() => {
              setMenu(null);
              onDelete(entry);
            }}
          >
            <FaTrash className="shrink-0 text-[#E06C75]" />
            <span>Delete</span>
          </button>
        </div>,
        document.body
      )}
  </div>
);
}

