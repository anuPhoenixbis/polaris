import { Spinner } from '@/components/ui/spinner'
import React from 'react'

function AuthLoadingView() {
  return (
    <div 
        className='flex items-center justify-center h-screen bg-background'
        role="status"
        aria-live='polite'
        aria-busy='true'>
        <span className="sr-only">Loading authentication state</span>
        <Spinner className='size-6 text-ring'/>
    </div>
  )
}

export default AuthLoadingView