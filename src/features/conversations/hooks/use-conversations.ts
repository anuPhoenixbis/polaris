import { useMutation, useQuery } from "convex/react";
import { Id } from "../../../../convex/_generated/dataModel";
import { api } from "../../../../convex/_generated/api";

// we must make the id type to be null as well so that we can skip this query if need be
export const useConversation = (id: Id<"conversations"> | null) =>{
    return useQuery(api.conversations.getById,id ? { id } : "skip")
}

export const useMessages = (conversationId: Id<"conversations"> | null) =>{
    return useQuery(
        api.conversations.getMessages,
        conversationId ? {conversationId} : "skip"
    )
}

export const useConversations = (projectId : Id<"projects">) =>{
    return useQuery(api.conversations.getByProject,{projectId})
}

export const useCreateConversation = () =>{
    return useMutation(api.conversations.create)
    // add optimistic mutation later
}
