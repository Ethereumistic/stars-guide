"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useOnboardingStore } from "@/store/use-onboarding-store"
import { useAuthActions } from "@convex-dev/auth/react"
import { useMutation } from "convex/react"
import { api } from "../../../../../convex/_generated/api"
import { motion } from "motion/react"
import { Lock, ArrowRight, ChevronLeft, Loader2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { getZodiacSignByDate, ZODIAC_SIGNS } from "@/utils/zodiac"

export function PasswordStep() {
    const {
        email,
        birthDate,
        birthLocation,
        birthTime,
        prevStep,
        reset,
        calculatedSigns
    } = useOnboardingStore()
    const { signIn } = useAuthActions()
    const updateBirthData = useMutation(api.users.updateBirthData)
    const router = useRouter()
    const [password, setPassword] = React.useState("")
    const [isLoading, setIsLoading] = React.useState(false)
    const [error, setError] = React.useState<string | null>(null)

    const handleFinalize = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!email || !password || !birthDate || !birthLocation || !calculatedSigns) return

        setIsLoading(true)
        setError(null)

        try {
            const { sunSign, moonSign, risingSign } = calculatedSigns
            const dateStr = `${birthDate.year}-${birthDate.month.toString().padStart(2, '0')}-${birthDate.day.toString().padStart(2, '0')}`

            const fullBirthData = {
                date: dateStr,
                time: birthTime || "12:00",
                location: birthLocation,
                sunSign,
                moonSign,
                risingSign
            }

            await signIn("password", {
                email,
                password,
                flow: "signUp",
                birthData: JSON.stringify(fullBirthData)
            })

            toast.success("Account created! Welcome to the stars.")

            // Reset the store explicitly before navigation
            reset()

            router.push("/dashboard")
        } catch (error) {
            console.error("Finalization failed:", error)
            const errorMessage = error instanceof Error ? error.message : "Something went wrong. Please try again."
            setError(errorMessage)
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="max-w-md mx-auto space-y-8">
            <div className="text-center space-y-2">
                <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="inline-block p-2 mb-4"
                >
                    <div className="p-2 bg-primary/20 rounded-full inline-block">
                        <Lock className="size-6 text-primary" />
                    </div>
                </motion.div>
                <h2 className="text-3xl font-serif">Secure Your Sanctuary</h2>
                <p className="text-muted-foreground text-sm">
                    Create a password to access your chart and future readings from any device.
                </p>
                <div className="pt-2">
                    <span className="text-xs px-2 py-1 bg-primary/10 rounded-full text-primary border border-primary/20">
                        {email}
                    </span>
                </div>
            </div>

            <form onSubmit={handleFinalize} className="space-y-4">
                <div className="space-y-2">
                    <Input
                        type="password"
                        placeholder="Choose a strong password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="h-12 bg-background/40 backdrop-blur-md text-lg text-center"
                    />
                </div>

                {error && (
                    <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm text-center">
                        {error}
                    </div>
                )}

                <div className="flex flex-col gap-3 pt-4">
                    <Button
                        size="lg"
                        type="submit"
                        className="h-14 text-lg w-full group"
                        disabled={password.length < 6 || isLoading}
                    >
                        {isLoading ? (
                            <Loader2 className="size-5 animate-spin" />
                        ) : (
                            <>
                                Finalize My Chart
                                <ArrowRight className="ml-2 size-5 transition-transform group-hover:translate-x-1" />
                            </>
                        )}
                    </Button>
                    {!isLoading && (
                        <Button
                            variant="ghost"
                            size="sm"
                            type="button"
                            className="text-muted-foreground"
                            onClick={prevStep}
                        >
                            <ChevronLeft className="mr-2 size-4" />
                            Back to email
                        </Button>
                    )}
                </div>
            </form>

            <p className="text-[10px] text-center text-muted-foreground uppercase tracking-widest px-8 leading-relaxed">
                By finalizing, you agree to our Terms of Service and Privacy Policy.
            </p>
        </div>
    )
}