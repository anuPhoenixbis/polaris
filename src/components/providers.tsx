"use client"

import { ClerkProvider,SignInButton,SignUpButton,useAuth, UserButton } from "@clerk/nextjs"
import {ConvexProviderWithClerk} from "convex/react-clerk"
import { Authenticated, AuthLoading, ConvexReactClient, Unauthenticated } from "convex/react"
import { ThemeProvider } from "./theme-provider"
import { TooltipProvider } from "./ui/tooltip"
import UnauthenticatedView from "@/features/auth/components/unauthenticated-view"
import AuthLoadingView from "@/features/auth/components/auth-loading-view"

const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!)

export const Providers = ({children}:{children: React.ReactNode})=>{
    return (
        <ClerkProvider>
            <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
                <TooltipProvider>
                    <ThemeProvider
                        attribute="class"
                        defaultTheme="dark"
                        enableSystem
                        disableTransitionOnChange
                        >
                            <Authenticated>
                                <UserButton/>
                                {children}
                            </Authenticated>
                            <Unauthenticated>
                                <UnauthenticatedView/>
                            </Unauthenticated>
                            <AuthLoading>
                                <AuthLoadingView/>
                            </AuthLoading>
                    </ThemeProvider>    
                </TooltipProvider>
            </ConvexProviderWithClerk>
        </ClerkProvider>
    )
}