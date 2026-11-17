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

export async function readDocument(
        relativePath: string
    ): Promise<string>{
        return invoke<string>("read_document",{
            relativePath,
        });
    }


export async function writeDocument(
    relativePath: string,
    content: string
) : Promise<void> {
    await invoke<void>("write_document", {
        relativePath,
        content,
    });
    
}


export async function createDocument(
  relativePath: string
): Promise<void> {
  await invoke<void>("create_document", {
    relativePath,
  });
}


export async function renameEntry(
  relativePath: string,
  newName: string
): Promise<void> {
  await invoke<void>("rename_entry", {
    relativePath,
    newName,
  });
}

export async function deleteEntry(
  relativePath: string
): Promise<void> {
  await invoke<void>("delete_entry", {
    relativePath,
  });
}


export async function resolveWikiLink(
  target: string
): Promise<string> {
  return invoke<string>("resolve_wiki_link", {
    target,
  });
}


export interface LibraryFeatures {
  definitions: boolean;
  tags: boolean;
}

export async function checkLibraryDirectories(): Promise<LibraryFeatures> {
  return invoke<LibraryFeatures>("check_library_directories");
}

export async function initializeLibraryDirectories(
  directories: string[]
): Promise<void> {
  return invoke<void>("initialize_library_directories", {
    directories,
  });
}
