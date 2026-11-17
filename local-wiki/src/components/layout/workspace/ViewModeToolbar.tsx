
import type { ViewMode } from "@/types/document";

interface ViewModeToolbarProps {
  mode: ViewMode;
  onModeChange: (mode: ViewMode) => void;
}

export function ViewModeToolbar({
  mode,
  onModeChange,
}: ViewModeToolbarProps) {
  return (
      
    
    <div className="flex justify-end border-b border-gray-700 bg-gray-900 p-2">
      
      <div className="flex gap-1 rounded-md bg-gray-800 p-1">
    
        <button
          type="button"
          onClick={() => onModeChange("source")}
          className={`rounded px-3 py-1 text-sm ${
            mode === "source"
              ? "bg-blue-600 text-white"
              : "text-gray-400 hover:text-white"
          }`}
        >
          Source
        </button>

        <button
          type="button"
          onClick={() => onModeChange("split")}
          className={`rounded px-3 py-1 text-sm ${
            mode === "split"
              ? "bg-blue-600 text-white"
              : "text-gray-400 hover:text-white"
          }`}
        >
          Split
        </button>

        <button
          type="button"
          onClick={() => onModeChange("preview")}
          className={`rounded px-3 py-1 text-sm ${
            mode === "preview"
              ? "bg-blue-600 text-white"
              : "text-gray-400 hover:text-white"
          }`}
        >
          Preview
        </button>

      </div>
    </div>
  );
}
