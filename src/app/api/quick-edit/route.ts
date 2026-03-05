import {google} from "@ai-sdk/google"
import {generateText, Output} from "ai"
import { NextResponse } from "next/server"
import * as z from "zod"

import { firecrawl } from "@/lib/firecrawl"
import { auth } from "@clerk/nextjs/server"

const quickEditSchema = z.object({
    editedCode: z
        .string()
        .describe(
            "The edited version of the selected code based on the instruction"
        )
})

const URL_REGEX = /https?:\/\/[^\s)>\]]+/g;

const QUICK_EDIT_PROMPT = `
# Role
You are a precise code refactoring and editing assistant. Your task is to modify a specific snippet of code based on user instructions while maintaining the integrity of the surrounding codebase.

# Context
- **Full File Context (Reference Only):**
---
{fullCode}
---

- **Code Selected for Editing:**
---
{selectedCode}
---

- **External Documentation/Rules:**
{documentation}

# User Instruction
Modify the "Code Selected for Editing" according to this request:
> {instruction}

# Strict Output Rules
1. **Output Content:** Return ONLY the modified version of the selected code snippet. Do not return the full file.
2. **Formatting:** Maintain the exact same indentation style and level as the original "Code Selected for Editing".
3. **No Prose:** Do not provide explanations, markdown backticks (unless the code itself is a markdown file), or "Here is the updated code."
4. **Safety Fallback:** If the instruction is unclear, irrelevant, or cannot be applied to the code, return the "Code Selected for Editing" exactly as it was provided.
5. **Cleanliness:** Remove any placeholder comments created during the editing process.

# Output Requirement
Return ONLY raw text.
`;

export async function POST(request: Request){
    try {
        const {userId} = await auth()
        const {selectedCode,fullCode,instruction} = await request.json()

        if(!userId){
            return NextResponse.json(
                {error: "Unauthorized"},
                {status: 403}
            )
        }
        if(!selectedCode){
            return NextResponse.json(
                {error: "Selected code is required"},
                {status: 400}
            )
        }

        if(!instruction){
            return NextResponse.json(
                {error: "Instruction is required"},
                {status: 400}
            )
        }

        const urls: string[] = instruction.match(URL_REGEX) || [];
        // eslint-disable-next-line prefer-const
        let documentationContext = "";

        if(urls.length > 0){
            const scrapedUrls = await Promise.all(
                urls.map(async (url)=>{
                    try {
                        const result = await firecrawl.scrapeUrl(url,{
                            formats: ["markdown"]
                        });
                        if (!result || !result.success) {
                            console.warn("Scrape failed or returned no content", url);
                            return null;
                        }

                        return `# Reference Documentation: ${url}
                                ---
                                ${result.markdown?.slice(0, 8000)}
                                ---
                                `;
                    } catch (error) {
                        console.warn("Scrape failed", url);
                        return null
                    }
                })
            )
            const validResults = scrapedUrls.filter(Boolean)

            // adding the context together
            if(validResults.length > 0){
                documentationContext = `
                    # Reference Documentation & Context
                    The following external documentation and code patterns should be used to inform your suggestions:

                    ---
                    ${validResults.join("\n\n---\n\n")}
                    ---
                    `;
            }
        }

        const prompt = QUICK_EDIT_PROMPT
            .replace("{selectedCode}",selectedCode)
            .replace("{fullCode}",fullCode || "")
            .replace("{instruction}",instruction)
            .replace("{documentation}",documentationContext)
        
        const {output} = await generateText({
            model: google("gemini-3-flash-preview"),
            output: Output.object({schema: quickEditSchema}),
            prompt
        })

        return NextResponse.json({ editedCode: output.editedCode })
    } catch (error) {
        console.error("Edit error",error)
        return NextResponse.json(
            {error: "Failed to generate edit"},
            {status: 500}
        )
    }
}