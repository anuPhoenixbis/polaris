import { cn } from '@/lib/utils'
import React from 'react'
import { getItemPadding } from './constants'
import { Spinner } from '@/components/ui/spinner'

function LoadingRow({
    className,
    level=0
}:{
    className?:string,
    level?: number
}) {
  return (
    <div 
        className={cn('h-5.5 flex items-center text-muted-foreground',className)}
        style={{paddingLeft: getItemPadding(level,true)}}>
        {/* passed the extra padding here as well */}
        <Spinner className='size-4 text-ring ml-0.5'/>
    </div>
  )
}

export default LoadingRow