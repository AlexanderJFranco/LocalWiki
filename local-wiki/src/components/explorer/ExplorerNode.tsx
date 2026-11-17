import { listDirectory } from "@/lib/tauri";
import { ExplorerEntry } from "@/types/explorer";
import { useState, useEffect } from "react";




interface ExplorerNodeProps {
  entry: ExplorerEntry;
  onFileSelect: (entry: ExplorerEntry) => void;
  onRename: (entry: ExplorerEntry) => void;
  onDelete: (entry: ExplorerEntry) => void;
}

export function ExplorerNode({
        entry,
        onFileSelect,
        onRename,
        onDelete,
    }: ExplorerNodeProps){

    const MENU_OPEN_EVENT = "localwiki:explorer-menu-open";
    const [isExpanded, setIsExpanded] = useState(false);
    const [entries, setEntries] = useState<ExplorerEntry[]>([]);
    const [menu, setMenu] = useState<{
                                        x: number;
                                        y: number;
                                        } | null>(null);

    
function handleContextMenu(event: React.MouseEvent) {
  event.preventDefault();
  event.stopPropagation();

  // Tell every other ExplorerNode to close its menu.
  window.dispatchEvent(
    new CustomEvent(MENU_OPEN_EVENT, {
      detail: entry.relativePath,
    })
  );

  // Open this node's menu.
  setMenu({
    x: event.clientX,
    y: event.clientY,
  });
}

    
    async function HandleExpandDirectoryNode(path: string){
        const t = listDirectory(path);
        setIsExpanded(!isExpanded);
        const dirEntries = await listDirectory(path);
        setEntries(dirEntries)
        console.log(t);
    }

    function HandleFileNodeSelect(entry: ExplorerEntry){
        onFileSelect(entry);
        console.log("Selected ", entry.relativePath);
    }


        useEffect(() => {
        if (!menu) return;

        function handleOutsideClick() {
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
            window.removeEventListener("pointerdown", handleOutsideClick);
            window.removeEventListener("keydown", handleEscape);
        };
        }, [menu]);



    return(
        
        <div onContextMenu={handleContextMenu}>
           
                <div className="bg-gray-100 hover:bg-blue-200 transition-colors duration-150 rounded-md px-1 cursor-pointer whitespace-nowrap">
                {entry.isDirectory ? (
                    <span>📁 </span>
                    ) :
                    <span>📄 </span>
                    }
                <span onClick={() => entry.isDirectory ? HandleExpandDirectoryNode(entry.relativePath)
                    : HandleFileNodeSelect(entry)
                    }> : {entry.name}</span>
                    </div>
                    {isExpanded && entries.length > 0 &&  entries.map((child) => (
                        <div className="px-2">
                            <ExplorerNode
                            entry={child}
                            onFileSelect={onFileSelect}//Pass main panel file assignment function
                            onRename={onRename}
                            onDelete={onDelete}
                            />
                        </div>
                        
                    ))}

{menu && (
  <div
    className="fixed z-50 w-40 rounded-md border border-gray-700 bg-gray-800 p-1 shadow-lg"
    style={{
      left: menu.x,
      top: menu.y,
    }}
    onClick={(event) => event.stopPropagation()}
    onMouseLeave={() => setMenu(null)}
  >
    <button
      type="button"
      className="block w-full rounded px-3 py-2 text-left text-sm hover:bg-gray-700"
      onClick={() => {
        setMenu(null);
        onRename(entry);
      }}
    >
      Rename
    </button>

    <button
      type="button"
      className="block w-full rounded px-3 py-2 text-left text-sm text-red-400 hover:bg-gray-700"
      onClick={() => {
        setMenu(null);
        onDelete(entry);
      }}
    >
      Delete
    </button>
  </div>
)}

        </div>

        
        
    );
}
