import React from 'react'
import { Doc } from '../../../../../convex/_generated/dataModel'
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuSeparator, ContextMenuShortcut, ContextMenuTrigger } from '@/components/ui/context-menu'
import { cn } from '@/lib/utils';
import { getItemPadding } from './constants';

function TreeItemWrapper({
    item,
    children,
    level,
    isActive,
    onClick,
    onDoubleClick,
    onRename,
    onDelete,
    onCreateFile,
    onCreateFolder
}:{
    item: Doc<"files">,
    children: React.ReactNode,
    level:number,
    isActive?: boolean,
    onClick?: ()=> void,
    onDoubleClick?: ()=>void,
    onRename?: ()=>void,
    onDelete?: ()=>void,
    onCreateFile?: ()=>void,
    onCreateFolder?: ()=>void,
}) {
    // these are the options that show use when we right click a file/folder on vs code
    // to create file/folder, rename or delete
  return (
    <ContextMenu>
        {/* each file/folder is a ContextMenuItem */}
        <ContextMenuTrigger asChild>
            <button 
                onClick={onClick}
                onDoubleClick={onDoubleClick}
                onKeyDown={(e)=>{
                    if(e.key==="Enter"){
                        e.preventDefault();
                        onRename?.();//render onRename only if it exists
                    }
                }}
                className={cn(
                    "group flex items-center gap-1 w-full h-5.5 hover:bg-accent/30 outline-none focus:ring-1 focus:ring-inset focus:ring-ring",
                    isActive && "bg-accent/30"
                )}
                style={{ paddingLeft: getItemPadding(level,item.type==="file")}}//left extra padding only for files file type
                >
                    {children}
                </button>
        </ContextMenuTrigger>
        <ContextMenuContent
            onCloseAutoFocus={(e)=>e.preventDefault()}
            className='w-64'
        >
            {item.type==="folder" && (
                <>
                    <ContextMenuItem
                        onClick={onCreateFile}
                        className='text-sm'
                    >
                        New file...
                    </ContextMenuItem>
                    <ContextMenuItem
                        onClick={onCreateFolder}
                        className='text-sm'
                    >
                        New folder...
                    </ContextMenuItem>
                    <ContextMenuSeparator/>
                </>
            )}
            <ContextMenuItem
                onClick={onRename}
                className='text-sm'
                >
                    Rename...
                    <ContextMenuShortcut>Enter</ContextMenuShortcut>
            </ContextMenuItem>
            <ContextMenuItem
                onClick={onDelete}
                className='text-sm'
                >
                    Delete
                    <ContextMenuShortcut>⌘Backspace</ContextMenuShortcut>
            </ContextMenuItem>
        </ContextMenuContent>
    </ContextMenu>
  )
}

export default TreeItemWrapper