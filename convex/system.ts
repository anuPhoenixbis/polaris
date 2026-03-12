import { v } from "convex/values"
import { mutation, query } from "./_generated/server"


const validateInternalKey = (key:string) =>{
    const internalKey = process.env.POLARIS_CONVEX_INTERNAL_KEY;

    if(!internalKey) throw new Error("POLARIS_CONVEX_INTERNAL_KEY isn't configured")

    if(key!==internalKey) throw new Error("Invalid internal key")
}

// regular conversationById wrapper function to be used along with the convex-client
export const getConversationById = query({
    args: {
        conversationId: v.id("conversations"),
        internalKey: v.string(),
    },
    handler: async(ctx,args)=>{
        validateInternalKey(args.internalKey)//validation with the internal key
        // just returning them and no protection seems a bit sketchy so we can't have
        // neither can we do the verifyAuth check which we have been doing previously
        return await ctx.db.get(args.conversationId)
    }
})

export const createMessage  = mutation({
    args: {
        internalKey: v.string(),
        conversationId: v.id("conversations"),
        projectId: v.id("projects"),
        role: v.union(v.literal("user"),v.literal("assistant")),
        content: v.string(),
        status: v.optional(
            v.union(
                v.literal("processing"),
                v.literal("completed"),
                v.literal("cancelled")
            )
        ),
    },
    handler: async(ctx,args)=>{
        validateInternalKey(args.internalKey)//this serves as our very own verifyAuth like the clerk

        const messageId = await ctx.db.insert("messages",{
            conversationId: args.conversationId,
            projectId: args.projectId,
            role: args.role,
            content: args.content,
            status: args.status,
        })

        // update conversation's updatedAt
        await ctx.db.patch(args.conversationId,{
            updatedAt: Date.now()
        })

        return messageId
    }
})

export const updateMessageContent = mutation({
    args:{
        internalKey: v.string(),
        messageId: v.id("messages"),
        content: v.string(),
    },
    handler: async(ctx,args)=>{
        validateInternalKey(args.internalKey)

        await ctx.db.patch(args.messageId,{
            content: args.content,
            status: "completed" as const
        })
    }
})

// to perform status updates of message when we would cancel there inngest jobs when triggered a new converse
export const updateMessageStatus = mutation({
    args:{
        internalKey: v.string(),
        messageId: v.id("messages"),
        status: v.union(
            v.literal("processing"),
            v.literal("completed"),
            v.literal("cancelled")
        )
    },
    handler: async(ctx,args)=>{
        validateInternalKey(args.internalKey)

        await ctx.db.patch(args.messageId,{
            status: args.status
        })
    }
})


// setting up a fn to fetch all the messages which are currently processing
export const getProcessingMessages = query({
    args:{
        internalKey: v.string(),
        projectId: v.id("projects"),
    },
    handler: async(ctx,args)=>{
        validateInternalKey(args.internalKey)

        return await ctx.db
            .query("messages")
            // with the indexing  of by_project_status; we will fetch the projectId whose status is processing
            .withIndex("by_project_status", (q)=>q
                    .eq("projectId",args.projectId)
                    .eq("status","processing")
            )
            .collect()
    }
})

// to give the context to the agent
export const getRecentMessages = query({
    args:{
        internalKey: v.string(),
        conversationId: v.id("conversations"),
        limit: v.optional(v.number())//no of messages we would like to send for context
    },
    handler:async(ctx,args)=>{
        validateInternalKey(args.internalKey)

        const messages = await ctx.db
            .query("messages")
            .withIndex("by_conversation",(q)=>q
                    .eq("conversationId",args.conversationId)
            )
            .order("asc")
            .collect()
        
        const limit = args.limit ?? 10;
        return messages.length>limit ?  messages.slice(-limit) : messages;
    }
})

// used by agent to update the title
export const updateConversationTitle = mutation({
    args:{
        internalKey: v.string(),
        conversationId: v.id("conversations"),
        title: v.string(),
    },
    handler: async(ctx,args)=>{
        validateInternalKey(args.internalKey)

        await ctx.db.patch(args.conversationId,{
            title: args.title,
            updatedAt: Date.now()
        })
    }
})

// used for agent "listFiles" tool
export const getProjectFiles = query({
    args:{
        internalKey: v.string(),
        projectId: v.id("projects"),
    },
    handler: async(ctx, args)=> {
        validateInternalKey(args.internalKey)

        return await ctx.db
            .query("files")
            .withIndex("by_project",(q)=>q.eq("projectId",args.projectId))
            .collect()
    },
})

// used by agent : "ReadFiles" tool
export const getFileById = query({
    args:{
        internalKey: v.string(),
        fileId: v.id("files"),
    },
    handler: async(ctx,args)=>{
        validateInternalKey(args.internalKey)

        return await ctx.db.get(args.fileId)
    }
})

// used for agent: "UpdateFile" tool
export const updateFile = mutation({
    args:{
        internalKey: v.string(),
        fileId: v.id("files"),
        content: v.string(),
    },
    handler: async(ctx, args)=> {
        validateInternalKey(args.internalKey)

        const file = await ctx.db.get(args.fileId);

        if(!file) throw new Error("File not found")

        await ctx.db.patch(args.fileId,{
            content: args.content,
            updatedAt: Date.now()
        })

        return args.fileId;
    },
})

