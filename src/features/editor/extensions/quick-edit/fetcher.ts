import ky from "ky"
import { toast } from "sonner";
import * as z from "zod"

// running zod validation for both req and res and response fetching using ky (light-weight axios)
const editRequestSchema = z.object({
    selectedCode: z.string(),
    fullCode: z.string(),
    instruction: z.string()
})

const editResponseSchema = z.object({
    editedCode: z.string()
})

type EditRequest = z.infer<typeof editRequestSchema>;
type EditResponse = z.infer<typeof editResponseSchema>;


export const fetcher = async(
    payload:EditRequest,
    signal: AbortSignal
) : Promise<string | null> =>{
    try {
        const validatedPayload = editRequestSchema.parse(payload)//validate the request
        const response = await ky
            .post("/api/quick-edit",{
                json: validatedPayload,
                signal,//to abort the req to gemini when the signal is given from the abort controller
                timeout: 30_000,//think longer than code completion
                retry: 0,
            })
            .json<EditResponse>()//fetch the response as a json response
        
        const validatedResponse = editResponseSchema.parse(response);//validate the response

        return validatedResponse.editedCode || null;
    } catch (error) {
        if(error instanceof Error && error.name === "AbortError") return null;
        toast.error("Failed to fetch AI quick edit")
        return null;
    }
}