'use client'

import { Button } from "@/components/ui/button"
import { useState } from "react"
import * as Sentry from "@sentry/nextjs"
import { useAuth } from "@clerk/nextjs"

// Blocking blocks the user until the response is received ; not good user experience
// background jobs via inngest triggers the request to the model and whilst the user is doing other things
// background model request is being fulfilled via the model; thus the user isn't blocked in this case

function DemoPage() {
    const {userId} = useAuth()
    const [loading,setLoading] = useState(false)
    const [loading2,setLoading2] = useState(false)
    const handleBlocking = async() =>{
        setLoading(true);
        try {
            const res = await fetch("/api/demo/blocking",{method:"POST"})
            if(!res.ok) throw new Error("Blocking req failed")
        } finally{
            setLoading(false);
        }
    }
    const handleBackground = async() =>{
        setLoading2(true);
        try {
            const res = await fetch("/api/demo/background",{method:"POST"})
            if(!res.ok) throw new Error("Background req failed")
        } finally{
            setLoading2(false);
        }
    }

    // throws browser error
    const handleClientError = ()=>{
        // create our own logs using sentry
        Sentry.logger.info("User attempting to click a client function",{userId})
        throw new Error("Client Error: Something went wrong in the browser");
    }
    // api error
    const handleApiError = async ()=>{
        await fetch("/api/demo/error",{method : "POST"})
    }
    // inngest error
    const handleInngestError = async ()=>{
        await fetch("api/demo/inngest-error",{method:"POST"})
    }
  return (
    <div className="p-8 space-x-4">
        <Button disabled={loading} onClick={handleBlocking}>
            {loading ? "Loading..." : "Blocking"}
        </Button>
        <Button disabled={loading2} onClick={handleBackground}>
            {loading2 ? "Loading..." : "Background"}
        </Button>
        <Button
            variant="destructive"
            onClick={handleClientError}>
            Client Error
        </Button>
        <Button
            variant="destructive"
            onClick={handleApiError}>
            Api Error
        </Button>
        <Button
            variant="destructive"
            onClick={handleInngestError}>
            Inngest Error
        </Button>
    </div>
  )
}

export default DemoPage