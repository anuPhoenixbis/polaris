import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
    projects: defineTable({
        name: v.string(),
        ownerId: v.string(),
        importStatus: v.optional(//enums syntax in convex
            v.union(
                v.literal("importing"),
                v.literal("completed"),
                v.literal("failed")
            )
        )
    }).index("by_owner",["ownerId"])//indexing based on ownerId 
})