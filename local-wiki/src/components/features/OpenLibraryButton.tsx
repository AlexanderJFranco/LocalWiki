import {open} from "@tauri-apps/plugin-dialog";

interface OpenLibraryButtonProps{
    onClick: () => void;
}

export function OpenLibraryButton({
    onClick,
}: OpenLibraryButtonProps){

   

    return(
        <button onClick={onClick}>
            Open Library
        </button>
    );

}