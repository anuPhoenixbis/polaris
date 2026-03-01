import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { verifyAuth } from "./auth";

export const create = mutation({
    args:{
        name: v.string(),
    },
    handler: async(ctx,args)=>{
        const identity =await verifyAuth(ctx)//our own useAuth method just like we have in clerk

        const name = args.name.trim()//prevents project names such as "  "
        if(!name) throw new Error("Project name is required")
        
        const projectId = await ctx.db.insert("projects",{
            name,
            ownerId:identity.subject,
            updatedAt:Date.now()
        })
        return projectId
    }
})

export const getPartial = query({
    args:{
        limit: v.number()
    },
    handler: async (ctx, args)=>{
        // const identity = await ctx.auth.getUserIdentity()
        // // get details about the currently authenticated user

        // if(!identity) return []
        if(!Number.isInteger(args.limit) || args.limit<1 || args.limit>100){
            throw new Error("limit must be an integer between 1 and 100")
        }
        const identity = await verifyAuth(ctx)

        return await ctx.db
        .query("projects")
        .withIndex("by_owner",(q)=>q.eq("ownerId",identity.subject))//getting the projects by indexing for only the currently logged in user
        .order("desc")
        .take(args.limit)
    }
})


export const get = query({
    args:{},
    handler: async (ctx)=>{
        // const identity = await ctx.auth.getUserIdentity()
        // // get details about the currently authenticated user

        // if(!identity) return []
        const identity = await verifyAuth(ctx)

        return ctx.db
        .query("projects")
        .withIndex("by_owner",(q)=>q.eq("ownerId",identity.subject))//getting the projects by indexing for only the currently logged in user
        .order("desc")
        .collect()
    }
})


export const getById = query({
    args:{
        id:v.id("projects")
    },
    handler: async (ctx,args)=>{
        // const identity = await ctx.auth.getUserIdentity()
        // // get details about the currently authenticated user

        // if(!identity) return []
        const identity = await verifyAuth(ctx)

        // its just like asking the an id from the projects table to return the project with the given id (its redundant)
        const project = await ctx.db.get("projects",args.id)
        //the get will also work without specifying the table name "projects" becoz the id here are ids from the projects table itself in the args

        if(!project) throw new Error("Project not found")

        if(project.ownerId !== identity.subject) throw new Error("Unauthorized access to this project")

        return project
    }
})


export const rename = mutation({
    args:{
        id:v.id("projects"),
        name: v.string()
    },
    handler: async (ctx,args)=>{
        // const identity = await ctx.auth.getUserIdentity()
        // // get details about the currently authenticated user

        // if(!identity) return []
        const identity = await verifyAuth(ctx)

        // its just like asking the an id from the projects table to return the project with the given id (its redundant)
        const project = await ctx.db.get("projects",args.id)
        //the get will also work without specifying the table name "projects" becoz the id here are ids from the projects table itself in the args

        if(!project) throw new Error("Project not found")

        if(project.ownerId !== identity.subject) throw new Error("Unauthorized access to this project")

        await ctx.db.patch("projects",args.id,{
            name:args.name,
            updatedAt: Date.now()
        })
    }
})