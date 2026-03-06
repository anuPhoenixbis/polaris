import { convex } from "@/lib/convex-client";
import { createTool } from "@inngest/agent-kit";
import * as z from "zod"
import { api } from "../../../../../convex/_generated/api";
import { Id } from "../../../../../convex/_generated/dataModel";

interface RenameFileToolOptions{
    internalKey: string;
}

const paramsSchema = z.object({
    fileId: z.string().min(1,"File ID is required"),
    newName: z.string().min(1,"New name is required"),
});

export const createRenameFileTool = ({
    internalKey
}:RenameFileToolOptions) =>{
    return createTool({
        name: "renameFile",
        description: "Rename a file or folder",
        parameters: z.object({
            fileId: z.string().describe("The ID of the file or folder to rename"),
            newName: z.string().describe("The new name for the file or folder")
        }),
        handler: async(params,{step: toolStep}) =>{
            const parsed = paramsSchema.safeParse(params)//get the parsed params passed in by the agent
            if(!parsed.success) return `Error: ${parsed.error.issues[0].message}`

            const{fileId,newName} = parsed.data;

            // check if the file exists
            const file = await convex.query(api.system.getFileById,{
                internalKey,
                fileId: fileId as Id<"files">,
            })

            if(!file) return `Error: File with ID "${fileId}" not found. Use listFiles to get valid file IDs.`

            try {
                // run the tool here to read all the file using the fileIds
                return await toolStep?.run("rename-file",async()=>{
                    // just update the file 
                    await convex.mutation(api.system.renameFile,{
                        internalKey,
                        fileId: fileId as Id<"files">,
                        newName,
                    })

                    return `Renamed "${file.name}" to "${newName}" successfully`;
                })
            } catch (error) {
                return `Error renaming file: ${error instanceof Error ? error.message : "Unknown error"}`
            }
        }
    })
}