import { v } from "convex/values"
import { mutation, query } from "./_generated/server"
import { verifyAuth } from "./auth"
import { Id } from "./_generated/dataModel"

export const getFiles = query({
    args:{
        projectId: v.id("projects")
    },
    handler: async (ctx,args)=>{
        // const identity = await ctx.auth.getUserIdentity()
        // // get details about the currently authenticated user

        // if(!identity) return []
        const identity = await verifyAuth(ctx)

        const project = await ctx.db.get("projects",args.projectId)//get the project using the args projectId

        if(!project) throw new Error("Project not found")

            // check if the user is the actual owner of the project or not
        if(project.ownerId !== identity.subject) throw new Error("Unauthorized to access this project")

        return ctx.db
        .query("files")
        .withIndex("by_project",(q)=> q.eq("projectId",args.projectId))//getting the projects' files via the projectId
        .collect()
    }
})


export const getFile = query({
    args:{
        id: v.id("files")
    },
    handler: async (ctx,args)=>{
        // const identity = await ctx.auth.getUserIdentity()
        // // get details about the currently authenticated user
        
        // if(!identity) return []
        const identity = await verifyAuth(ctx)

        const file = await ctx.db.get("files",args.id)//get the desired file
        if(!file) throw new Error("File not found")

        // fetch the project to which the file belonged
        const project = await ctx.db.get("projects",file.projectId)//get the project using the args projectId
        
        if(!project) throw new Error("Project not found")
            
            // check if the user is the actual owner of the project or not
            if(project.ownerId !== identity.subject) throw new Error("Unauthorized to access this project")
                
                return file
            }
        })

        
export const getFolderContents = query({
    args:{
        projectId: v.id("projects"),
        parentId: v.optional(v.id("files"))
    },
    handler: async (ctx,args)=>{
        // const identity = await ctx.auth.getUserIdentity()
        // // get details about the currently authenticated user

        // if(!identity) return []
        const identity = await verifyAuth(ctx)

        const project = await ctx.db.get("projects",args.projectId)//get the project using the args projectId

        if(!project) throw new Error("Project not found")

            // check if the user is the actual owner of the project or not
        if(project.ownerId !== identity.subject) throw new Error("Unauthorized to access this project")

        const files = await ctx.db
            .query("files")
            .withIndex("by_project_parent",(q)=>
                q.eq("projectId",args.projectId).eq("parentId",args.parentId))
            .collect()
        // fetches the files whose projectId and parentId are the ones we have given

        // sort them as folders=>files=>alphabetically by name
        return files.sort((a,b)=>{//sorting comparator  
            // folders come before files
            if(a.type === "folder" && b.type==="file") return -1;//get the reverse order of those entities
            if(a.type==="file" && b.type==="folder") return 1;//get the current order of those entities

            // within the same type , sort alphabetically
            return a.name.localeCompare(b.name)
        })
    }
})


export const createFile = mutation({
    args:{
        projectId: v.id("projects"),
        parentId: v.optional(v.id("files")),
        name: v.string(),
        content: v.string(),
    },
    handler: async (ctx,args)=>{
        // const identity = await ctx.auth.getUserIdentity()
        // // get details about the currently authenticated user

        // if(!identity) return []
        const identity = await verifyAuth(ctx)

        const project = await ctx.db.get("projects",args.projectId)//get the project using the args projectId

        if(!project) throw new Error("Project not found")

            // check if the user is the actual owner of the project or not
        if(project.ownerId !== identity.subject) throw new Error("Unauthorized to access this project")

        
        // parent guarding
        // rejecting invalid parent references
        if(args.parentId){
            const parent = await ctx.db.get("files",args.parentId)//get the parent
            // basically if the parent is missing/the parent's projectId is not same as current projectId/parent's type is not a folder then throw the error
            if(!parent || parent.projectId!== args.projectId || parent.type !== "folder") throw new Error("Invalid parent folder")
        }

        // check if the same file already exists within the parent folder
        const files = await ctx.db
            .query("files")
            .withIndex("by_project_parent",(q)=>
                q.eq("projectId",args.projectId).eq("parentId",args.parentId))
            .collect()
        // fetches the files whose projectId and parentId are the ones we have given

        const existing = files.find(
            (file)=>file.name === args.name && file.type === "file"//this function for file creation so we don't worry about the dupe folders here
        )

        if(existing) throw new Error("File already exists")

        const now = Date.now();
        //insert the files' into the db along with its data from the args 
        await ctx.db.insert("files",{
            projectId: args.projectId,
            name: args.name,
            content: args.content,
            type: "file",
            parentId: args.parentId,
            updatedAt: now
        })

        // project updation occurs here as well 
        await ctx.db.patch("projects",args.projectId,{
            updatedAt: now
        })
    }
})


