
import {useState} from 'react';
import { FileExplorer } from '../explorer/FileExplorer';
import { ExplorerEntry } from '@/types/explorer';


interface SidebarProps{
    onFileSelect: (entry: ExplorerEntry) => void;
}

export function Sidebar({onFileSelect}: SidebarProps){



    return(
        <div className="flex items-center justify-between">
            <FileExplorer onFileSelect={onFileSelect}/>
        </div>
    );
}