// used by agent:  "CreateFile" tool
export const createFile = mutation({
    args:{
        internalKey: v.string(),
        projectId: v.id("projects"),
        name: v.string(),
        content: v.string(),
        parentId: v.optional(v.id("files"))
    },
    handler: async(ctx, args) =>{
        validateInternalKey(args.internalKey)

        // make sure agent accidentally create the same named files in the same folder
        const files = await ctx.db
            .query("files")
            .withIndex("by_project_parent",(q)=>q
                .eq("projectId",args.projectId)
                .eq("parentId",args.parentId)
            )
            .collect()
        
            const existing = files.find(
                (file) => file.name === args.name && file.type ==="file"
            )

            if(existing) throw new Error("File already exists")

            const fileId = await ctx.db.insert("files",{
                projectId: args.projectId,
                name: args.name,
                content: args.content,
                type:"file",
                parentId: args.parentId,
                updatedAt: Date.now()
            })

            return fileId;
    },
})

//used by agent : "CreateFiles" tool(bulk creation) 
export const createFiles = mutation({
    args: {
        internalKey: v.string(),
        projectId: v.id("projects"),
        parentId: v.optional(v.id("files")),
        files: v.array(
            v.object({
                name: v.string(),
                content: v.string()
            })
        )
    },
    handler: async(ctx, args)=> {
        validateInternalKey(args.internalKey)

        const existingFiles = await ctx.db
            .query("files")
            .withIndex("by_project_parent",(q)=>q
                .eq("projectId",args.projectId)
                .eq("parentId",args.parentId)
        ).collect()

        const results : {
            name:string;
            fileId:string;
            error?:string;
        }[] = []//stores the result acquired from each of the file

        for (const file of args.files){//checking any of the file in the files already exists or not
            const existing = existingFiles.find(
                (f)=> f.name === file.name && f.type === "file"
            )

            // if the file already exists then pass the results of error
            if(existing){
                results.push({
                    name: file.name,
                    fileId: existing._id,
                    error: "File already exists"
                });
                continue;
            }

            // otherwise create the file
            const fileId = await ctx.db.insert("files",{
                projectId: args.projectId,
                name: file.name,
                content: file.content,
                type: "file",
                parentId: args.parentId,
                updatedAt: Date.now()
            })

            results.push({ name: file.name, fileId })
        }
        return results
    },
})


// used by agent:  "CreateFolder" tool
export const createFolder = mutation({
    args:{
        internalKey: v.string(),
        projectId: v.id("projects"),
        name: v.string(),
        parentId: v.optional(v.id("files"))
    },
    handler: async(ctx, args) =>{
        validateInternalKey(args.internalKey)

        // make sure agent accidentally create the same named files in the same folder
        const files = await ctx.db
            .query("files")
            .withIndex("by_project_parent",(q)=>q
                .eq("projectId",args.projectId)
                .eq("parentId",args.parentId)
            )
            .collect()
        
            const existing = files.find(
                (file) => file.name === args.name && file.type ==="folder"
            )

            if(existing) throw new Error("Folder already exists")

            const fileId = await ctx.db.insert("files",{
                projectId: args.projectId,
                name: args.name,
                type:"folder",
                parentId: args.parentId,
                updatedAt: Date.now()
            })

            return fileId;
    },
})

// used for agent : "RenameFile" tool
export const renameFile = mutation({
    args:{
        internalKey: v.string(),
        fileId: v.id("files"),
        newName: v.string()
    },
    handler: async(ctx, args) =>{
        validateInternalKey(args.internalKey)

        const file = await ctx.db.get(args.fileId)
        if(!file) throw new Error("File not found")

        // check if a file with the new name already exists in the parent folder or not
        const siblings = await ctx.db
            .query("files")
            .withIndex("by_project_parent",(q)=>q
                .eq("projectId",file.projectId)
                .eq("parentId",file.parentId)
            ).collect()
        
        const existing = siblings.find(
            (sibling)=>
                sibling.name === args.newName &&//check for already existing names in the folder
                sibling.type === file.type &&
                sibling._id !== args.fileId //other siblings id must not be equal to current file/folder id
        )

        if(existing) throw new Error(`A ${file.type} named ${args.newName} already exists`)

        // finally rename it
        await ctx.db.patch(args.fileId,{
            name: args.newName,
            updatedAt: Date.now()
        })

        return args.fileId
    },
})

