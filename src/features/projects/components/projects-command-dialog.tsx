import { useRouter } from 'next/navigation'
import React from 'react'
import { useProjects } from '../hooks/use-projects'
import { Doc } from '../../../../convex/_generated/dataModel'
import { FaGithub } from 'react-icons/fa'
import { AlertCircleIcon, GlobeIcon, Loader2Icon } from 'lucide-react'
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
interface ProjectsCommandDialogProps{
    open: boolean,
    onOpenChange: (open: boolean)=>void
}

const getProjectIcon = (project:Doc<"projects">)=>{
    if(project.importStatus === 'completed'){
        return <FaGithub className="size-4 text-muted-foreground"/>
    }
    if(project.importStatus === 'failed'){
        return <AlertCircleIcon className="size-4 text-muted-foreground"/>
    }
    if(project.importStatus === 'importing'){
        return <Loader2Icon className="animate-spin size-4 text-muted-foreground"/>
    }

    return <GlobeIcon className="size-4 text-muted-foreground"/>
}

function ProjectsCommandDialog({
    open,
    onOpenChange
}:ProjectsCommandDialogProps) {
    const router = useRouter()
    const projects = useProjects()

    const handleSelect = (projectId: string)=>{
        // to redirect us to the project page which is selected
        router.push(`/projects/${projectId}`)
        onOpenChange(false)//when to close the view all model
    }
  return (
    <CommandDialog
        open={open}
        onOpenChange={onOpenChange}
        title='Search Projects'
        description='Search and navigate to your projects'
        >
        <CommandInput placeholder='Search projects...'/>
        <CommandList>
            <CommandEmpty>No projects found</CommandEmpty>
            <CommandGroup heading="Projects">
                {projects?.map((project)=>{
                    return <CommandItem 
                        key={project._id}
                        value={`${project.name}-${project._id}`}
                        onSelect={()=>handleSelect(project._id)}>
                            {getProjectIcon(project)}
                            <span>{project.name}</span>
                    </CommandItem>
                })}
            </CommandGroup>
        </CommandList>
    </CommandDialog>
  )
}

export default ProjectsCommandDialog