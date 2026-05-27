"use client"

import * as React from "react"
import Link from "next/link"
import { useAuthActions } from "@convex-dev/auth/react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "sonner"
import { Loader2, Mail, Lock, ArrowLeft, KeyRound } from "lucide-react"

type Step = "email" | "code" | "done"

export default function ForgotPasswordPage() {
    const { signIn } = useAuthActions()
    const [isLoading, setIsLoading] = React.useState(false)
    const [step, setStep] = React.useState<Step>("email")
    const [email, setEmail] = React.useState("")
    const [code, setCode] = React.useState("")
    const [newPassword, setNewPassword] = React.useState("")
    const [confirmPassword, setConfirmPassword] = React.useState("")
    const [error, setError] = React.useState<string | null>(null)

    // Step 1: Send reset OTP to email
    async function handleSendReset(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault()
        setIsLoading(true)
        setError(null)

        const form = event.currentTarget
        const formData = new FormData(form)
        const emailValue = formData.get("email") as string

        try {
            if (document.activeElement instanceof HTMLElement) {
                document.activeElement.blur()
            }

            await signIn("password", { email: emailValue, flow: "reset" })
            setEmail(emailValue)
            setStep("code")
            toast.success("Reset code sent to your email")
        } catch (error) {
            toast.error("Could not send reset code. Please try again.")
            console.error(error)
        } finally {
            setIsLoading(false)
        }
    }

    // Step 2: Verify code + set new password
    async function handleResetVerification(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault()
        setIsLoading(true)
        setError(null)

        if (newPassword !== confirmPassword) {
            setError("Passwords do not match")
            setIsLoading(false)
            return
        }

        if (newPassword.length < 8) {
            setError("Password must be at least 8 characters")
            setIsLoading(false)
            return
        }

        try {
            await signIn("password", {
                email,
                flow: "reset-verification",
                code,
                newPassword,
            })
            setStep("done")
            toast.success("Password reset successfully!")
        } catch (error: unknown) {
            console.error("Reset verification error:", error)
            setError(error instanceof Error ? error.message : "Invalid or expired code. Please try again.")
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="min-h-[calc(100vh-5rem)] flex items-center justify-center px-4 py-12">
            <div className="w-full max-w-md">
                <Card className="border-primary/10 bg-background/60 backdrop-blur-xl shadow-2xl shadow-primary/10">
                    <CardHeader className="space-y-2 text-center">
                        <CardTitle className="font-serif text-3xl tracking-tight text-foreground">
                            {step === "done" ? "Password Reset" : "Reset Password"}
                        </CardTitle>
                        <CardDescription className="font-sans italic text-muted-foreground">
                            {step === "email" && "We'll send you a code to recover your access"}
                            {step === "code" && "Enter the code and set your new password"}
                            {step === "done" && "Your password has been reset successfully"}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {step === "email" && (
                            <form onSubmit={handleSendReset} className="grid gap-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="email" className="font-sans text-sm font-medium ml-1">Email address</Label>
                                    <div className="relative">
                                        <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            id="email"
                                            name="email"
                                            type="email"
                                            placeholder="name@example.com"
                                            required
                                            disabled={isLoading}
                                            className="pl-10 border-primary/10 focus-visible:ring-primary/30"
                                        />
                                    </div>
                                </div>
                                <Button
                                    type="submit"
                                    disabled={isLoading}
                                    className="w-full font-serif uppercase tracking-widest mt-2 h-11 shadow-lg shadow-primary/10"
                                >
                                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Send Reset Code
                                </Button>
                            </form>
                        )}

                        {step === "code" && (
                            <form onSubmit={handleResetVerification} className="grid gap-4">
                                <div className="text-center space-y-2 mb-2">
                                    <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                                        <KeyRound className="h-6 w-6 text-primary" />
                                    </div>
                                    <p className="font-sans text-sm text-muted-foreground">
                                        We sent a code to <span className="text-foreground font-medium">{email}</span>
                                    </p>
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="code" className="font-sans text-sm font-medium ml-1">Verification code</Label>
                                    <Input
                                        id="code"
                                        type="text"
                                        inputMode="numeric"
                                        placeholder="000000"
                                        required
                                        value={code}
                                        onChange={(e) => setCode(e.target.value)}
                                        disabled={isLoading}
                                        className="text-center text-2xl tracking-[0.5em] font-mono h-14 border-primary/10 focus-visible:ring-primary/30"
                                        maxLength={6}
                                        autoFocus
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="newPassword" className="font-sans text-sm font-medium ml-1">New password</Label>
                                    <div className="relative">
                                        <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            id="newPassword"
                                            type="password"
                                            placeholder="Min 8 characters"
                                            required
                                            value={newPassword}
                                            onChange={(e) => setNewPassword(e.target.value)}
                                            disabled={isLoading}
                                            className="pl-10 border-primary/10 focus-visible:ring-primary/30"
                                        />
                                    </div>
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="confirmPassword" className="font-sans text-sm font-medium ml-1">Confirm new password</Label>
                                    <div className="relative">
                                        <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            id="confirmPassword"
                                            type="password"
                                            placeholder="Re-enter your password"
                                            required
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            disabled={isLoading}
                                            className="pl-10 border-primary/10 focus-visible:ring-primary/30"
                                        />
                                    </div>
                                </div>
                                {error && (
                                    <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm text-center">
                                        {error}
                                    </div>
                                )}
                                <Button
                                    type="submit"
                                    disabled={isLoading || code.length < 6}
                                    className="w-full font-serif uppercase tracking-widest mt-2 h-11 shadow-lg shadow-primary/10"
                                >
                                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Reset Password
                                </Button>
                                <button
                                    type="button"
                                    className="text-xs text-muted-foreground hover:text-primary transition-colors font-sans"
                                    onClick={() => { setStep("email"); setCode(""); setError(null) }}
                                >
                                    ← Send code to a different email
                                </button>
                            </form>
                        )}

                        {step === "done" && (
                            <div className="text-center space-y-4 py-4">
                                <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                                    <Mail className="h-6 w-6 text-primary" />
                                </div>
                                <div className="space-y-2">
                                    <p className="font-sans text-foreground">All done!</p>
                                    <p className="font-sans text-sm text-muted-foreground italic">
                                        Your password has been reset. You can now sign in with your new password.
                                    </p>
                                </div>
                                <Button asChild className="mt-4 w-full font-serif uppercase tracking-widest h-11 shadow-lg shadow-primary/10">
                                    <Link href="/sign-in">Sign In</Link>
                                </Button>
                            </div>
                        )}
                    </CardContent>
                    {step !== "done" && (
                        <CardFooter className="flex items-center justify-center">
                            <Link
                                href="/sign-in"
                                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors font-sans italic"
                            >
                                <ArrowLeft className="h-4 w-4" />
                                Back to Sign In
                            </Link>
                        </CardFooter>
                    )}
                </Card>
            </div>
        </div>
    )
}
