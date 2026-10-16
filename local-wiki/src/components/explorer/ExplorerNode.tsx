import { listDirectory } from "@/lib/tauri";
import { ExplorerEntry } from "@/types/explorer";
import { useState} from "react";


interface ExplorerNodeProps{
    entry: ExplorerEntry; 
    onFileSelect: (entry: ExplorerEntry) => void; 
}//Data format/ Defaults

export function ExplorerNode({
        entry,
        onFileSelect,
    }: ExplorerNodeProps){

    const [isExpanded, setIsExpanded] = useState(false);
    const [entries, setEntries] = useState<ExplorerEntry[]>([]);

    async function HandleExpandDirectoryNode(path: string){
        const t = listDirectory(path);
        setIsExpanded(!isExpanded);
        const dirEntries = await listDirectory("");
        setEntries(dirEntries)
        console.log(t);
    }

    function HandleFileNodeSelect(entry: ExplorerEntry){
        onFileSelect(entry);
        console.log("Selected ", entry.relativePath);
    }


    return(
        
        <div>
           
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
                            onFileSelect={onFileSelect}
                            />
                        </div>
                        
                    ))}
        </div>
        
    );
}
