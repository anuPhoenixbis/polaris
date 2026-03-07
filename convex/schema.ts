import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
    projects: defineTable({
        name: v.string(),
        ownerId: v.string(),
        updatedAt: v.number(),
        importStatus: v.optional(//enums syntax in convex
            v.union(
                v.literal("importing"),
                v.literal("completed"),
                v.literal("failed")
            )
        ),
        exportStatus: v.optional(
            v.union(
                v.literal("exporting"),
                v.literal("completed"),
                v.literal("failed"),
                v.literal("cancelled"),
            )
        ),
        exportRepoUrl: v.optional(v.string()),
        settings: v.optional(//defining the terminal settings of the current projects to pass to the webcontainers for the terminal view
            v.object({
                installCommand: v.optional(v.string()),
                devCommand: v.optional(v.string()),
            })
        )
    }).index("by_owner",["ownerId"]),//indexing based on ownerId 

    files:defineTable({
        projectId:v.id("projects"),//getting a foreign key as projectId from projects table(ownerId there)
        parentId: v.optional(v.id("files")),//can have a parent folder or can't (optional)
        name: v.string(),
        type: v.union(v.literal("file"),v.literal("folder")),//can be a file/folder (enum)
        content: v.optional(v.string()),//text files only(contains file contents)
        storageId: v.optional(v.id("_storage")),//convex holds the images(other types of files) in buckets thus we require a storage id for it
        updatedAt: v.number(),
    })
    // here we are defining the references of the foreign keys from their respective base tables
        .index("by_project",["projectId"])
        .index("by_parent",["parentId"])
        .index("by_project_parent",["projectId","parentId"]),//composite key using the parentId and the projectId

    conversations : defineTable({
        projectId: v.id("projects"),
        title: v.string(),
        updatedAt: v.number()
    }).index("by_project",["projectId"]),

    messages: defineTable({
        conversationId : v.id("conversations"),
        projectId: v.id("projects"),
        role: v.union(v.literal("user"),v.literal("assistant")),
        content: v.string(),
        status: v.optional(
            v.union(
                v.literal("processing"),
                v.literal("completed"),
                v.literal("cancelled"),
            )
        )
    })
    .index("by_conversation",["conversationId"])
    .index("by_project_status",["projectId","status"])
})