// used by agent : "DeleteFile" tool
export const deleteFile = mutation({
    args:{
        internalKey: v.string(),
        fileId: v.id("files"),
    },
    handler: async(ctx, args) =>{
        validateInternalKey(args.internalKey)

        const file = await ctx.db.get(args.fileId)
        if(!file) throw new Error("File not found")

        // recursively delete the contents if its a folder otherwise just delete the file
        const deleteRecursive = async(fileId: typeof args.fileId)=>{
            const item = await ctx.db.get(fileId)

            if(!item) return;

            // if its a folder delete all its children first 
            if(item.type === "folder"){
                // fetch the children of the current file
                const children = await ctx.db
                    .query("files")
                    .withIndex("by_project_parent",(q)=>q
                            .eq("projectId",item.projectId)
                            .eq("parentId",fileId)//parentId is the current fileId
                    ).collect()
                
                for(const child of children){//recursion call for the children
                    await deleteRecursive(child._id);
                }
            }

            // delete storage file if it exists
            if(item.storageId) await ctx.storage.delete(item.storageId)

            await ctx.db.delete(fileId)//at last delete the parent file/folder itself
        }
        await deleteRecursive(args.fileId)
        return args.fileId;
    },
})

// this is fine for small repos but for huge repos like >50k files would exceed the convex limits
// we must use batch cleanup for this provided by convex
// to clear out any files before import the files from the github to the current polaris project
export const cleanup = mutation({
    args:{
        internalKey: v.string(),
        projectId: v.id("projects"),
    },
    handler: async(ctx, args)=> {
        validateInternalKey(args.internalKey)

        const files = await ctx.db
            .query("files")
            .withIndex("by_project", (q)=>q.eq("projectId",args.projectId))
            .collect()
        
        for(const file of files){
            // delete storage file if it exists
            if(file.storageId){
                await ctx.storage.delete(file.storageId);//remove the storage/binary files
            }

            await ctx.db.delete(file._id)//delete all the other files/folders as well

        }
        return {deleted: files.length}
    },
})

export const generateUploadUrl = mutation({
    args:{
        internalKey: v.string()
    },
    handler: async(ctx, args)=> {
        validateInternalKey(args.internalKey)
        return await ctx.storage.generateUploadUrl()//generate the url of the uploaded files
    },
})

export const createBinaryFile = mutation({
    args:{
        internalKey: v.string(),
        projectId: v.id("projects"),
        name: v.string(),
        storageId: v.id("_storage"),
        parentId: v.optional(v.id("files"))
    },
    handler: async(ctx, args)=> {
        validateInternalKey(args.internalKey)

        const files = await ctx.db
            .query("files")
            .withIndex("by_project_parent",(q)=>q
                .eq("projectId",args.projectId)
                .eq("parentId",args.parentId)
            )
            .collect()
        
            // same dupe check for bin files as well
        const existing = files.find(
            (file)=> file.name === args.name && file.type === "file"
        );

        if(existing) throw new Error("File already exists");

        const fileId = await ctx.db.insert("files",{
            projectId: args.projectId,
            name: args.name,
            type: "file",
            storageId: args.storageId,
            parentId: args.parentId,
            updatedAt: Date.now()
        })

        return fileId
    },
})

export const updateImportStatus = mutation({
    args:{
        internalKey: v.string(),
        projectId: v.id("projects"),
        status: v.optional(
            v.union(
                v.literal("importing"),
                v.literal("completed"),
                v.literal("failed"),
            )
        )
    },
    handler: async(ctx, args)=> {
        validateInternalKey(args.internalKey)

        await ctx.db.patch("projects",args.projectId,{
            importStatus: args.status,
            updatedAt: Date.now()
        })
    },
})


export const updateExportStatus = mutation({
    args:{
        internalKey: v.string(),
        projectId: v.id("projects"),
        status: v.optional(
            v.union(
                v.literal("exporting"),
                v.literal("cancelled"),
                v.literal("completed"),
                v.literal("failed"),
            )
        ),
        repoUrl: v.optional(v.string())
    },
    handler: async(ctx, args)=> {
        validateInternalKey(args.internalKey)

        await ctx.db.patch("projects",args.projectId,{
            exportStatus: args.status,
            exportRepoUrl: args.repoUrl,
            updatedAt: Date.now()
        })
    },
})

export const getProjectFilesWithUrls =  query({
    args:{
        internalKey: v.string(),
        projectId: v.id("projects"),
    },
    handler: async(ctx, args) =>{
        validateInternalKey(args.internalKey)

        const files  = await ctx.db
            .query("files")
            .withIndex("by_project",(q)=>q
                .eq("projectId",args.projectId)
            )
            .collect()
        
        return await Promise.all(
            files.map(async(file)=>{
                if(file.storageId){
                    const url = await ctx.storage.getUrl(file.storageId)//get the bin files' url
                    return {...file,storageUrl:url}//for images pass the other contents of the file as it is and the url in the storageUrl
                }
                return {...file,storageUrl:null}//for the normal files/folders grab the file as it was
            })
        )
    },
})

// to create project with the import github repo
export const createProject = mutation({
    args:{
        internalKey: v.string(),
        name: v.string(),
        ownerId: v.string()
    },
    handler: async(ctx, args)=> {
        validateInternalKey(args.internalKey)

        const projectId = await ctx.db.insert("projects",{
            name: args.name,
            ownerId: args.ownerId,
            updatedAt: Date.now(),
            importStatus: "importing"//its set to "importing" becoz this function will be accessed by an inngest bg-job when we begin the importing from github
        })
        return projectId
    },
})