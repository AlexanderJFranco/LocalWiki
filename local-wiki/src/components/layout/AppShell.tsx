import { Sidebar } from "./Sidebar";
import { useRef, useState, type ReactNode } from "react";
import '../../App.css';
import { ExplorerEntry } from "@/types/explorer";




interface AppShellProps {
    children: ReactNode;
    onFileSelect: (entry: ExplorerEntry) => void;
}

export function AppShell({ children, onFileSelect } : AppShellProps){
    //Initialize current sidebar width
    const [sidebarWidth, setSidebarWidth] = useState(256);

    const shellRef = useRef<HTMLDivElement>(null);

    const MIN_WIDTH = 180;
    const MAX_WIDTH = 500;

    function handlePointerDown(event: React.PointerEvent<HTMLDivElement>) {
    // Only react to the primary mouse button, or touch/pen input.
    if (!event.isPrimary || (event.pointerType === "mouse" && event.button !== 0)) {
      return;
    }

    const handle = event.currentTarget;
    handle.setPointerCapture(event.pointerId);

    // Measure the shell's position on the screen.
    const shellLeft = shellRef.current?.getBoundingClientRect().left ?? 0;

    function handlePointerMove(e: PointerEvent) {
      // Calculate the distance from the shell's left edge.
      const proposedWidth = e.clientX - shellLeft;

      // Keep the sidebar within its allowed dimensions.
      const constrainedWidth = Math.min(
        MAX_WIDTH,
        Math.max(MIN_WIDTH, proposedWidth)
      );

      setSidebarWidth(constrainedWidth);
    }

    function stopResizing() {
      handle.removeEventListener("pointermove", handlePointerMove);
      handle.removeEventListener("pointerup", stopResizing);
      handle.removeEventListener("pointercancel", stopResizing);
    }

    // Track dragging even if the pointer leaves the handle.
    handle.addEventListener("pointermove", handlePointerMove);
    handle.addEventListener("pointerup", stopResizing, { once: true });
    handle.addEventListener("pointercancel", stopResizing, { once: true });
  }

  


    return(
       <div ref={shellRef} className="flex h-screen overflow-hidden">
      {/* Sidebar width is controlled by React state. */}
      <aside
        className="flex shrink-0 flex-col overflow-y-auto"
        style={{ width: sidebarWidth }}
      >
        <Sidebar onFileSelect={onFileSelect} />
      </aside>

      {/* Draggable right-hand boundary. */}
      <div
        role="separator"
        aria-orientation="vertical"
        onPointerDown={handlePointerDown}
        className="w-1 shrink-0 cursor-col-resize bg-gray-600 hover:bg-blue-500"
        style={{ touchAction: "none" }}
      />

      {/* Main editor fills whatever space remains. */}
      <main className="min-w-0 flex-1 overflow-auto p-6">
        {children}
      </main>
    </div>
    );
}