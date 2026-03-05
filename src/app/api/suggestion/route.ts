import {generateText,Output} from "ai";
import { NextResponse } from "next/server";
import * as z from "zod"
import {google} from "@ai-sdk/google"
import { auth } from "@clerk/nextjs/server";

const suggestionSchema = z.object({
    suggestion: z
        .string()//text given from the main codebase
        .describe(//prompt to the ai
            "The code to insert at cursor, or empty string if no completion needed"
        )
})

const SUGGESTION_PROMPT = `
# Role
You are an expert AI code completion engine. Your goal is to provide seamless, context-aware code suggestions.

# Context
- **File Name:** {fileName}
- **Full Code Overview:**
---
{code}
---

- **Local Context:**
    - **Previous Lines:** {previousLines}
    - **Line {lineNumber} (Before Cursor):** {textBeforeCursor}
    - **Line {lineNumber} (After Cursor):** {textAfterCursor}
    - **Upcoming Lines:** {nextLines}

# Logic & Constraints
Follow these rules strictly, in order:

1. **Check for Redundancy:** Examine the "Upcoming Lines". If the code that should logically follow the cursor already exists in "Upcoming Lines", return an empty string immediately.
2. **Check for Completion:** If "Before Cursor" ends with a complete statement (e.g., a semicolon, a closing brace, or a complete function call), return an empty string.
3. **Completion Only:** If neither above applies, generate the code that should be typed at the cursor position.
4. **No Duplication:** Never suggest code that is already present in "After Cursor" or "Upcoming Lines".
5. **No Prose:** Do not provide explanations, markdown code blocks (unless the code itself requires them), or "Here is your code."

# Output Requirement
Return ONLY the raw code string to be inserted at the cursor. If no suggestion is needed, return an empty string.`;

export async function POST(request: Request){
    try {
        const {userId} = await auth()//should hit api only when logged in user access it
        if(!userId) {
            return NextResponse.json(
                {error:"Unauthorized" },
                {status: 403}
            )
        }
        const {
            fileName,
            code,
            currentLine,
            previousLines,
            textBeforeCursor,
            textAfterCursor,
            nextLines,
            lineNumber
        } = await request.json()

        if(!code){
            return NextResponse.json(
                // {error: "Code is required"},
                // {status:400}
                {suggestion: ""}
            )
        }

        const prompt = SUGGESTION_PROMPT
            .replace('{fileName}', fileName)
            .replace('{code}', code)
            .replace('{currentLine}', currentLine)
            .replace('{previousLines}', previousLines || "")
            .replace('{textBeforeCursor}', textBeforeCursor)
            .replace('{textAfterCursor}', textAfterCursor)
            .replace('{nextLines}', nextLines || "")
            .replace('{lineNumber}', lineNumber.toString())
        
            try {
                const {output} = await generateText({
                    model: google("gemini-3.1-flash-lite-preview"),
                    output: Output.object({schema: suggestionSchema}),
                    prompt
                })
                return NextResponse.json({
                    suggestion: output?.suggestion ?? "",
                })
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            } catch (aiError:any) {
                console.warn("AI completion skipped", aiError?.message);
                // return empty suggestion instead of failing
                return NextResponse.json({
                    suggestion: "",
                })
            }
        
            // previously we were just fetching the output response from the api hit and returning and any error is thrown with a sonner
            // but for gemini it will also trigger api hits for empty spaces or other redundant stuffs
            // we gotta configure the error handling block based on that so that an empty string is passed if we fail
            // we also ran a heuristics check on the context before doing an api hit so the requests doesn't hit all the times
            // reduce huge token usage and hit only when needed
        // const {output} = await generateText({
        //     model: google("gemini-3.1-flash-lite-preview"),
        //     output: Output.object({schema: suggestionSchema}),
        //     prompt
        // })

        // return NextResponse.json({suggestion: output.suggestion})
    } catch (error) {
        console.error("Suggestion route error",error);
        return NextResponse.json(
            // {error:"Failed to generate suggestion"},
            // {status: 500}
            {suggestion:""}
        )
    }
}