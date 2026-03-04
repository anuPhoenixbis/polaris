import React, { useRef } from 'react'
import { Id } from '../../../../convex/_generated/dataModel'
import TopNavigation from './top-navigation'
import { useEditor } from '../hooks/use-editor'
import FileBreadcrumbs from './file-breadcrumbs'
import { useFile, useUpdateFile } from '@/features/projects/hooks/use-files'
import Image from 'next/image'
import CodeEditor from './code-editor'

const DEBOUNCE_MS = 1500

function EditorView({projectId}:{projectId: Id<"projects">}) {
    const {activeTabId} =  useEditor(projectId)
    const activeFile = useFile(activeTabId)
    const updateFile = useUpdateFile();
    // debounce timer using the timeout
    const timeoutRef = useRef<NodeJS.Timeout | null>(null)//setting up a timeout for when the re-initiate file updates

    const isActiveFileBinary = activeFile && activeFile.storageId 
    const isActiveFileText = activeFile && !activeFile.storageId
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
                        if(timeoutRef.current) clearTimeout(timeoutRef.current)
                        
                        timeoutRef.current = setTimeout(()=>{
                            updateFile({id: activeFile._id,content})//saving/updating the content of the file every 1.5 seconds
                        },DEBOUNCE_MS)
                    }}
                />
            )}
            {isActiveFileBinary && (
                <p>Implement Binary Preview</p>
            )}
        </div>
    </div>
  )
}

export default EditorView