import { inngest } from "@/inngest/client";
import { Id } from "../../../../convex/_generated/dataModel";
import { convex } from "@/lib/convex-client";
import { api } from "../../../../convex/_generated/api";
import { NonRetriableError } from "inngest";
import {isBinaryFile} from "isbinaryfile"
import {Octokit} from "octokit"
import ky from "ky";

interface ImportGithubRepoEvent {
    owner: string,
    repo: string,
    projectId: Id<"projects">,
    githubToken: string,
}

export const importGithubRepo = inngest.createFunction(
    {
        id: "import-github-repo",
        onFailure: async ({event,step})=>{
            const internalKey = process.env.POLARIS_CONVEX_INTERNAL_KEY;
            if(!internalKey) return;

            const {projectId} = event.data.event.data as ImportGithubRepoEvent;

            // run the inngest step and inside run the mutation of convex
            await step.run("set-failed-status", async ()=>{
                await convex.mutation(api.system.updateImportStatus,{
                    internalKey,
                    projectId,
                    status: "failed"
                })
            })
        }
    },{
        event: "github/import.repo"
    },
    async ({event,step})=>{
        const {
            owner,
            repo,
            projectId,
            githubToken
        } = event.data as ImportGithubRepoEvent;

        const internalKey = process.env.POLARIS_CONVEX_INTERNAL_KEY;
        if(!internalKey) {
            throw new NonRetriableError("Internal key is not configured")
        }

        /**Octokit
         * basically a package to talk with github and ops with it
         * Think of it as a wrapper around the GitHub REST API and GraphQL API so you don't have to manually write HTTP requests.
         * With Octokit you can automate or build tools that interact with GitHub
         */
        const octokit = new Octokit({ auth: githubToken })

        // cleanup any exiting files in the project 
        await step.run("cleanup-project", async()=>{
            await convex.mutation(api.system.cleanup,{
                internalKey,
                projectId
            })
        })

        const tree = await step.run("fetch-repo-tree",async() => {
            try {
                const{data} = await octokit.rest.git.getTree({
                    owner,
                    repo,
                    tree_sha: "main",
                    recursive: "1"
                })

                return data;
            }catch {
                // fallback to master branch, for older projects
                const{data} = await octokit.rest.git.getTree({
                    owner,
                    repo,
                    tree_sha: "master",
                    recursive: "1"
                })

                return data;
            }
        })

        // sort folders by depth so parents are created before children
        // input : [
        //  { path: "src/components" },
        //  { path: "src"}
        //  { path: "src/components/ui"}
        // ]
        // output : [
        //  { path: "src" },
        //  { path: "src/components"}
        //  { path: "src/components/ui"}
        // ]
        const folders = tree.tree
        // item.type === "tree" for folder only and not for files
            .filter((item) => item.type === "tree" && item.path)
            .sort((a,b)=>{
                const aDepth = a.path ? a.path.split("/").length : 0
                const bDepth = b.path ? b.path.split("/").length : 0

                return aDepth - bDepth
            })
        
        // return the folder map from the step so it can be used in subsequent steps
        // (Inngest serializes step results, so we use a plain object instead of Map)
        const folderIdMap = await step.run("create-folders", async()=>{
            const map: Record<string, Id<"files">> = {}

            for(const folder of folders){
                if(!folder.path) continue;

                const pathParts = folder.path.split("/");//[src/ui] => ["src","ui"]
                const name = pathParts.pop()!;//grabs=> "ui", set as imp as it will grab have to have something
                const parentPath = pathParts.join("/");//grabs => rest of the array
                // map usage
                const parentId = parentPath ? map[parentPath] : undefined //if the parentPath is undefined so we were at root so set the parent Id to be undefined otherwise, grab the parent from the map 

                // create the folder in convex for each folder and grab its folderIds
                const folderId = await convex.mutation(api.system.createFolder, {
                    internalKey,
                    projectId,
                    name,
                    parentId,
                })

                // map populating
                map[folder.path] = folderId//pass the folderId to the map with path of folder as the key
            }

            return map;

        })
        // get all files(blobs) from the tree
        const allFiles = tree.tree.filter(//grabbing the files here
            (item) => item.type === "blob" && item.path && item.sha
        )

        await step.run("create-files", async()=>{
            for(const file of allFiles){
                if(!file.path || !file.sha) continue

                try {
                    const {data:blob} = await octokit.rest.git.getBlob({
                        owner,
                        repo,
                        file_sha: file.sha
                    })

                    const buffer = Buffer.from(blob.content, "base64")
                    const isBinary = await isBinaryFile(buffer)//check if its a valid bin file or not

                    // same thing as we did for folders as well
                    const pathParts = file.path.split("/")
                    const name = pathParts.pop()!;
                    const parentPath = pathParts.join("/");
                    const parentId = parentPath ? folderIdMap[parentPath] : undefined

                    if(isBinary){
                        // send the bin file using the mutation
                        const uploadUrl = await convex.mutation(api.system.generateUploadUrl,{ internalKey })

                        // storageId which is the actual upload url to the convex
                        const {storageId} = await ky
                            .post(uploadUrl,{
                                headers: {"Content-Type": "application/octet-stream"},
                                body: buffer,
                            })
                            .json<{storageId: Id<"_storage">}>()

                        // create the bin file using the mutation and the storageId
                        await convex.mutation(api.system.createBinaryFile,{
                            internalKey,
                            projectId,
                            name,
                            storageId,
                            parentId
                        })
                    }else{
                        // not bin file and just a regular file
                        const content = buffer.toString("utf-8");

                        await convex.mutation(api.system.createFile,{
                            internalKey,
                            projectId,
                            name,
                            content,
                            parentId,
                        })
                    }
                } catch {
                    console.error(`Failed to import file: ${file.path}`)
                }
            }
        })

        // update the import status to be completed
        await step.run("set-completed-status", async()=>{
            await convex.mutation(api.system.updateImportStatus,{
                internalKey,
                projectId,
                status: "completed"
            })
        })

        return {success: true,projectId};
    }
)