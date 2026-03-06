import { inngest } from "@/inngest/client";
import { Id } from "../../../../convex/_generated/dataModel";
import { NonRetriableError } from "inngest";
import { convex } from "@/lib/convex-client";
import { api } from "../../../../convex/_generated/api";
import { CODING_AGENT_SYSTEM_PROMPT, TITLE_GENERATOR_SYSTEM_PROMPT } from "./constants";
import { DEFAULT_CONVERSATION_TITLE } from "../constants";
import {createAgent, createNetwork, gemini} from "@inngest/agent-kit"
import { createReadFilesTool } from "./tools/read-files";
import { createListFilesTool } from "./tools/list-files";
import { createUpdateFileTool } from "./tools/update-file";
import { createCreateFilesTool } from "./tools/create-files";
import { createCreateFolderTool } from "./tools/create-folder";
import { createRenameFileTool } from "./tools/rename-file";
import { createDeleteFilesTool } from "./tools/delete-files";
import { createScrapeUrlsTool } from "./tools/scrape-urls";

interface MessageEvent{
    messageId: Id<"messages">;
    conversationId: Id<"conversations">;
    projectId: Id<"projects">;
    message: string;
}

export const processMessage = inngest.createFunction(
    {//event identification
        id: "process-message",
        // we use this to cancel the bg-job of the already processing message, when a new conversation is started
        cancelOn:[
            {
                event: "message/cancel",//we can cancel the bg-job on simply running this event 
                if: "event.data.messageId == async.data.messageId"//and if the data id matches the bg-job cancels
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
            messageId,
            conversationId,
            projectId,
            message
        } = event.data as MessageEvent

        const internalKey = process.env.POLARIS_CONVEX_INTERNAL_KEY;

        if(!internalKey){
            throw new NonRetriableError("POLARIS_CONVEX_INTERNAL_KEY isn't configured");
        }

        // check if this is needed
        // wait for db to sync with the live data from inngest
        await step.sleep("wait-for-db-sync","1s");

        // running convex functions using inngest


        // get conversation for title generation check
        const conversation = await step.run("get-conversation", async()=>{
            return await convex.query(api.system.getConversationById,{
                internalKey,
                conversationId,
            })
        })

        if(!conversation) throw new NonRetriableError("Conversation not found")

        // fetch recent messages for conversation context
        const recentMessages = await step.run("get-recent-messages", async()=>{
            return await convex.query(api.system.getRecentMessages,{
                internalKey,
                conversationId,
                limit: 10,
            })
        })

        // build the system prompt with conversation history (exclude the current processing message)
        let systemPrompt = CODING_AGENT_SYSTEM_PROMPT;

        // filter out the current processing message and empty messages
        const contextMessages = recentMessages.filter(
            (msg)=> msg._id !== messageId && msg.content.trim() !== ""
        )

        if(contextMessages.length > 0){
            // if there exists prev messages then grab the messages into a common history message
            const historyText = contextMessages.map((msg)=>`${msg.role.toUpperCase()}: ${msg.content}`).join("\n\n")

            systemPrompt += `\n\n#Previous Conversation (for context only - do NOT repeat these responses):\n${historyText}\n\n##Current Request:\nRespond ONLY to the user's new message below. Do not repeat or reference your previous responses.`
        }

        // generate conversation title if it's still the default
        const shouldGenerateTitle = conversation.title === DEFAULT_CONVERSATION_TITLE

        if(shouldGenerateTitle){
            const titleAgent = createAgent({
                name: "title-generator",
                system: TITLE_GENERATOR_SYSTEM_PROMPT,
                model: gemini({model: "gemini-2.5-flash"})
            })

            // received output from the model
            const{output} = await titleAgent.run(message,{step})

            // extracted message from the output
            const textMessage = output.find(
                (m)=> m.type === "text" && m.role === "assistant"
            )

            if(textMessage?.type === "text"){
                const title = 
                    typeof textMessage.content === "string"
                        ? textMessage.content.trim()
                        : textMessage.content
                            .map((c)=>c.text)
                            .join("")
                            .trim()
                
                if(title){
                    await step.run("update-conversation-title", async()=>{
                        await convex.mutation(api.system.updateConversationTitle,{
                            internalKey,
                            conversationId,
                            title,
                        });
                    })
                }
            }
        }

        // now the conversation title agent is setup, we will setup the coding agent with the file tools
        const codingAgent = createAgent({
            name: "polaris",
            description: "An expert AI coding assistant that not only writes code but explains it as well",
            system: systemPrompt,
            model: gemini({model: "gemini-2.5-flash"}),
            tools:[
                createListFilesTool({projectId,internalKey}),
                createReadFilesTool({internalKey}),
                createUpdateFileTool({internalKey}),
                createCreateFilesTool({projectId,internalKey}),
                createCreateFolderTool({projectId,internalKey}),
                createRenameFileTool({internalKey}),
                createDeleteFilesTool({internalKey}),
                createScrapeUrlsTool()
            ]
        })

        // now we have defined the agent along with its tools but no network to use it
        // we gotta connected various agents who are using specific tools to get the final results
        // a network consists of 3 things : agents (we already know abt that), state: past context messages and kv store that is shared b/w agent and router
        // and finally the router which chooses whether to stop/select the next agent to run in the loop
        const network = createNetwork({
            name: "polaris-network",
            agents: [codingAgent],
            maxIter:15,
            router: ({ network }) =>{
                const lastResult = network.state.results.at(-1)//get the last result

                // get the last response's text content
                const hasTextResponse = lastResult?.output.some(
                    (m)=>m.type === "text" && m.role === "assistant"
                )

                // check if the last call was a tool call
                const hasToolCalls = lastResult?.output.some(
                    (m)=>m.type === "tool_call"
                );

                if(hasTextResponse && !hasToolCalls){//we've had a text response and not another tool call then we end the loop here
                    return undefined;
                }

                return codingAgent;//or else we run for the next loop
            }
        }) 

        const result = await network.run(message)//run the agent from the network

        // extract the assistant text response from the last agent result
        const lastResult = result.state.results.at(-1);//get the last response
        const textMessage = lastResult?.output.find(
            (m)=> m.type === "text" && m.role === "assistant"
        )//extract the text

        let assistantResponse = "I processed you request. Let me know if you need anything else!";

        // finally based on the received textMessage we change the assistantResponse
        if(textMessage?.type === "text"){
            assistantResponse = 
                typeof textMessage.content === "string"
                    ? textMessage.content
                    : textMessage.content.map((c)=>c.text).join("")
        }

        // update the assistant message with the response(this also sets status to completed)
        await step.run("update-assistant-message",async()=>{
            await convex.mutation(api.system.updateMessageContent,{
                internalKey,
                messageId,
                content: assistantResponse
            })
        })

        return {success: true, messageId,conversationId}
    }
)