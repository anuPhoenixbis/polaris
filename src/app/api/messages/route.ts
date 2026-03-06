import * as z from "zod"
import { NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { convex } from "@/lib/convex-client"
import { api } from "../../../../convex/_generated/api"
import { Id } from "../../../../convex/_generated/dataModel"
import { inngest } from "@/inngest/client"

const requestSchema = z.object({
    conversationId: z.string(),
    message: z.string()
})

export async function POST(request: Request){
    const {userId} = await auth()

    if(!userId) return NextResponse.json({error: "Unauthorized"},{status: 403})

    // to make this conversation fetching using the convex-client more safe we introduce the concept of
    // internalKey 

    const internalKey = process.env.POLARIS_CONVEX_INTERNAL_KEY;

    if(!internalKey){
        return NextResponse.json(
            {error:"Internal key not configured"},
            {status: 500}
        )
    }
    // if not having the internal key we won't be allowed the make requests the convex-client

    const body = await request.json();
    // parsing the schema with zod
    const { conversationId, message } = requestSchema.parse(body);
    
    // here we have to execute 2 tasks:
    // call the convex mutations or query
    // invoke inngest bg-jobs

    // call convex functions 
    const conversation = await convex.query(api.system.getConversationById,{
        conversationId: conversationId as Id<"conversations">,
        internalKey
    })

    if(!conversation){
        return NextResponse.json(
            {error:"Conversation not found"},
            {status: 404}
        )
    }

    const projectId = conversation.projectId;
    
    // check for previously processing messages so that we can shut them down and focus on running the latest one
    // get the previously processing messages
    const processingMessages = await convex.query(
        api.system.getProcessingMessages,
        {
            internalKey,
            projectId:projectId
        }
    )

    if(processingMessages.length > 0){
        // cancel all the processing messages and then we will create the new message
        await Promise.all(//after cancelling they will return their cancelledIds
            processingMessages.map(async (msg)=>{
                await inngest.send({
                    name: "message/cancel",//passing the event name
                    data:{
                        messageId: msg._id,//also the data id to cancel the this bg-job
                    },
                })

                // this convex fn will tell that the message bg-job got cancelled here
                await convex.mutation(api.system.updateMessageStatus,{
                    internalKey,
                    messageId: msg._id,
                    status: "cancelled"
                })
            })
        )
    }

    // create user message
    await convex.mutation(api.system.createMessage,{
        internalKey,
        conversationId: conversationId as Id<"conversations">,
        projectId,
        role: "user",
        content: message
    })

    // create assistant message placeholder with processing status
    const assistantMessageId = await convex.mutation(api.system.createMessage,{
        internalKey,
        conversationId: conversationId as Id<"conversations">,
        projectId,
        role: "assistant",
        content: "",
        status: "processing"
    })

    // invoke inngest to process the message
    const event = await inngest.send({
        name: "message/sent",
        data: {
            messageId: assistantMessageId,
            conversationId,
            projectId,
            message,
        }
    })

    return NextResponse.json({
        success: true,
        eventId: event.ids[0], // use inngest event id
        messageId: assistantMessageId
    })
}