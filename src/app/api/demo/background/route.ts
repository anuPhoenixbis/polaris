//POST localhost:3000/api/demo/background
// this route will trigger google gemini via inngest's background job
import { inngest } from '@/inngest/client';



export async function POST(){
    await inngest.send({
        name:"demo/generate",
        data:{}
    })
    // console.log(response)
    return Response.json({status:"started"})
}