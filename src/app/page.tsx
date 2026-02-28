"use client"

import { useMutation, useQuery } from "convex/react"
import { api } from "../../convex/_generated/api"
import { Button } from "@/components/ui/button"

function Page() {
  const projects = useQuery(api.projects.get)
  const createProject = useMutation(api.projects.create)
  return (
    <div className="flex flex-col gap-2 p-4">
      <Button onClick={()=>createProject({
        name: "New Project"
      })}>Add Project</Button>
      {projects?.map((project)=>(
        <div key={project._id} className="text-white border rounded p-2 flex flex-col">
          <p>{project.name}</p>
          <p>Owner Id: {project.ownerId}</p>
        </div>
      ))}
    </div>
  )
}

export default Page