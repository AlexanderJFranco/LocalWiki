
import { FileExplorer } from "../explorer/FileExplorer";
import type { ExplorerEntry } from "@/types/explorer";

interface SidebarProps {
  onFileSelect: (entry: ExplorerEntry) => void;
}

export function Sidebar({ onFileSelect }: SidebarProps) {
  return (
    <div className="flex h-full min-h-0 w-full min-w-0 flex-col gap-2 overflow-hidden bg-[#e6ecf5] p-3">
      <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
        <FileExplorer onFileSelect={onFileSelect} />
      </div>
    </div>
  );
}
