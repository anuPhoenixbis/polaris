import * as z from "zod"
import {
    adjectives,
    animals,
    colors,
    uniqueNamesGenerator
} from "unique-names-generator"
import { auth } from "@clerk/nextjs/server"
import { NextResponse } from "next/server";
import { convex } from "@/lib/convex-client";
import { api } from "../../../../../convex/_generated/api";
import { DEFAULT_CONVERSATION_TITLE } from "@/features/conversations/constants";
import { inngest } from "@/inngest/client";

const requestSchema = z.object({
    prompt: z.string().min(1),
})

export async function POST(request: Request){
    const {userId} = await auth();

    if(!userId){
        return NextResponse.json({error: "Unauthorized"},{status: 401})
    }

    const internalKey = process.env.POLARIS_CONVEX_INTERNAL_KEY;
    if(!internalKey){
        return NextResponse.json(
            {error: "Internal key not configured"},
            {status: 500}
        )
    }

    const body = await request.json()
    const {prompt} = requestSchema.parse(body);

    // generate random project names
    const projectName = uniqueNamesGenerator({
        dictionaries: [adjectives,animals,colors],
        separator:"-",
        length:3
    })

    // create project and conversation together
    const { projectId,conversationId } = await convex.mutation(api.system.createProjectWithConversation,{
        internalKey,
        projectName,
        conversationTitle: DEFAULT_CONVERSATION_TITLE,
        ownerId: userId
    })

    // create user message
    await convex.mutation(api.system.createMessage,{
        internalKey,
        conversationId,
        projectId,
        role: "user",
        content: prompt,
    })

    // create assistant message placeholder with processing status
    const assistantMessageId = await convex.mutation(api.system.createMessage,{
        internalKey,
        conversationId,
        projectId,
        role: "assistant",
        content: "",
        status: "processing",
    })

    // trigger inngest bg jobs to process the message
    await inngest.send({
        name: "message/sent",
        data:{
            messageId: assistantMessageId,
            conversationId,
            projectId,
            message: prompt,
        }
    })

    return NextResponse.json({ projectId })
}