import React, { useEffect, useMemo, useRef } from 'react'
import {oneDark} from "@codemirror/theme-one-dark"
import { customTheme } from '../extensions/theme'
import { getLanguageExtension } from '../extensions/language-extension'
import { keymap, EditorView } from '@codemirror/view'
import {indentWithTab} from "@codemirror/commands"
import { minimap } from '../extensions/minimap'
import {indentationMarkers} from "@replit/codemirror-indentation-markers"
import { customSetup } from '../extensions/custom-setup'
import { suggestion } from '../extensions/suggestion'
import { quickEdit } from '../extensions/quick-edit'
import { selectionTooltip } from '../extensions/selection-tooltip'

interface Props {
    filename: string,
    initialValue?: string,
    onChange: (value:string) => void
}

function CodeEditor({
    filename,
    initialValue="",
    onChange
}:Props) {
    const editorRef= useRef<HTMLDivElement>(null)
    const viewRef = useRef<EditorView | null>(null)

    // useMemo will only recompute the memoized value (using a callback function) when one of the dependencies has changed.
    // whenever the filename changes this useMemo recomputes the languageExtension 
    const languageExtension = useMemo(()=>getLanguageExtension(filename),[filename])

    useEffect(()=>{
        if(!editorRef.current) return; 
        
        const view = new EditorView({
            doc:initialValue,
            parent: editorRef.current,
            extensions: [
                oneDark,
                customTheme,
                customSetup,
                languageExtension,
                suggestion(filename),//our own extension which will render ai code snippet suggestions
                quickEdit(filename),//our own extension with ai edit modal
                selectionTooltip(),//our own extension for tooltip for chat with ai/ edit code with ai
                keymap.of([indentWithTab]),//to give tab indentation
                minimap(),
                indentationMarkers(),
                // to run the save/update file debounce
                EditorView.updateListener.of((update)=>{
                    if(update.docChanged){//if the file changed only then trigger onChange
                        onChange(update.state.doc.toString())
                    }
                })
            ]
        })

        viewRef.current = view

        return ()=>{
            view.destroy()//destroy the current view after passing it to viewRef.current
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    // initialValue is only used for initial doc
    },[languageExtension])

  return (
    // this renders the editor itself with useRef
    <div 
        ref={editorRef}
        className='size-full pl-4 bg-background'/>
  )
}

export default CodeEditor