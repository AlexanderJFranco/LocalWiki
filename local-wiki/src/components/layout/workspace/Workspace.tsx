
import { DocumentTabBar } from "./DocumentTabBar";
import { DocumentWorkspace } from "./DocumentWorkspace";
import { TextEditor } from "@/components/editors/TextEditor";

export function Workspace() {
  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col">
     <DocumentTabBar></DocumentTabBar>
     <DocumentWorkspace></DocumentWorkspace>

      <div className="min-h-0 min-w-0 flex-1 overflow-hidden">
      </div>
    </div>
  );
}
