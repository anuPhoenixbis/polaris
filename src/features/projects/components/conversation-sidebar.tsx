import React, { useState } from 'react'
import { Id } from '../../../../convex/_generated/dataModel'
import { DEFAULT_CONVERSATION_TITLE } from '../../../../convex/constants'
import { Button } from '@/components/ui/button'
import { CopyIcon, HistoryIcon, LoaderIcon, PlusIcon } from 'lucide-react'
import { Conversation, ConversationContent, ConversationScrollButton } from '@/components/ai-elements/conversation'
import { PromptInput, PromptInputBody, PromptInputFooter, PromptInputMessage, PromptInputSubmit, PromptInputTextarea, PromptInputTools } from '@/components/ai-elements/prompt-input'
import { useConversation, useConversations, useCreateConversation, useMessages } from '@/features/conversations/hooks/use-conversations'
import { toast } from 'sonner'
import { Message, MessageAction, MessageActions, MessageContent, MessageResponse } from '@/components/ai-elements/message'
import ky from 'ky'

interface ConversationSidebarProps {
    projectId : Id<"projects">
}

function ConversationSidebar({projectId}:ConversationSidebarProps) {
    const [input,setInput] = useState("")
    const [selectedConversationId,setSelectedConversationId] = useState<Id<"conversations">|null>(null)
    const createConversation = useCreateConversation()
    const conversations = useConversations(projectId)

    // active conversation will be the selected conversation/ after a hard refresh we will fallback to the current projects' latest conversation or else just null
    const activeConversationId = selectedConversationId ?? conversations?.[0]?._id ?? null

    const activeConversation = useConversation(activeConversationId)//fetch the current active conversation by the active conversation id
    const conversationMessages = useMessages(activeConversationId)

    // check if any message is currently processing; if so then we won't allow user to send more messages in the conversation; but they can trigger cancel 
    const isProcessing = conversationMessages?.some(
        (msg) => msg.status === "processing"
    )

    const handleCreateConversation = async() =>{
        try {
            // get a new conversation id using the createConversation hook
            const newConversationId = await createConversation({
                projectId,
                title: DEFAULT_CONVERSATION_TITLE
            })
            // set the id
            setSelectedConversationId(newConversationId)
            return newConversationId;//return the id
        } catch (error) {
            toast.error("Unable to create new conversation")
            return null;
        }
    }

    const handleSubmit = async(message: PromptInputMessage) =>{
        // if we are processing and no new message, this is just a stop function so this will trigger handleSubmit so we gotta do handle cancel
        if(isProcessing && !message.text){
            // await handleCancel()
            setInput("")
            return;
        }

        let conversationId = activeConversationId;
        if(!conversationId){
            conversationId = await handleCreateConversation();//create new converse
            if(!conversationId){
                return;//even then it the id DNE then just break
            }
        }

        // trigger inngest function via api
        try {
            await ky.post("/api/messages",{
                json:{
                    conversationId,
                    message: message.text,
                },
            });
        } catch (error) {
            toast.error("Message failed to send")//failing here
        } finally{
            setInput("");
        }
    }

  return (
    <div className='flex flex-col h-full bg-sidebar'>
        <div className="h-8 75 flex items-center justify-between border-b">
            <div className='text-sm truncate pl-3'>
                {activeConversation?.title ?? DEFAULT_CONVERSATION_TITLE}
            </div>
            <div className='flex items-center px-1 gap-1'>
                <Button
                    size="icon-xs"
                    variant="highlight"
                >
                    <HistoryIcon className='size-3.5'/>
                </Button>
                <Button
                    size="icon-xs"
                    variant="highlight"
                    onClick={handleCreateConversation}
                >
                    <PlusIcon className='size-3.5'/>
                </Button>
            </div>
        </div>
        <Conversation className="flex-1">
            <ConversationContent>
                {conversationMessages?.map((message,messageIndex)=>{
                    return <Message
                        key={message._id}
                        from={message.role}
                    >
                        <MessageContent>
                            {message.status === "processing" ? (
                                <div className='flex items-center gap-2 text-muted-foreground'>
                                    <LoaderIcon className='animate-spin text-muted-foreground'/>
                                    <span>Thinking...</span>
                                </div>
                            ) : (
                                <MessageResponse>
                                    {/* we don't have to do much here shadcn automatically handles the message to render */}
                                    {message.content}
                                </MessageResponse>
                            )}
                        </MessageContent>
                        {/* if the entire message is rendered we do the following */}
                        {message.role === "assistant" && 
                        message.status === "completed" && 
                        messageIndex ===(conversationMessages?.length ?? 0)-1 && (
                            <MessageActions>
                                <MessageAction
                                    onClick={()=>{
                                        // copy the message content to the clipboard
                                        navigator.clipboard.writeText(message.content)
                                    }}
                                    label="Copy"
                                >
                                    <CopyIcon className='size-3'/>
                                </MessageAction>
                            </MessageActions>
                        ) }
                    </Message>
                })}
            </ConversationContent>
            <ConversationScrollButton/>
        </Conversation>
        <div className="p-3">
            <PromptInput
                onSubmit={handleSubmit}
                className='mt-2'
            >
                <PromptInputBody>
                    <PromptInputTextarea
                        placeholder='What do you want to build today?'
                        onChange={(e)=>{
                            setInput(e.target.value)
                        }}
                        value={input}
                        disabled={isProcessing}
                    />
                </PromptInputBody>
                <PromptInputFooter>
                    <PromptInputTools/>
                    <PromptInputSubmit
                    // its disabled when isProcessing is true and input is not given otherwise its enabled
                        disabled={isProcessing ? false : !input}
                        status={isProcessing ? "streaming" : undefined}
                    />
                </PromptInputFooter>
            </PromptInput>
        </div>
    </div>
  )
}

export default ConversationSidebar