import { generateText } from "ai";
import { inngest } from "./client";
import { google } from "@ai-sdk/google";
import { firecrawl } from "@/lib/firecrawl";

const URL_REGEX = /https?:\/\/[^\s]+/g

export const demoGenerate = inngest.createFunction(
  { id: "demo-generate" },
  { event: "demo/generate" },
  async ({ event, step }) => {//running a background job using inngest to run a gemini response
    const {prompt} = event.data as {prompt : string}//get the prompt

    // extract the urls from the prompt
    const urls = await step.run("extract-urls",async()=>{
      return prompt.match(URL_REGEX) ?? []
    }) as string[];

    // scrape the data using the firecrawl of those urls
    const scrapedContent = await step.run("scrape-urls",async()=>{
      const results = await Promise.all(
        urls.map(async(url)=>{
          const result = await firecrawl.scrapeUrl(
            url,
            {formats : ["markdown"]},
          );
          return result ?? null
        })
      );
      return results.filter(Boolean).join("\n\n")
    })

    const finalPrompt = scrapedContent 
    ? `Context:\n${scrapedContent}\n\nQuestion: ${prompt}`
    : prompt


    return await step.run("generate-text",async()=>{
        return await generateText({
            model: google('gemini-2.5-flash'),
            prompt: finalPrompt,
            experimental_telemetry:{
                // to keep track of the tokens used via vercel ai sdk
                isEnabled:true,
                recordInputs:true,
                recordOutputs:true
            }
        })
    })
  },
);

// error handling purpose
export const demoError = inngest.createFunction(
  {id:"demo-error"},
  {event:"demo/error"},
  async({step})=>{
    await step.run("fail",async()=>{
      throw new Error("Inngest error: Background job failed")
    })
  }
)