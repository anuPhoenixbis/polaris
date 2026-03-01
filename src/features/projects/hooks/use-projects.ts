/* eslint-disable react-hooks/purity */
import { useMutation, useQuery } from "convex/react"
import { api } from "../../../../convex/_generated/api"
import { Id,Doc } from "../../../../convex/_generated/dataModel"

export const useProjects = () =>{
    // this hook fetches and return projects from the convex
    return useQuery(api.projects.get)
}

export const useProjectsPartial = (limit: number)=>{
    // also fetches the projects from convex but for a given limit of projects
    return useQuery(api.projects.getPartial,{
        limit
    })
}

export const useCreateProject = () =>{
    // projects creator
    return useMutation(api.projects.create).withOptimisticUpdate(
        // optimistic update initially mutates and store the projects in the localStorage but after all the mutation have been done
        // the update is then pushed to the db for permanent updates
        (localStore,args)=>{//to update the create project window; block the user from making new projects until the prev project is made 
            const existingProjects = localStore.getQuery(api.projects.get)//pushing the current project to the localStorage of the browser

            if(existingProjects !== undefined){
                const now = Date.now();
                const newProject = {
                    _id: crypto.randomUUID() as Id<"projects">,
                    _creationTime: now,
                    name: args.name,
                    ownerId: "anonymous",
                    updatedAt: now
                }
                localStore.setQuery(api.projects.get, {} , [
                    newProject,//push the new project to the existing projects in the localStorage
                    ...existingProjects
                ])
            }
        }
    )
}