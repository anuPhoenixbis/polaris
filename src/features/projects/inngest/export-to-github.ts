import { inngest } from "@/inngest/client";
import { Doc, Id } from "../../../../convex/_generated/dataModel";
import { convex } from "@/lib/convex-client";
import { api } from "../../../../convex/_generated/api";
import { NonRetriableError } from "inngest";
import {isBinaryFile} from "isbinaryfile"
import {Octokit} from "octokit"
import ky from "ky";
import { success } from "zod";

interface ExportToGithubEvent{
    projectId: Id<"projects">,
    repoName: string,
    visibility: "public" | "private",
    description?: string,
    githubToken: string,
}

// we just witnessed inheritance, we grabbed the the type from files and just added the storageId prop to it
type FileWithUrl = Doc<"files"> & {
    storageUrl: string | null;
}

export const exportToGithub = inngest.createFunction(
    {
        id: "export-to-github",
        cancelOn:[
            {
                event: "github/export.cancel",
                if: "event.data.projectId == async.data.projectId"
            }
        ],
        onFailure: async ({event,step})=>{
            const internalKey = process.env.POLARIS_CONVEX_INTERNAL_KEY;
            if(!internalKey) return;

            const {projectId} = event.data.event.data as ExportToGithubEvent;

            // run the inngest step and inside run the mutation of convex
            await step.run("set-failed-status", async ()=>{
                await convex.mutation(api.system.updateExportStatus,{
                    internalKey,
                    projectId,
                    status: "failed"
                })
            })
        }
    },{
        event: "github/export.repo"
    },
    async ({event,step}) =>{
        const {
            projectId,
            repoName,
            visibility,
            description,
            githubToken
        } = event.data as ExportToGithubEvent;

        const internalKey = process.env.POLARIS_CONVEX_INTERNAL_KEY;
        if(!internalKey) {
            throw new NonRetriableError("Internal key is not configured")
        }

        // change of status to exporting
        await step.run("set-exporting-status",async()=>{
            await convex.mutation(api.system.updateExportStatus,{
                internalKey,
                projectId,
                status: "exporting"
            })
        })

        const octokit = new Octokit({ auth: githubToken })

        // get the authenticated uer using the octokit
        const { data: user } = await step.run("get-github-user", async() =>{
            return await octokit.rest.users.getAuthenticated()//grab the authenticated user via github
        })

        // create the new repo with auto_init to have an initial commit
        const { data: repo } = await step.run("create-repo", async() =>{ 
            // creating the repo for storage the project from polaris 
            return await octokit.rest.repos.createForAuthenticatedUser({
                name: repoName,
                description: description || `Exported from Polaris`,
                private: visibility === "private",
                auto_init: true
            })
        })

        // wait for github to initialize the repo(auto_init is async on github's side)
        await step.sleep("wait-for-repo-init","3s")

        // get the initial commit SHA (we need this as parent for our commit )
        const initialCommitSha = await step.run("get-initial-commit", async()=>{
            const{data:ref} = await octokit.rest.git.getRef({
                owner: user.login,
                repo: repoName,
                ref: "heads/main"
            });

            return ref.object.sha;//grab the sha of the initial commit
        })

        // fetch all project files with storage urls
        const files = await step.run("fetch-project-files", async ()=>{
            // grab the files from the polaris ide
            return (await convex.query(api.system.getProjectFilesWithUrls,{
                internalKey,
                projectId
            })) as FileWithUrl[];
        })

        // build a map of file Ids to their full paths
        const buildFilePaths = (file: FileWithUrl[]) =>{
            const fileMap = new Map<Id<"files">,FileWithUrl>();
            files.forEach((f)=>fileMap.set(f._id,f));

            const getFullPath = (file: FileWithUrl) : string =>{
                if(!file.parentId){
                    return file.name;
                }

                const parent =fileMap.get(file.parentId);
                if(!parent) return file.name;//for root level files

                return `${getFullPath(parent)}/${file.name}`;//or else return the entire path recursively and return the file name along with it
            }

            const paths: Record<string, FileWithUrl> = {};
            files.forEach((file)=>{
                paths[getFullPath(file)] = file;//grab the paths for each file
            })

            return paths;
        }

        const filePaths = buildFilePaths(files)//get the file paths using the all the files

        // filter only to actual files(not folders)
        const fileEntries = Object.entries(filePaths).filter(
            ([,file]) => file.type === "file"
        )

        if(fileEntries.length === 0) throw new NonRetriableError("No files to export")

        // create blobs for each file
        const treeItems = await step.run("create-blobs", async()=>{
            const items: {
                path: string;
                mode: "100644";
                type: "blob";
                sha: string;
            }[] = [];

            for(const [path,file] of fileEntries){
                let content: string;
                let encoding: "utf-8" | "base64" = "utf-8"//encodings for txt files or bin files

                if(file.content !== undefined){
                    // txt 
                    content = file.content;
                }else if(file.storageUrl){
                    // bin 
                    const response = await ky.get(file.storageUrl)// the upload url
                    const buffer = Buffer.from(await response.arrayBuffer())//grab the buffer of the uploaded image
                    content = buffer.toString("base64");
                    encoding="base64";
                }else continue;//skip files with no content

                // create the files/blobs
                const {data: blob} = await octokit.rest.git.createBlob({
                    owner: user.login,
                    repo: repoName,
                    content,
                    encoding,
                })

                items.push({
                    path,
                    mode: "100644",
                    type: "blob",
                    sha: blob.sha,
                })
            }

            return items;
        })

        if(treeItems.length === 0){
            throw new NonRetriableError("Failed to create any file blobs");
        }

        // create the tree
        const {data: tree} = await step.run("create-tree", async () => {
            return await octokit.rest.git.createTree({
                owner: user.login,
                repo: repoName,
                tree: treeItems
            })
        })

        // create the commit with the initial commit as parent
        const {data: commit} = await step.run("create-commit", async()=>{
            return await octokit.rest.git.createCommit({
                owner: user.login,
                repo: repoName,
                message: "Initial commit from Polaris",
                tree: tree.sha,
                parents: [initialCommitSha]
            })
        })

        // update the main branch reference to point to our new commit
        await step.run("update-branch-ref", async() => {
            return await octokit.rest.git.updateRef({
                owner: user.login,
                repo: repoName,
                ref: "heads/main",
                sha: commit.sha,
                force: true
            })
        })

        // set status to completed repo url
        await step.run("set-completed-status", async () =>{
            await convex.mutation(api.system.updateExportStatus,{
                internalKey,
                projectId,
                status: "completed",
                repoUrl: repo.html_url
            })
        })

        return {
            success: true,
            repoUrl: repo.html_url,
            filesExported: treeItems.length
        };
    }
)