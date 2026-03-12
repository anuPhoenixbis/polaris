// we require 2 hooks usListFiles and useCreateFiles; they will allow us to list the files that are open 
// so we can easily trigger the collapse button and also create files for creation of files and folders

import { useMutation, useQuery } from "convex/react"
import { api } from "../../../../convex/_generated/api"
import { Id } from "../../../../convex/_generated/dataModel"

// sort: folder first, then files, alphabetically within each group
const sortFiles = <T extends {type: "file" | "folder"; name: string}>(
    files: T[]
) : T[] => {
    return [...files].sort((a,b)=>{
        if(a.type === "folder" && b.type === "file") return -1;
        if(a.type === "file" && b.type === "folder") return 1;

        return a.name.localeCompare(b.name)
    })
}

export const useFiles = (projectId: Id<"projects"> | null) =>{
    return useQuery(api.files.getFiles, projectId ? {projectId} : "skip")
}
export const useFile = (fileId: Id<"files"> | null) =>{
    return useQuery(api.files.getFile, fileId ? {id:fileId} : "skip")
}

export const useFilePath = (fileId: Id<"files"> | null) => {
    return useQuery(api.files.getFilePath, fileId ? {id:fileId} : "skip")
}

export const useUpdateFile = () =>{
    return useMutation(api.files.updateFile)//using the updateFile convex function
}
export const useCreateFile = () =>{
    //using the createFile convex function
    return useMutation(api.files.createFile).withOptimisticUpdate(
        (localStore,args)=>{
            const existingFiles = localStore.getQuery(api.files.getFolderContents,{
                projectId: args.projectId,
                parentId: args.parentId,
            })

            if(existingFiles !== undefined){
                // eslint-disable-next-line react-hooks/purity
                const now = Date.now();
                const newFile = {
                    _id: crypto.randomUUID() as Id<"files">,
                    _creationTime: now,
                    projectId: args.projectId,
                    parentId: args.parentId,
                    name: args.name,
                    content: args.content,
                    type: "file" as const,
                    updatedAt: now,
                }

                localStore.setQuery(
                    api.files.getFolderContents,
                    {projectId: args.projectId, parentId: args.parentId},
                    sortFiles([...existingFiles,newFile])
                )
            }
        }
    )
    // to add optimistic mutation
}
export const useCreateFolder = () =>{
    //using the createFolder convex function
    return useMutation(api.files.createFolder).withOptimisticUpdate(
        (localStore,args)=>{
            const existingFiles = localStore.getQuery(api.files.getFolderContents,{
                projectId: args.projectId,
                parentId: args.parentId,
            })

            if(existingFiles !== undefined){
                // eslint-disable-next-line react-hooks/purity
                const now = Date.now();
                const newFolder = {
                    _id: crypto.randomUUID() as Id<"files">,
                    _creationTime: now,
                    projectId: args.projectId,
                    parentId: args.parentId,
                    name: args.name,
                    type: "folder" as const,
                    updatedAt: now,
                }

                localStore.setQuery(
                    api.files.getFolderContents,
                    {projectId: args.projectId, parentId: args.parentId},
                    sortFiles([...existingFiles,newFolder])
                )
            }
        }
    )
    // to add optimistic mutation
}
export const useRenameFile = ({
    projectId,
    parentId
}:{
    projectId: Id<"projects">,
    parentId?: Id<"files">
}) =>{
    return useMutation(api.files.renameFile).withOptimisticUpdate(
        (localStore,args)=>{
            const existingFiles = localStore.getQuery(api.files.getFolderContents,{
                projectId,
                parentId
            })

            if(existingFiles !== undefined){
                const updatedFiles = existingFiles.map((file)=> file._id === args.id ? { ...file, name: args.newName }: file)
                localStore.setQuery(
                    api.files.getFolderContents,
                    {projectId, parentId},
                    sortFiles(updatedFiles)
                )
            }
        }
    )
    // to add optimistic mutation
}
export const useDeleteFile = ({
    projectId,
    parentId
}:{
    projectId: Id<"projects">,
    parentId?: Id<"files">
}) =>{
    return useMutation(api.files.deleteFile).withOptimisticUpdate(
        (localStore,args)=>{
            const existingFiles = localStore.getQuery(api.files.getFolderContents,{
                projectId,
                parentId
            })

            if(existingFiles !== undefined){
                localStore.setQuery(
                    api.files.getFolderContents,
                    {projectId, parentId},
                    existingFiles.filter((file)=> file._id !== args.id)
                )
            }
        }
    );
    // to add optimistic mutation
}

// to the contents of the folder
export const useFolderContents = ({
    projectId,
    parentId,
    enabled=true
}:{
    projectId: Id<"projects">,
    parentId?: Id<"files">,
    enabled?:boolean,
}) =>{
    return useQuery(
        api.files.getFolderContents,
        enabled ? {projectId,parentId} : "skip"//if projectId and parentId is provided then pass it to getFolderContents fn otherwise skip the query
    )
}