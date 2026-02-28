'use client'

import { Button } from "@/components/ui/button"
import { useState } from "react"

// Blocking blocks the user until the response is received ; not good user experience
// background jobs via inngest triggers the request to the model and whilst the user is doing other things
// background model request is being fulfilled via the model; thus the user isn't blocked in this case

function DemoPage() {
    const [loading,setLoading] = useState(false)
    const [loading2,setLoading2] = useState(false)
    const handleBlocking = async() =>{
        setLoading(true);
        await fetch("/api/demo/blocking",{method:"POST"})
        setLoading(false);
    }
    const handleBackground = async() =>{
        setLoading2(true);
        await fetch("/api/demo/background",{method:"POST"})
        setLoading2(false);
    }
  return (
    <div className="p-8 space-x-4">
        <Button disabled={loading} onClick={handleBlocking}>
            {loading ? "Loading..." : "Blocking"}
        </Button>
        <Button disabled={loading2} onClick={handleBackground}>
            {loading2 ? "Loading..." : "Background"}
        </Button>
    </div>
  )
}

export default DemoPage