'use client'

import { useState } from "react"
import { useMutation } from "convex/react"
import { useRouter } from "next/navigation"
import { useAuthActions } from "@convex-dev/auth/react"
import { api } from "@/../convex/_generated/api"
import { SettingsSection } from "./settings-section"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"
import { motion, AnimatePresence } from "motion/react"
import { AlertTriangle, Loader2, Trash2 } from "lucide-react"

interface DangerZoneSectionProps {
    delay?: number
}

export function DangerZoneSection({ delay = 0 }: DangerZoneSectionProps) {
    const router = useRouter()
    const { signOut } = useAuthActions()
    const deleteAccount = useMutation(api.users.deleteUserAccount)

    const [confirmText, setConfirmText] = useState("")
    const [isDeleting, setIsDeleting] = useState(false)
    const [showStep2, setShowStep2] = useState(false)

    const CONFIRM_WORD = "DELETE"
    const isConfirmMatch = confirmText === CONFIRM_WORD

    const handleInitiate = () => {
        setShowStep2(true)
    }

    const handleCancel = () => {
        setShowStep2(false)
        setConfirmText("")
    }

    const handleDeleteAccount = async () => {
        if (!isConfirmMatch) return

        setIsDeleting(true)
        try {
            await deleteAccount({})
            // Mutation succeeded — all user data is gone.
            // Sign out locally and redirect to homepage.
            await signOut()
            router.push("/")
            toast.success("Your account has been permanently deleted.")
        } catch (error: any) {
            console.error("Account deletion failed:", error)
            toast.error(
                error.message?.includes("Not authenticated")
                    ? "Session expired. Please sign in and try again."
                    : "Failed to delete account. Please try again or contact support."
            )
            setIsDeleting(false)
        }
    }

    return (
        <SettingsSection
            icon={<AlertTriangle className="h-5 w-5" />}
            title="Danger Zone"
            description="Irreversible account actions"
            delay={delay}
        >
            {/* Explanation */}
            <div className="space-y-3 mb-6">
                <p className="text-sm text-white/50 leading-relaxed">
                    Permanently delete your account and all associated data. This action is{" "}
                    <span className="text-red-400 font-medium">irreversible</span> and cannot be undone.
                </p>

                <div className="rounded-md border border-white/5 bg-white/2 p-4 space-y-2">
                    <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-white/30 block mb-2">
                        What gets deleted
                    </span>
                    <ul className="text-xs text-white/40 space-y-1.5">
                        <li className="flex items-start gap-2">
                            <span className="text-red-400/60 mt-0.5">&#x2022;</span>
                            Profile, birth data, chart, and settings
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="text-red-400/60 mt-0.5">&#x2022;</span>
                            All journal entries, streaks, and mood data
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="text-red-400/60 mt-0.5">&#x2022;</span>
                            Oracle conversations and AI session history
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="text-red-400/60 mt-0.5">&#x2022;</span>
                            Friends, notifications, and referral data
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="text-red-400/60 mt-0.5">&#x2022;</span>
                            Subscription history and stored photos
                        </li>
                    </ul>
                </div>

                <div className="rounded-md border border-white/5 bg-white/2 p-4 space-y-2">
                    <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-white/30 block mb-2">
                        What we retain (legal)
                    </span>
                    <ul className="text-xs text-white/40 space-y-1.5">
                        <li className="flex items-start gap-2">
                            <span className="text-white/20 mt-0.5">&#x2022;</span>
                            An anonymous deletion record (no email, name, or PII) for compliance auditing
                        </li>
                    </ul>
                </div>
            </div>

            {/* Step 1: Initiate */}
            {!showStep2 ? (
                <Button
                    variant="outline"
                    className="w-full text-red-400 hover:text-red-300 hover:bg-red-500/10 border-red-500/20 hover:border-red-500/30"
                    onClick={handleInitiate}
                >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete my account
                </Button>
            ) : (
                /* Step 2: Confirmation */
                <AnimatePresence>
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.3 }}
                        className="space-y-4"
                    >
                        <div className="rounded-md border border-red-500/20 bg-red-500/5 p-4">
                            <div className="flex items-start gap-3">
                                <AlertTriangle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
                                <div className="space-y-2">
                                    <p className="text-sm text-red-300 font-medium">
                                        This is your last chance to go back.
                                    </p>
                                    <p className="text-xs text-red-300/60">
                                        Type <code className="px-1.5 py-0.5 rounded bg-red-500/10 text-red-300 font-mono text-[11px] font-bold">{CONFIRM_WORD}</code> to confirm permanent deletion.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <Input
                            value={confirmText}
                            onChange={(e) => setConfirmText(e.target.value.toUpperCase())}
                            placeholder={`Type "${CONFIRM_WORD}" to confirm`}
                            className="h-11 font-mono text-center text-sm tracking-widest border-red-500/20 focus:border-red-500/40 focus:ring-red-500/20 placeholder:text-white/20"
                            disabled={isDeleting}
                            autoFocus
                        />

                        <div className="flex gap-3">
                            <Button
                                variant="outline"
                                className="flex-1"
                                onClick={handleCancel}
                                disabled={isDeleting}
                            >
                                Cancel
                            </Button>
                            <Button
                                variant="destructive"
                                className="flex-1"
                                onClick={handleDeleteAccount}
                                disabled={!isConfirmMatch || isDeleting}
                            >
                                {isDeleting ? (
                                    <>
                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                        Deleting...
                                    </>
                                ) : (
                                    <>
                                        <Trash2 className="h-4 w-4 mr-2" />
                                        Permanently delete
                                    </>
                                )}
                            </Button>
                        </div>
                    </motion.div>
                </AnimatePresence>
            )}
        </SettingsSection>
    )
}
