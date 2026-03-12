import React, { useEffect, useRef } from 'react'
import { Id } from '../../../../convex/_generated/dataModel'
import TopNavigation from './top-navigation'
import { useEditor } from '../hooks/use-editor'
import FileBreadcrumbs from './file-breadcrumbs'
import { useFile, useUpdateFile } from '@/features/projects/hooks/use-files'
import Image from 'next/image'
import CodeEditor from './code-editor'
import { AlertTriangleIcon } from 'lucide-react'

const DEBOUNCE_MS = 1500

function EditorView({projectId}:{projectId: Id<"projects">}) {
    const {activeTabId} =  useEditor(projectId)
    const activeFile = useFile(activeTabId)
    const updateFile = useUpdateFile();
    // debounce timer using the timeout
    const timeoutRef = useRef<NodeJS.Timeout | null>(null)//setting up a timeout for when the re-initiate file updates
    const pendingSaveRef = useRef<{id : Id<"files">; content: string} | null>(null) 

    const isActiveFileBinary = activeFile && activeFile.storageId 
    const isActiveFileText = activeFile && !activeFile.storageId

    // cleanup pending debounced updates on unmount or file change 
    useEffect(()=>{
        return ()=>{
            if(timeoutRef.current){
                clearTimeout(timeoutRef.current)
                timeoutRef.current = null
            }
            if(pendingSaveRef.current){
                updateFile(pendingSaveRef.current)
                pendingSaveRef.current = null;
            }
        }
    },[activeTabId,updateFile])
  return (
    <div className='h-full flex flex-col'>
        <div className="flex items-center">
            <TopNavigation projectId={projectId} />
        </div>
        {activeTabId && <FileBreadcrumbs projectId={projectId} />}
        <div className="flex-1 min-h-0 bg-background">
            {!activeFile && (
                <div className='size-full flex items-center justify-center'>
                    <Image
                        src='/logo-alt.svg'
                        alt="Polaris"
                        width={50}
                        height={50}
                        className='opacity-25' />
                </div>
            )}
            {isActiveFileText && (
                <CodeEditor 
                    key={activeFile._id}
                    filename={activeFile.name} 
                    initialValue={activeFile.content}
                    onChange={(content: string)=>{
                        if(timeoutRef.current) clearTimeout(timeoutRef.current)//clearing out when multiple debounced updates are live
                        pendingSaveRef.current = {id : activeFile._id, content}//saving the content if the debounce runs out before the file is saved using pendingSaveRef
                        
                        timeoutRef.current = setTimeout(()=>{
                            if(pendingSaveRef.current){
                                updateFile({id: activeFile._id,content})//saving/updating the content of the file every 1.5 seconds
                                pendingSaveRef.current = null
                            }
                            timeoutRef.current = null
                        },DEBOUNCE_MS)
                    }}
                />
            )}
            {isActiveFileBinary && (
                <div className='size-full flex items-center justify-center'>
                    <div className='flex flex-col items-center gap-2.5 max-w-md text-center'>
                        <AlertTriangleIcon className='size-10 text-yellow-500' />
                        <p className="text-sm">
                            The file is not displayed in the text editor because it is either binary or uses an unsupported text encoding.
                        </p>
                    </div>
                </div>
            )}
        </div>
    </div>
  )
}

export default EditorView