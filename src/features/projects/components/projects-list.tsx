import { Spinner } from "@/components/ui/spinner"
import { useProjectsPartial } from "../hooks/use-projects"
import { Kbd } from "@/components/ui/kbd"
import { Doc } from "../../../../convex/_generated/dataModel"
import Link from "next/link"
import { AlertCircleIcon, ArrowRightIcon, GlobeIcon, Loader2Icon } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { FaGithub } from "react-icons/fa"
import { Button } from "@/components/ui/button"

// formats date/time of project creation
const formatTimestamp = (timestamp : number)=>{
    return formatDistanceToNow(new Date(timestamp),{
        addSuffix:true
    })
}

const getProjectIcon = (project:Doc<"projects">)=>{
    if(project.importStatus === 'completed'){
        return <FaGithub className="size-3.5 text-muted-foreground"/>
    }
    if(project.importStatus === 'failed'){
        return <AlertCircleIcon className="size-3.5 text-muted-foreground"/>
    }
    if(project.importStatus === 'importing'){
        return <Loader2Icon className="animate-spin size-3.5 text-muted-foreground"/>
    }

    return <GlobeIcon className="size-3.5 text-muted-foreground"/>
}

interface ProjectsListProps {
    onViewAll: () => void
}

const ContinueCard = ({data}:{data:Doc<"projects">})=>(
    <div className="flex flex-col gap-2">
        <span className="text-xs text-foreground">Last Updated</span>
        <Button
            variant="outline"
            asChild
            className="h-auto items-start justify-start p-4 bg-background border rounded-none flex flex-col gap-2">
            <Link
                href={`/projects/${data._id}`}
                className="group">
                <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-2">
                        {getProjectIcon(data)}
                        <span className="font-medium truncate">{data.name}</span>
                    </div>
                    <ArrowRightIcon className="size-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform"/>
                </div>
                <span className="text-xs text-muted-foreground">
                    {formatTimestamp(data.updatedAt)}
                </span>
            </Link>
        </Button>
    </div>
)


const ProjectItem = ({data}:{data:Doc<"projects">})=>(
    <Link 
        href={`/projects/${data._id}`}
        className="text-sm text-foreground/60 font-medium hover:text-foreground py-1 flex items-center justify-between w-full group"
    >
        <div className="flex items-center gap-2">
            {getProjectIcon(data)}
            <span className="truncate">{data.name}</span>
        </div>
        <span className="text-xs text-muted-foreground group-hover:text-foreground/60 transition-colors">
            {formatTimestamp(data.updatedAt)}
        </span>
    </Link>
)

function ProjectsList({
    onViewAll
}: ProjectsListProps) {
    const projects = useProjectsPartial(6)//fetches only 6 projects from the convex using our own hook

    if(projects==undefined) return <Spinner className="size-4 text-ring"/>

    // first project in the "most recent" rest of them in the "rest"
    const[mostRecent,...rest] = projects

  return (
    <div className="flex flex-col gap-4">
        {/* passing the most recent project to the continue card to continue building on it */}
        {mostRecent && <ContinueCard data={mostRecent} />}
        {/* rest of the projects are shown below */}
        {rest.length > 0 && (
            <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between gap-2">
                    <span className="text-xs text-muted-background">Recent Projects</span>
                    <button onClick={onViewAll} className="text-xs text-muted-foreground flex items-center gap-2 hover:text-foreground transition-colors">
                        <span>View All</span>
                        <Kbd className="bg-accent border">
                            ⌘K
                        </Kbd>
                    </button>
                </div>
                <ul>
                    {projects.map((project)=>(
                        <ProjectItem
                            key={project._id}
                            data={project}
                            />
                    ))}
                </ul>
            </div>
        )}
    </div>
  )
}

export default ProjectsList