import { convex } from "@/lib/convex-client"
import { auth, clerkClient } from "@clerk/nextjs/server"
import { NextResponse } from "next/server"
import * as z from "zod"
import { api } from "../../../../../convex/_generated/api"
import { inngest } from "@/inngest/client"

const requestSchema = z.object({
    url: z.url(),
})

function parseGithubUrl(url:string){
    const match = url.match(/github\.com\/([^/]+)\/([^/]+)/)
    if(!match) throw new Error("Invalid github url")

    return {
        owner: match[1],
        repo: match[2].replace(/\.git$/,"")
    }
}

export async function POST(request: Request){
    const {userId} = await auth()

    if(!userId){
        return NextResponse.json({
            error: "Unauthorized"
        },{
            status: 401
        })
    }

    const body = await request.json()
    const {url} = requestSchema.parse(body)

    const{owner,repo} = parseGithubUrl(url)
    // we will pass the url and it will extract the repo and the owner out of it

    const client = await clerkClient()
    // grab the oath token which we have enabled from the clerk an github
    const tokens = await client.users.getUserOauthAccessToken(userId,"github");

    const githubToken = tokens.data[0]?.token;

    if(!githubToken){
        return NextResponse.json(
            {error: "Github not connected. Please reconnect you github account"},
            {status: 400}
        )
    }

    const internalKey = process.env.POLARIS_CONVEX_INTERNAL_KEY

    if(!internalKey){
        return NextResponse.json(
            {error: "Server configuration error"},
            {status: 500},
        )
    }

    const projectId = await convex.mutation(api.system.createProject,{
        internalKey,
        name: repo,
        ownerId: userId,
    })

    // trigger a bg-job of inngest which will create a project using a git repo and also its files/folders
    const event = await inngest.send({
        name: "github/import.repo",
        data:{
            owner,
            repo,
            projectId,
            githubToken,
        }
    })

    return NextResponse.json(
        ({
            success: true,
            projectId,
            eventId: event.ids[0]
        })
    )
}