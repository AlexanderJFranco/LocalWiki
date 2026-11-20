
import type { ViewMode } from "@/types/document";
import { VscSplitHorizontal } from "react-icons/vsc";
import { AiOutlineFileMarkdown } from "react-icons/ai";
import { TbSourceCode } from "react-icons/tb";

interface ViewModeToolbarProps {
  mode: ViewMode;
  onModeChange: (mode: ViewMode) => void;
}

export function ViewModeToolbar({
  mode,
  onModeChange,
}: ViewModeToolbarProps) {
  return (
      
    
    <div className="flex justify-end   p-2">
      
      <div className="flex gap-1 rounded-md bg-gray-800 p-1">
    
        <button
          type="button"
          onClick={() => onModeChange("source")}
          className="rounded px-3 py-1 text-sm'"
        >
          <TbSourceCode
          className={`
                        transition-colors duration-150
                        ${
                          mode === "source"
                            ? "text-blue-400"
                            : "text-gray-400 hover:text-white"
                        }
                      `}
                    />
                  </button>

        <button
          type="button"
          onClick={() => onModeChange("split")}
          className="rounded px-3 py-1 text-sm "
        >
          <VscSplitHorizontal
          className={`
                        transition-colors duration-150
                        ${
                          mode === "split"
                            ? "text-blue-400"
                            : "text-gray-400 hover:text-white"
                        }
                      `}
          />
        </button>

        <button
          type="button"
          onClick={() => onModeChange("preview")}
          className="rounded px-3 py-1 text-sm "
        >
          <AiOutlineFileMarkdown
          className={`
                        transition-colors duration-150
                        ${
                          mode === "preview"
                            ? "text-blue-400"
                            : "text-gray-400 hover:text-white"
                        }
                      `}
          />
        </button>

      </div>
    </div>
  );
}
