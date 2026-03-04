// we require 2 hooks usListFiles and useCreateFiles; they will allow us to list the files that are open 
// so we can easily trigger the collapse button and also create files for creation of files and folders

import { useMutation, useQuery } from "convex/react"
import { api } from "../../../../convex/_generated/api"
import { Id } from "../../../../convex/_generated/dataModel"

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
    return useMutation(api.files.createFile)//using the createFile convex function
    // to add optimistic mutation
}
export const useCreateFolder = () =>{
    return useMutation(api.files.createFolder)//using the createFolder convex function
    // to add optimistic mutation
}
export const useRenameFile = () =>{
    return useMutation(api.files.renameFile);
    // to add optimistic mutation
}
export const useDeleteFile = () =>{
    return useMutation(api.files.deleteFile);
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