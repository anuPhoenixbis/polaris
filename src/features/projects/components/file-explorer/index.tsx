import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import { ChevronRightIcon, CopyMinusIcon, FilePlusCornerIcon, FolderPlusIcon } from 'lucide-react'
import React, { useState } from 'react'
import { Id } from '../../../../../convex/_generated/dataModel'
import { useProject } from '../../hooks/use-projects'
import { Button } from '@/components/ui/button'
import { useCreateFile, useCreateFolder, useFolderContents } from '../../hooks/use-files'
import CreateInput from './create-input'
import LoadingRow from './loading-row'
import Tree from './tree'

function FileExplorer({
    projectId
}:{projectId:Id<"projects">}) {
    
    const [isOpen,setIsOpen] = useState(true)//to open the files/folders in the current project
    const [collapseKey,setCollapseKey] = useState(0)//collapse trigger
    const [creating,setCreating] = useState<"file"|"folder"|null>(null)//file/folder creation trigger; when set to null we don't create anything
    const project = useProject(projectId);
    
    const rootFiles = useFolderContents({//get the root files
        projectId,
        enabled: isOpen//enabled only when the explorer is opened
    })
    const createFile = useCreateFile()
    const createFolder = useCreateFolder()

    const handleCreate = (name:string)=>{
        setCreating(null);

        if(creating === "file"){
            createFile({
                projectId,
                name,
                content:"",
                parentId: undefined,
            })
        }else{
            createFolder({
                projectId,
                name,
                parentId: undefined
            })
        }
    }
    
  return (
    <div className='h-full bg-sidebar'>
        <ScrollArea>
            <div
                role="button"
                tabIndex={0}
                onClick={()=>setIsOpen((value)=>!value)}
                // keyboard toggle for the file explorer panel
                onKeyDown={(e)=>{
                    if(e.key === "Enter" || e.key === " "){
                        e.preventDefault()
                        setIsOpen((value)=>!value)
                    }
                }}
                className='group/project cursor-pointer w-full text-left flex items-center gap-0.5 h-5.5 bg-accent font-bold'>
                    <ChevronRightIcon className={cn(
                        "size-4 shrink-0 text-muted-foreground",
                        isOpen && "rotate-90"
                    )}/>
                    <p className='text-sm uppercase line-clamp-1'>
                        {project?.name ?? "Loading..."}
                    </p>
                    <div className="opacity-0 group-hover/project:opacity-100 transition-none duration-0 flex items-center gap-0.5 ml-auto">
                        {/* file creation button */}
                        <Button
                            onClick={(e)=>{
                                e.stopPropagation();
                                e.preventDefault();
                                setIsOpen(true)
                                setCreating("file")
                            }}
                            variant="highlight"
                            size="icon-xs"
                        >
                            <FilePlusCornerIcon className='size-3.5'/>
                        </Button>
                        {/* folder creation button */}
                        <Button
                            onClick={(e)=>{
                                e.stopPropagation();
                                e.preventDefault();
                                setIsOpen(true)
                                setCreating("folder")
                            }}
                            variant="highlight"
                            size="icon-xs"
                        >
                            <FolderPlusIcon className='size-3.5'/>
                        </Button>
                        {/* Collapse files/folders button */}
                        <Button
                            onClick={(e)=>{
                                e.stopPropagation();
                                e.preventDefault();
                                setIsOpen(true)
                                setCollapseKey((prev)=>prev+1)
                                // reset collapse
                            }}
                            variant="highlight"
                            size="icon-xs"
                        >
                            <CopyMinusIcon className='size-3.5'/>
                        </Button>
                    </div>
            </div>
            {/* when the folder/files panel is open and we are creating something then we provide the createInput */}
            {isOpen && (
                <>
                {/* when there are no root files/folders we show the spinner here */}
                {rootFiles === undefined && <LoadingRow level={0}/>}
                {creating && (
                    <CreateInput
                        type={creating}
                        level={0}
                        onSubmit={handleCreate}
                        onCancel={()=>setCreating(null)} />
                )}
                {/* rendering the root files/folders */}
                {rootFiles?.map((item)=>{
                    return <Tree
                        key={`${item._id}-${collapseKey}`}//the key contains the collapse key to easily collapse the entire file tree
                        item={item}
                        level={0}
                        projectId={projectId}
                        />
                })}
                </>
            )}
        </ScrollArea>
    </div>
  )
}

export default FileExplorer