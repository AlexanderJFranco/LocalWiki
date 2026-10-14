import {open} from "@tauri-apps/plugin-dialog";

interface OpenLibraryButtonProps{
    onLibrarySelected: (path: string) => void;
}

export function OpenLibraryButton({
    onLibrarySelected,
}: OpenLibraryButtonProps){

    async function handleOpenLibrary(){
        try{
            //Ask OS to open default directory selection dialog
            const selectedPath = await open({
                directory: true,
                multiple: false,
                recursive: true,
                title: "Open Local Wiki Library",
            });

            //If nothing was selected
            if(selectedPath == null)
                return;

            onLibrarySelected(selectedPath);
        }//end try
        catch (error){
            console.error("Failed to select library: ", error);
        }
    }

    return(
        <button onClick={handleOpenLibrary}>
            Open Library
        </button>
    );

}