import React from "react";
import ReactDOM from "react-dom/client";

import App from "./App";
import { WorkspaceProvider } from "@/contexts/WorkspaceContext";
import { LibraryIndexProvider } from "./contexts/LibraryIndexContext";
import { TagManagerHost } from "@/components/features/TagManagerHost";

ReactDOM.createRoot(
  document.getElementById("root")!
).render(
  <React.StrictMode>
    <LibraryIndexProvider>
      <WorkspaceProvider>
      <TagManagerHost />
      <App />
    </WorkspaceProvider>
    </LibraryIndexProvider>
    
  </React.StrictMode>
);