'use client'

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useAuthActions } from "@convex-dev/auth/react"
import { Button } from "@/components/ui/button"
import { motion } from "motion/react"
import { LogOut } from "lucide-react"

interface LogoutFooterProps {
    delay?: number
    compact?: boolean
}

export function LogoutFooter({ delay = 0.4, compact = false }: LogoutFooterProps) {
    const { signOut } = useAuthActions()
    const router = useRouter()
    const [isSigningOut, setIsSigningOut] = useState(false)

    const handleSignOut = async () => {
        setIsSigningOut(true)
        try {
            await signOut()
            router.push("/")
        } catch (error) {
            console.error("Sign out failed:", error)
            setIsSigningOut(false)
        }
    }

    if (compact) {
        return (
            <button
                onClick={handleSignOut}
                disabled={isSigningOut}
                className="group flex items-center gap-3 w-full px-4 py-3 rounded-md border border-transparent
                           text-white/30 hover:text-red-400 hover:border-red-500/20 hover:bg-red-500/5
                           transition-all duration-200 text-left"
            >
                <LogOut className="size-4 shrink-0 transition-colors text-white/20 group-hover:text-red-400" />
                <span className="font-mono text-xs uppercase tracking-[0.15em] leading-tight">
                    {isSigningOut ? "Signing out..." : "Log out"}
                </span>
            </button>
        )
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay }}
            className="pt-4"
        >
            <Button
                variant="outline"
                className="w-full text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/20"
                onClick={handleSignOut}
                disabled={isSigningOut}
            >
                <LogOut className="h-4 w-4 mr-2" />
                {isSigningOut ? 'Signing out...' : 'Log out'}
            </Button>
        </motion.div>
    )
}
