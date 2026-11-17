
import {useState} from 'react';
import { FileExplorer } from '../explorer/FileExplorer';
import { ExplorerEntry } from '@/types/explorer';


interface SidebarProps{
    onFileSelect: (entry: ExplorerEntry) => void;
}

export function Sidebar({onFileSelect}: SidebarProps){



    return(
        <div className="flex h-full w-full min-w-0 flex-col gap-2 overflow-hidden p-3">
            <FileExplorer onFileSelect={onFileSelect}/>
        </div>
    );
}