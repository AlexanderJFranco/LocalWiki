import { ExplorerEntry } from "@/types/explorer";

interface RawTextViewerProps{
    selectedFile: ExplorerEntry | null;
}

export function RawTextViewer({selectedFile,}:RawTextViewerProps){
    

    return(
        <span>{selectedFile?.name}</span>
    );
}