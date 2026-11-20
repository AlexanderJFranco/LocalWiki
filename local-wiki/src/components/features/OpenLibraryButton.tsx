import {open} from "@tauri-apps/plugin-dialog";
import { FaFolderOpen } from "react-icons/fa";

interface OpenLibraryButtonProps{
    onClick: () => void;
}

export function OpenLibraryButton({
    onClick,
}: OpenLibraryButtonProps){

   

    return(
        
        <div className="">   
            <button onClick={onClick}>
                Open Library
            </button>

            
(
  <div className="flex flex-1 flex-col items-center justify-center gap-3 px-4">
    <button
      type="button"
      onClick={onClick}
      className="
        flex items-center justify-center gap-2
        rounded-lg
        !border-0 !bg-blue-500
        px-5 py-2.5
        text-sm font-medium !text-white
        shadow-sm
        transition-colors duration-150
        hover:!bg-blue-600
        active:!bg-blue-700
        focus-visible:outline-2
        focus-visible:outline-offset-2
        focus-visible:outline-blue-500
      "
    >
      <FaFolderOpen className="text-base" />
      Open Library
    </button>

    <span className="text-center text-xs text-gray-500">
      No Library Selected
    </span>
  </div>
)

        </div>
      
       
    );

}