export const createFolder = mutation({
    args:{
        projectId: v.id("projects"),
        parentId: v.optional(v.id("files")),
        name: v.string(),
    },
    handler: async (ctx,args)=>{
        // const identity = await ctx.auth.getUserIdentity()
        // // get details about the currently authenticated user

        // if(!identity) return []
        const identity = await verifyAuth(ctx)

        const project = await ctx.db.get("projects",args.projectId)//get the project using the args projectId

        if(!project) throw new Error("Project not found")

            // check if the user is the actual owner of the project or not
        if(project.ownerId !== identity.subject) throw new Error("Unauthorized to access this project")

        // parent guarding
        // rejecting invalid parent references
        if(args.parentId){
            const parent = await ctx.db.get("files",args.parentId)//get the parent
            // basically if the parent is missing/the parent's projectId is not same as current projectId/parent's type is not a folder then throw the error
            if(!parent || parent.projectId!== args.projectId || parent.type !== "folder") throw new Error("Invalid parent folder")
        }

        // check if the same folder already exists within the parent folder
        const files = await ctx.db
            .query("files")
            .withIndex("by_project_parent",(q)=>
                q.eq("projectId",args.projectId).eq("parentId",args.parentId))
            .collect()
        // fetches the files whose projectId and parentId are the ones we have given

        const existing = files.find(
            (file)=>file.name === args.name && file.type === "folder"//this function for file creation so we don't worry about the dupe folders here
        )

        if(existing) throw new Error("Folder already exists")

        const now = Date.now();
        //insert the files' into the db along with its data from the args 
        await ctx.db.insert("files",{
            projectId: args.projectId,
            name: args.name,
            type: "folder",
            parentId: args.parentId,
            updatedAt: now
        })

        // project updation occurs here as well 
        await ctx.db.patch("projects",args.projectId,{
            updatedAt: now
        })
    }
})

export const renameFile = mutation({
    args:{
        id:v.id("files"),
        newName: v.string(),
    },
    handler: async(ctx,args)=>{
        const identity = await verifyAuth(ctx)

        const file = await ctx.db.get("files",args.id)
        if(!file) throw new Error("File not found")

        const project = await ctx.db.get("projects",file.projectId) 
        if(!project) throw new Error("Project not found")

            // check if the user is the actual owner of the project or not
        if(project.ownerId !== identity.subject) throw new Error("Unauthorized to access this project")

        // check if the file with the newName already exists in the parent folder
        const siblings = await ctx.db
            .query("files")
            .withIndex("by_project_parent",(q)=>
                q
                    .eq("projectId",file.projectId)
                    .eq("parentId",file.parentId)
            )
            .collect()
        
        // check if we have an existing sibling of file/folder 
        const existing = siblings.find(
            (sibling)=>
                sibling.name === args.newName && 
                sibling.type === file.type &&
                sibling._id !== args.id
        ) 

        if(existing) throw new Error(
            `A ${file.type} with this name already exists in this location`
        )

        const now = Date.now();
        // update the name
        await ctx.db.patch("files",args.id,{
            name:args.newName,
            updatedAt:now
        })

        // project updation occurs here as well 
        await ctx.db.patch("projects",file.projectId,{
            updatedAt: now
        })
    }
})


export const deleteFile = mutation({
    args:{
        id:v.id("files"),
    },
    handler: async(ctx,args)=>{
        const identity = await verifyAuth(ctx)

        const file = await ctx.db.get("files",args.id)
        if(!file) throw new Error("File not found")

        const project = await ctx.db.get("projects",file.projectId) 
        if(!project) throw new Error("Project not found")

            // check if the user is the actual owner of the project or not
        if(project.ownerId !== identity.subject) throw new Error("Unauthorized to access this project")

        // recursively delete file/folder and all its descendants
        const deleteRecursive = async(fileId : Id<"files">)=>{
            const item = await ctx.db.get("files",fileId);

            if(!item) return;

            // if it's a folder, delete all children first
            if(item.type === "folder"){
                const children = await ctx.db
                    .query("files")//get all the children or files and folders whose projectId is same as the folder's project id
                    // and also the parent id of those files and folders are of the current folder's file id
                    .withIndex("by_project_parent",(q)=>q
                        .eq("projectId",item.projectId)
                        .eq("parentId",fileId)
                    )
                    .collect()
                for(const child of children){//it can happen we will encounter more folders within the current folders so we just recursively pass down the 
                    // current children into the same deleteRecursive function with their own ids(child._id)
                    // the recursion occurs only if there are folders within the folders and not for files (they get directly deleted)
                    await deleteRecursive(child._id)
                }
            }

            // deleting the children files ; if its a file
            if(item.storageId) await ctx.storage.delete(item.storageId)

            // at last we delete the parent file/folder itself
            await  ctx.db.delete("files",fileId)
        }
        await deleteRecursive(args.id)//starting the deletion recursive tree from the parent itself 

        // project updation occurs here as well 
        await ctx.db.patch("projects",file.projectId,{
            updatedAt: Date.now()
        })
    }
})

export const updateFile = mutation({
    args:{
        id: v.id("files"),
        content: v.string()
    },
    handler:async(ctx,args)=>{
        const identity = await verifyAuth(ctx)

        const file = await ctx.db.get("files",args.id)
        if(!file) throw new Error("File not found")

        // folders shouldn't be able to update their contents
        if(file.type !== "file") throw new Error("Cannot update contents of a folder")

        const project = await ctx.db.get("projects",file.projectId) 
        if(!project) throw new Error("Project not found")

            // check if the user is the actual owner of the project or not
        if(project.ownerId !== identity.subject) throw new Error("Unauthorized to access this project")

        const now = Date.now()

        //we will not update the files' updatedAt but we will also update the time for projects' as well 
        await ctx.db.patch("files",args.id,{
            content: args.content,
            updatedAt: now
        })

        await ctx.db.patch("projects",file.projectId,{
            updatedAt: now
        })
    }
})