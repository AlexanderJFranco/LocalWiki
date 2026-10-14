import { invoke } from "@tauri-apps/api/core";
import type { ExplorerEntry } from "../types/explorer";

//Request that Rust register a workspace directory
export async function openLibrary(path: string): Promise<void> {
    return invoke<void>("open_library", {path});
}

//Retrieve children of a folder within the active library
export async function listDirectory(relativePath: string = " "
    ): Promise<ExplorerEntry[]>{
        return invoke<ExplorerEntry[]>("list_directory", {relativePath});
    }