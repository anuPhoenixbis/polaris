import { convex } from "@/lib/convex-client";
import { createTool } from "@inngest/agent-kit";
import * as z from "zod"
import { api } from "../../../../../convex/_generated/api";
import { Id } from "../../../../../convex/_generated/dataModel";

interface ReadFilesToolOptions{
    internalKey: string;
}

const paramsSchema = z.object({
    fileIds: z
        .array(z.string().min(1,"File ID cannot be empty"))
        .min(1, "Provide at least one file ID"),
});

// a tool is nothing but a function what is handed over to the agent which based on its needs does changes to the codebase
// each tool consists of name : name of the tool; description: how do we describe the tool behaves/works ; parameters: the things we need to trigger the tool 
// and finally the handler : the actual function/tool which gets called by the agent

// Writing quality name and description parameters help the model determine when the particular Tool should be called.

export const createReadFilesTool = ({internalKey}:ReadFilesToolOptions) =>{
    return createTool({
        name: "readFiles",
        description: "Read the content of files from the project. Return file contents.",
        parameters: z.object({
            fileIds: z.array(z.string()).describe("Array of file IDs to read"),
        }),
        handler: async(params,{step: toolStep}) =>{
            const parsed = paramsSchema.safeParse(params)//get the parsed params passed in by the agent
            if(!parsed.success) return `Error: ${parsed.error.issues[0].message}`

            const{fileIds} = parsed.data;//get the fileIds from the parsed array

            try {
                // run the tool here to read all the file using the fileIds
                return await toolStep?.run("read-files",async()=>{
                    const results : {id: string; name: string; content: string }[] = []

                    for(const fileId of fileIds){//fetch the files from the convex client
                        const file = await convex.query(api.system.getFileById,{
                            internalKey,
                            fileId: fileId as Id<"files">
                        });

                        if(file && file.content){//push the contents in the results
                            results.push({
                                id: file._id,
                                name: file.name,
                                content: file.content
                            })
                        }
                    }

                    if(results.length === 0) return "Error: No files found with the provided IDs. Use listFiles to get valid fileIDs";

                    return JSON.stringify(results);//finally return the read files' contents
                })
            } catch (error) {
                return `Error reading files: ${error instanceof Error ? error.message : "Unknown error"}`
            }
        }
    })
}