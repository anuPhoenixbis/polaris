import {FileIcon,FolderIcon} from "@react-symbols/icons/utils"
import { ChevronRightIcon } from "lucide-react"
import { useState } from "react"
import { getItemPadding } from "./constants"

function CreateInput({
    type,
    level,
    onSubmit,
    onCancel
}:{
    type: "file" | "folder",
    // here the level shows the level which we are on to create the file/folder
    level: number,//this the level we were toggling in the collapse key trigger to collapse all the folders and files
    onSubmit: (name:string) => void,
    onCancel:  ()=>void
}) {
    const [value,setValue] = useState("")
    const handleSubmit = () =>{
        const trimmedValue = value.trim()
        if(trimmedValue) onSubmit(trimmedValue)
        else onCancel() 
    }
  return (
    <div 
        className="w-full flex items-center gap-1 h-5.5 bg-accent/30"
        style={{paddingLeft: getItemPadding(level,type==="file")}}//added the extra padding for files here
        >
        <div className="flex items-center gap-0.5">
            {type==="folder" && (
                <ChevronRightIcon className="size-4 shrink-0 text-muted-foreground"/>
            )}
            {type==="file" && (
                // this fileIcon renders the file icon based on the file type(like .tsx & .java)
                <FileIcon fileName={value} autoAssign className="size-4"/>
            )}
            {type==="folder" && (
                // similarly for folders as well
                <FolderIcon className="size-4" folderName={value}/>
            )}
        </div>
        {/* input to enter the file/folder name */}
        <input 
            type="text" 
            autoFocus
            onChange={(e)=>setValue(e.target.value)}
            className="flex-1 bg-transparent text-sm outline-none focus:ring-1 focus:ring-inset focus:ring-ring"
            onBlur={handleSubmit}//considering the submission when blurred
            onKeyDown={(e)=>{
                if(e.key === "Enter") handleSubmit();
                if(e.key === "Escape") onCancel();
            }}
            />
    </div>
  )
}

export default CreateInput