import { WebContainer } from "@webcontainer/api";
import { Id } from "../../../../convex/_generated/dataModel";
import { useCallback, useEffect, useRef, useState } from "react";
import { useFiles } from "@/features/projects/hooks/use-files";
import { buildFileTree, getFilePath } from "../utils/file-tree";

// singleton webcontainer instance
let webcontainerInstance: WebContainer | null = null;
let bootPromise: Promise<WebContainer> | null = null;

const getWebContainer = async(): Promise<WebContainer> =>{
    if(webcontainerInstance) return webcontainerInstance//if a webcontainer instance already exists then return it

    if(!bootPromise){//not booting the container instance twice
        bootPromise = WebContainer.boot({coep: "credentialless"})
    }

    webcontainerInstance = await bootPromise;//pass in the bootPromise to the webcontainer instance
    return webcontainerInstance
}

const tearDownWebContainer = () =>{
    if(webcontainerInstance){
        webcontainerInstance.teardown()
        webcontainerInstance = null;
    }

    bootPromise=null;
}

interface UseWebContainerProps{
    projectId: Id<"projects">;
    enabled: boolean;
    settings?: {
        installCommand?: string;
        devCommand?: string;
    };
}

export const useWebContainer = ({
    projectId,
    enabled,
    settings,
}: UseWebContainerProps)=>{
    const [status,setStatus] = useState<"idle"|"booting"|"installing"|"running"|"error">("idle");
    const [previewUrl,setPreviewUrl] = useState<string| null>(null);
    const [error,setError] = useState<string|null>(null)
    const [restartKey, setRestartKey] = useState(0);
    const [terminalOutput,setTerminalOutput] = useState("")

    const containerRef = useRef<WebContainer | null>(null);
    const hasStartedRef = useRef(false);//to prevent duping the webcontainer instances

    // fetch files from Convex(auto-updates on changes)
    const files = useFiles(projectId)//get the files directly from convex

    //  initial boot and mount of the container
    useEffect(()=>{
        // if we didn't enable the boot/ there aren't any files to load/we have previously boot and this is an accidental boot then we don't boot again
        if(!enabled || !files || files.length===0 || hasStartedRef.current){
            return ;
        }

        hasStartedRef.current = true;

        const start = async()=>{
            try {
                // get the initial booting values
                setStatus("booting");
                setError(null);
                setTerminalOutput("");

                const appendOutput = (data: string) =>{
                    // add the current output to the terminal output
                    setTerminalOutput((prev)=> prev+data);
                }

                const container = await getWebContainer()//get web container instance
                containerRef.current = container;//pass it in the container ref

                const fileTree = buildFileTree(files);//build the web container compatible file tree
                await container.mount(fileTree);//just mount the fileTree to the container

                // broadcast the container on the provided port and url
                container.on("server-ready", (_port,url)=>{
                    setPreviewUrl(url);
                    setStatus("running");
                })

                setStatus("installing")

                // parse install command (default: npm i)
                const installCmd = settings?.installCommand || "npm i";
                const [installBin, ...installArgs] = installCmd.split(" ");//like ["npm","run","dev"] is the user gives : npm run dev

                appendOutput(`$ ${installCmd}\n`)//form the cmd

                // passing the given command in the web container using "spawn"
                const installProcess = await container.spawn(installBin,installArgs)//pass the install bin and args to the container

                // render the output in the web container
                installProcess.output.pipeTo(
                    new WritableStream({
                        write(data){
                            appendOutput(data)
                        }
                    })
                )

                const installExitCode = await installProcess.exit;

                if(installExitCode !== 0){
                    throw new Error(
                        `${installCmd} failed with code ${installExitCode}`
                    )
                }

                // parse dev command (efault: npm run dev)
                // similar to install scenario
                const devCmd = settings?.devCommand || "npm run dev"
                const [devBin,...devArgs] = devCmd.split(" ");

                appendOutput(`\n$ ${devCmd}\n`)

                const devProcess = await container.spawn(devBin,devArgs);
                devProcess.output.pipeTo(
                    new WritableStream({
                        write(data){
                            appendOutput(data)
                        }
                    })
                )
            } catch (error) {
                setError(error instanceof Error ? error.message : "Unknown error");
                setStatus("error")
            }
        }

        start();//start the web containers
    },[
        enabled,
        files,
        restartKey,
        settings?.devCommand,
        settings?.installCommand
    ])

    // sync file changes (hot-reload)
    useEffect(()=>{
        const container = containerRef.current;//get the current container
        if(!container || !files || status!== "running") return;//if no container/ no files / status is not running then just return

        const filesMap = new Map(files.map((f)=> [f._id,f]))

        for(const file of files){
            // if the file is anything other than a regular file (folder/binary file) then skip it
            if(file.type !== "file" || file.storageId || !file.content)continue;

            const filePath = getFilePath(file,filesMap)
            container.fs.writeFile(filePath,file.content)//write the updated content in the file in the container
        }
    },[files,status])

    // reset when disabled
    useEffect(()=>{
        if(!enabled){
            hasStartedRef.current = false;
            setStatus("idle");
            setPreviewUrl(null);
            setError(null)
        }
    },[enabled])

    // restart the entire webcontainer process
    const restart = useCallback(()=>{
        tearDownWebContainer();//reset the container
        containerRef.current=null;
        hasStartedRef.current=false;
        setStatus("idle")
        setPreviewUrl(null);
        setError(null);
        setRestartKey((k)=>k+1);
    },[])

    return {
        status,
        previewUrl,
        error,
        restart,
        terminalOutput,
    }
}