import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const create = mutation({
    args:{
        name: v.string(),
    },
    handler: async(ctx,args)=>{
        const identity = await ctx.auth.getUserIdentity()

        if(!identity) throw new Error("Unauthorized")

        const name = args.name.trim()//prevents project names such as "  "
        if(!name) throw new Error("Project name is required")
        
        await ctx.db.insert("projects",{
            name,
            ownerId: identity.subject
        })
    }
})

export const get = query({
    args:{},
    handler: async (ctx)=>{
        const identity = await ctx.auth.getUserIdentity()
        // get details about the currently authenticated user

        if(!identity) return []
        
        return await ctx.db
        .query("projects")
        .withIndex("by_owner",(q)=>q.eq("ownerId",identity.subject))//getting the projects by indexing for only the currently logged in user
        .collect();
    }
})