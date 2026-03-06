import { convex } from "@/lib/convex-client"
import { auth } from "@clerk/nextjs/server"
import { NextResponse } from "next/server"
import *  as z from "zod"
import { api } from "../../../../../convex/_generated/api"
import { Id } from "../../../../../convex/_generated/dataModel"
import { inngest } from "@/inngest/client"

const requestSchema = z.object({
    projectId: z.string()
})
// we wish to keep running only 1 message is processing at a time
export async function POST(request: Request){
    const {userId} = await auth()

    if(!userId){
        return NextResponse.json({error: "Unauthorized"},{status: 403})
    }

    const body = await request.json();

    const {projectId} = requestSchema.parse(body);

    const internalKey = process.env.POLARIS_CONVEX_INTERNAL_KEY;

    if(!internalKey){
        return NextResponse.json(
            {error : "Internal key isn't configured"},
            {status: 500}
        )
    }

    // find all processing messages in this project to stop them
    // here we will query using the convex client to get the messages which are currently processing
    const processingMessages = await convex.query(
        api.system.getProcessingMessages,
        {
            internalKey,
            projectId:projectId as Id<"projects">
        }
    )

    if(processingMessages.length===0){
        return NextResponse.json(
            {success: true, cancelled: false,cancelledMessageIds: []}
        )
    }

    // cancel all the processing messages,i.e., remove all the bg-jobs for the messages which are processing
    // we will use the CancelOn prop of the inngest bg-job; we require the event name of the cancel and also the ids of the messages
    const cancelledIds = await Promise.all(//after cancelling they will return their cancelledIds
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

            return msg._id
        })
    )

    return NextResponse.json({
        success: true,
        cancelled: true,
        cancelledMessageIds: cancelledIds
    })
}