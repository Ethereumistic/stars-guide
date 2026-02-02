"use client"

import * as React from "react"
import Link from "next/link"
import { useAuthActions } from "@convex-dev/auth/react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "sonner"
import { Loader2, Mail, ArrowLeft } from "lucide-react"

export default function ForgotPasswordPage() {
    const { signIn } = useAuthActions()
    const [isLoading, setIsLoading] = React.useState(false)
    const [isSubmitted, setIsSubmitted] = React.useState(false)

    async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault()
        setIsLoading(true)

        // 1. Capture the form element
        const form = event.currentTarget
        const formData = new FormData(form)
        const email = formData.get("email") as string

        try {
            // 2. BLUR active element to prevent unsaved changes alerts
            if (document.activeElement instanceof HTMLElement) {
                document.activeElement.blur()
            }

            // 3. Actually trigger the Convex reset flow
            // Note: Ensure your Convex Auth config has a password provider with "reset" flow enabled
            await signIn("password", { email, flow: "reset" })

            // 4. Reset the form
            form.reset()

            // 5. Update UI state to show success message
            setIsSubmitted(true)
            toast.success("Reset link sent to your email")

        } catch (error) {
            toast.error("Could not send reset link. Please try again.")
            console.error(error)
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <Card className="border-primary/20 bg-background/60 backdrop-blur-xl shadow-2xl shadow-primary/10">
            <CardHeader className="space-y-2 text-center">
                <CardTitle className="font-serif text-3xl tracking-tight text-foreground">
                    Reset Password
                </CardTitle>
                <CardDescription className="font-sans italic text-muted-foreground">
                    We'll send you a link to recover your access
                </CardDescription>
            </CardHeader>
            <CardContent>
                {!isSubmitted ? (
                    <form onSubmit={onSubmit} className="grid gap-4">
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
                            Send Reset Link
                        </Button>
                    </form>
                ) : (
                    <div className="text-center space-y-4 py-4">
                        <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                            <Mail className="h-6 w-6 text-primary" />
                        </div>
                        <div className="space-y-2">
                            <p className="font-sans text-foreground">Check your inbox</p>
                            <p className="font-sans text-sm text-muted-foreground italic">
                                We've sent a password reset link to your email address.
                            </p>
                        </div>
                        <Button
                            variant="outline"
                            className="mt-4 border-primary/20"
                            onClick={() => setIsSubmitted(false)}
                        >
                            Try another email
                        </Button>
                    </div>
                )}
            </CardContent>
            <CardFooter className="flex items-center justify-center">
                <Link
                    href="/sign-in"
                    className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors font-sans italic"
                >
                    <ArrowLeft className="h-4 w-4" />
                    Back to Sign In
                </Link>
            </CardFooter>
        </Card>
    )
}
