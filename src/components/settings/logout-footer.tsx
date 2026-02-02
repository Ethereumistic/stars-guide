'use client'

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useAuthActions } from "@convex-dev/auth/react"
import { Button } from "@/components/ui/button"
import { motion } from "motion/react"
import { LogOut } from "lucide-react"

interface LogoutFooterProps {
    delay?: number
}

export function LogoutFooter({ delay = 0.4 }: LogoutFooterProps) {
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
