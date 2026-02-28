//POST localhost:3000/api/demo/blocking
// this route will trigger google gemini
import { generateText } from 'ai';
import { google } from '@ai-sdk/google';



export async function POST(){
    try {
        const response = await generateText({
            model: google('gemini-2.5-flash'),
            prompt: 'Write a vegetarian lasagna recipe for 4 people.',
            experimental_telemetry:{
                // to keep track of the tokens used via vercel ai sdk
                isEnabled:true,
                recordInputs:true,
                recordOutputs:true
            }
        })
        // console.log(response)
        return Response.json({response})
    } catch (error) {
        return Response.json(
            {error:"Text generation failed"},
            {status:502}
        )
    }
}