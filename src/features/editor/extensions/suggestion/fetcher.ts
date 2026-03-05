import ky from "ky"
import { toast } from "sonner";
import * as z from "zod"

// running zod validation for both req and res and response fetching using ky (light-weight axios)
const suggestionRequestSchema = z.object({
    fileName: z.string(),
    code: z.string(),
    currentLine: z.string(),
    previousLines: z.string(),
    textBeforeCursor: z.string(),
    textAfterCursor: z.string(),
    nextLines: z.string(),
    lineNumber: z.number(),
})

const suggestionResponseSchema = z.object({
    suggestion: z.string()
})

type SuggestionRequest = z.infer<typeof suggestionRequestSchema>;
type SuggestionResponse = z.infer<typeof suggestionResponseSchema>;

// local heuristic function to avoid hitting the api suggestion all the time at every char change
export function shouldRequestCompletion(
  textBeforeCursor: string
): boolean {

    if (!textBeforeCursor) return false;

    const trimmed = textBeforeCursor.trim();

    // empty line
    if (trimmed.length === 0) return false;

    // completed statements
    if (
        trimmed.endsWith(";") ||
        trimmed.endsWith("{") ||
        trimmed.endsWith("}") ||
        trimmed.endsWith(")")
    ) {
        return false;
    }

    // comments
    if (trimmed.startsWith("//")) return false;

    // too little context
    if (trimmed.length < 3) {
        return false;
    }

    const triggerChars = [".", "(", "{", "=", ">", ","];

    // autocompletion trigger chars
    if (!triggerChars.some(c => textBeforeCursor.endsWith(c))) {
        return false;
    }

    return true;
}

export const fetcher = async(
    payload:SuggestionRequest,
    signal: AbortSignal
) : Promise<string | null> =>{
    // heuristic check
    if (!shouldRequestCompletion(payload.textBeforeCursor)) {
            return null;
        }
    try {
        const validatedPayload = suggestionRequestSchema.parse(payload)//validate the request
        const response = await ky
            .post("/api/suggestion",{
                json: validatedPayload,
                signal,//to abort the req to gemini when the signal is given from the abort controller
                timeout: 10_000,
                retry: 0,
            })
            .json<SuggestionResponse>()//fetch the response as a json response
        
        const validatedResponse = suggestionResponseSchema.parse(response);//validate the response

        return validatedResponse.suggestion || null;
    } catch (error) {
        if(error instanceof Error && error.name === "AbortError") return null;
        toast.error("Failed to fetch AI completion")
        return null;
    }
}