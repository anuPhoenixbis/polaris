import ProjectIdLayout from '@/features/projects/components/project-id-layout';
import React from 'react'
import { Id } from '../../../../convex/_generated/dataModel';

async function layout({
    children,
    params
}:{
    children:React.ReactNode,
    params: Promise<{projectId: string}>
}) {
    const {projectId} = await params;
  return (
    <ProjectIdLayout projectId={projectId as Id<"projects">}>
        {/* casted to Id<"projects"> becoz nextjs route will take projectId only if they are strings so to be on the safe side we did this */}
        {children}
    </ProjectIdLayout>
  )
}

export default layout