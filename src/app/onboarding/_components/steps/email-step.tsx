"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useOnboardingStore } from "@/store/use-onboarding-store"
import { useAuthActions } from "@convex-dev/auth/react"
import { motion } from "motion/react"
import { Mail, ArrowRight, ChevronLeft, Loader2 } from "lucide-react"
import { FcGoogle } from "react-icons/fc"
import { FaXTwitter } from "react-icons/fa6"
import { FaFacebook } from "react-icons/fa"
import { toast } from "sonner"

export function EmailStep() {
    const { email, setEmail, nextStep, prevStep, setAuthMethod, setStep } = useOnboardingStore()
    const { signIn } = useAuthActions()
    const [localEmail, setLocalEmail] = React.useState(email || "")
    const [isGoogleLoading, setIsGoogleLoading] = React.useState(false)
    const [isTwitterLoading, setIsTwitterLoading] = React.useState(false)
    const [isFacebookLoading, setIsFacebookLoading] = React.useState(false)

    const isAnyOAuthLoading = isGoogleLoading || isTwitterLoading || isFacebookLoading

    const handleNext = () => {
        if (localEmail && localEmail.includes("@")) {
            setEmail(localEmail)
            setAuthMethod('email')
            nextStep()
        }
    }

    async function onGoogleSignIn() {
        setIsGoogleLoading(true)
        setAuthMethod('oauth')
        setStep(10)
        try {
            await signIn("google", { redirectTo: "/onboarding" })
        } catch (error) {
            toast.error("Failed to sign in with Google")
            console.error(error)
            setIsGoogleLoading(false)
        }
    }

    async function onFacebookSignIn() {
        setIsFacebookLoading(true)
        setAuthMethod('oauth')
        setStep(10)
        try {
            await signIn("facebook", { redirectTo: "/onboarding" })
        } catch (error) {
            toast.error("Failed to sign in with Facebook")
            console.error(error)
            setIsFacebookLoading(false)
        }
    }

    async function onTwitterSignIn() {
        setIsTwitterLoading(true)
        setAuthMethod('oauth')
        setStep(10)
        try {
            await signIn("twitter", { redirectTo: "/onboarding" })
        } catch (error) {
            toast.error("Failed to sign in with X")
            console.error(error)
            setIsTwitterLoading(false)
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
                        <Mail className="size-6 text-primary" />
                    </div>
                </motion.div>
                <h2 className="text-3xl font-serif">Where should we send your chart?</h2>
                <p className="text-muted-foreground text-sm">
                    Save your progress and receive your personalized natal report.
                </p>
            </div>

            <div className="space-y-4">
                {/* OAuth Buttons */}
                <div className="flex flex-col gap-3">
                    <Button
                        variant="outline"
                        disabled={isAnyOAuthLoading}
                        onClick={onGoogleSignIn}
                        className="font-sans border-primary/20 hover:text-foreground hover:bg-primary/5 hover:border-primary/40 transition-all duration-300 h-11"
                    >
                        {isGoogleLoading ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                            <FcGoogle className="mr-2 h-4 w-4" />
                        )}
                        Continue with Google
                    </Button>

                    <Button
                        variant="outline"
                        disabled={isAnyOAuthLoading}
                        onClick={onFacebookSignIn}
                        className="font-sans border-primary/20 hover:text-foreground hover:bg-primary/5 hover:border-primary/40 transition-all duration-300 h-11"
                    >
                        {isFacebookLoading ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                            <FaFacebook className="mr-2 h-4 w-4 text-[#1877F2]" />
                        )}
                        Continue with Facebook
                    </Button>

                    <Button
                        variant="outline"
                        disabled={isAnyOAuthLoading}
                        onClick={onTwitterSignIn}
                        className="font-sans border-primary/20 hover:text-foreground hover:bg-primary/5 hover:border-primary/40 transition-all duration-300 h-11"
                    >
                        {isTwitterLoading ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                            <FaXTwitter className="mr-2 h-4 w-4" />
                        )}
                        Continue with X
                    </Button>
                </div>

                {/* Divider */}
                <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t border-primary/10" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-background px-2 text-muted-foreground font-sans">
                            Or save with email
                        </span>
                    </div>
                </div>

                {/* Email Input */}
                <div className="space-y-2">
                    <Input
                        type="email"
                        placeholder="your@email.com"
                        value={localEmail}
                        onChange={(e) => setLocalEmail(e.target.value)}
                        className="h-12 bg-background/40 backdrop-blur-md text-lg text-center"
                        onKeyDown={(e) => e.key === "Enter" && handleNext()}
                        disabled={isAnyOAuthLoading}
                    />
                </div>

                <div className="flex flex-col gap-3 pt-4">
                    <Button
                        size="lg"
                        className="h-14 text-lg w-full group"
                        onClick={handleNext}
                        disabled={!localEmail || !localEmail.includes("@") || isAnyOAuthLoading}
                    >
                        Continue
                        <ArrowRight className="ml-2 size-5 transition-transform group-hover:translate-x-1" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        className="text-muted-foreground"
                        onClick={prevStep}
                    >
                        <ChevronLeft className="mr-2 size-4" />
                        Back to chart
                    </Button>
                </div>
            </div>

            <p className="text-[10px] text-center text-muted-foreground uppercase tracking-widest px-8 leading-relaxed">
                By continuing, you agree to receive cosmic updates.
            </p>
        </div>
    )
}
