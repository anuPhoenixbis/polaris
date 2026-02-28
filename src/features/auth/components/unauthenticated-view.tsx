import { Button } from '@/components/ui/button'
import { Item, ItemActions, ItemContent, ItemDescription, ItemMedia, ItemTitle } from '@/components/ui/item'
import { SignInButton } from '@clerk/nextjs'
import { ShieldAlertIcon } from 'lucide-react'
import React from 'react'

function UnauthenticatedView() {
  return (
    <div className='flex items-center justify-center h-screen bg-background'>
        <div className="w-full max-w-lg bg-muted text-white">
            <Item variant={"outline"}>
                <ItemMedia variant={"icon"}>
                    <ShieldAlertIcon/>
                </ItemMedia>
                <ItemContent>
                    <ItemTitle>Unauthorized Access</ItemTitle>
                    <ItemDescription>You are not authorized to access this page</ItemDescription>
                </ItemContent>
                <ItemActions>
                    <SignInButton>
                        <Button variant="outline" size="sm">Sign In</Button>
                    </SignInButton>
                </ItemActions>
            </Item>
        </div>
    </div>
  )
}

export default UnauthenticatedView