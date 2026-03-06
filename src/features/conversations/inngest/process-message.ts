import { inngest } from "@/inngest/client";
import { Id } from "../../../../convex/_generated/dataModel";
import { NonRetriableError } from "inngest";
import { convex } from "@/lib/convex-client";
import { api } from "../../../../convex/_generated/api";

interface MessageEvent{
    messageId: Id<"messages">
}

export const processMessage = inngest.createFunction(
    {//event identification
        id: "process-message",
        cancelOn:[
            {
                event: "message/event",//we can cancel the bg-job on simply running this event and if the data id matches
                if: "event.data.messageId == async.data.messageId"
            }
        ],
        onFailure: async ({
            event ,step
        })=>{
            const {messageId} = event.data.event.data as MessageEvent;
            const internalKey = process.env.POLARIS_CONVEX_INTERNAL_KEY;

            // update the message with the error content
            if(internalKey){
                await step.run("update-message-on-failure", async ()=>{
                    await convex.mutation(api.system.updateMessageContent,{
                        internalKey,
                        messageId,
                        content:
                            "We deeply regret the inconvenience caused, we encountered an error while processing your request."
                    })
                })
            }
        }   
    },{//event trigger name
        event: "message/sent"
    },//event itself
    async ({event,step})=>{
        const{
            messageId
        } = event.data as MessageEvent

        const internalKey = process.env.POLARIS_CONVEX_INTERNAL_KEY;

        if(!internalKey){
            throw new NonRetriableError("POLARIS_CONVEX_INTERNAL_KEY isn't configured");
        }

        // to pretend the ai-processing
        await step.sleep("wait-for-ai-processing","5s");


        await step.run("update-assistant-message",async()=>{
            await convex.mutation(api.system.updateMessageContent,{
                internalKey,
                messageId,
                content: "AI processed this message(faker)"
            })
        })
    }
)