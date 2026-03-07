"use client"
import "@xterm/xterm/css/xterm.css"
import { useEffect, useRef } from "react"
import {Terminal} from "@xterm/xterm"
import {FitAddon} from "@xterm/addon-fit"


interface PreviewTerminalProps{
    output: string
}

function PreviewTerminal({output}:PreviewTerminalProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const terminalRef = useRef<Terminal | null>(null);
    const fitAddonRef = useRef<FitAddon | null>(null);
    const lastLengthRef = useRef(0)

    // initialize the terminal
    useEffect(()=>{
        // if there exists no container/ there exists a terminal already then early return
        if(!containerRef.current || terminalRef.current) return;

        const terminal = new Terminal({
            convertEol: true,
            disableStdin: true,
            fontSize: 12,
            fontFamily: "monospace",
            theme: {background: "#1f2228"}
        })

        // grab a new addon
        const fitAddon = new FitAddon()
        terminal.loadAddon(fitAddon)//push it to the new terminal
        terminal.open(containerRef.current)//open the terminal in the ref container

        terminalRef.current = terminal;//passing our terminal
        fitAddonRef.current = fitAddon;//and our addon

        // write existing output on mount
        if(output){
            terminal.write(output);
            lastLengthRef.current = output.length;
        }

        // every time a new animation is rendered fitAddon is called
        requestAnimationFrame(()=>fitAddon.fit())//running our fit addon to make it fit our terminal

        // similarly for the resizable observer, we pass the fitAddon
        const resizeObserver = new ResizeObserver(()=> fitAddon.fit())
        resizeObserver.observe(containerRef.current)//fitAddon renders each time the observer observes some changes on the containerRef

        // cleanup function
        return ()=>{
            resizeObserver.disconnect()
            terminal.dispose()
            terminalRef.current = null;
            fitAddonRef.current = null;
        }
        // "output" doesn't need to be in dependency since its not intended to update anything, just used on mount
    },[])


    // write the output
    useEffect(()=>{
        if(!terminalRef.current) return;

        // there are new outputs added then clear the current terminalRef and current lastLengthRef is set to 0
        if(output.length < lastLengthRef.current){
            terminalRef.current.clear();
            lastLengthRef.current = 0;
        }

        const newData = output.slice(lastLengthRef.current);
        if(newData){
            // grabbing the new data from the terminal
            terminalRef.current.write(newData);
            lastLengthRef.current = output.length;
        }
    },[output])
  return (
    <div
        ref={containerRef}//rendering the terminal via the ref
        className="flex-1 min-h-0 p-3 [&_.xterm]:h-full! [&_.xterm-viewport]:h-full! [&_.xterm-screen]:h-full! bg-sidebar"
    />
    // those gibberish class names are from xterm's
  )
}

export default PreviewTerminal