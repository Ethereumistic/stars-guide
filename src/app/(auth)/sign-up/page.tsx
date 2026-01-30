"use client"

import * as React from "react"
import Link from "next/link"
import { useAuthActions } from "@convex-dev/auth/react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { FaGoogle } from "react-icons/fa"
import { toast } from "sonner"
import { Loader2, Mail, Lock } from "lucide-react"
import { useRouter } from "next/navigation"

export default function SignUpPage() {
    const { signIn } = useAuthActions()
    const router = useRouter()
    const [isLoading, setIsLoading] = React.useState(false)
    const [isGoogleLoading, setIsGoogleLoading] = React.useState(false)

    async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault()
        setIsLoading(true)

        // 1. Capture form reference
        const form = event.currentTarget
        const formData = new FormData(form)
        const email = formData.get("email") as string
        const password = formData.get("password") as string

        try {
            await signIn("password", { email, password, flow: "signUp" })

            // 2. CLEAR the form to prevent "Leave site?" alerts
            form.reset()

            toast.success("Welcome aboard, seeker")

            // 3. Use 'replace' so they can't go back to the registration page
            router.replace("/dashboard")

        } catch (error) {
            toast.error("Failed to create account. Please try again.")
            console.error(error)
        } finally {
            setIsLoading(false)
        }
    }
    async function onGoogleSignIn() {
        setIsGoogleLoading(true)
        try {
            await signIn("google")
            router.push("/dashboard")
        } catch (error) {
            toast.error("Failed to sign in with Google")
            console.error(error)
            setIsGoogleLoading(false)
        }
    }

    return (
        <Card className="border-primary/20 bg-background/60 backdrop-blur-xl shadow-2xl shadow-primary/10">
            <CardHeader className="space-y-2 text-center">
                <CardTitle className="font-serif text-3xl tracking-tight text-foreground">
                    Create Account
                </CardTitle>
                <CardDescription className="font-sans italic text-muted-foreground">
                    Begin your mapping of the heavens
                </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-6">
                <div className="grid grid-cols-1 gap-4">
                    <Button
                        variant="outline"
                        disabled={isGoogleLoading || isLoading}
                        onClick={onGoogleSignIn}
                        className="font-sans border-primary/20 hover:bg-primary/5 hover:border-primary/40 transition-all duration-300 h-11"
                    >
                        {isGoogleLoading ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                            <FaGoogle className="mr-2 h-4 w-4 text-[#4285F4]" />
                        )}
                        Sign up with Google
                    </Button>
                </div>

                <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t border-primary/10" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-background px-2 text-muted-foreground font-sans">
                            Or register with
                        </span>
                    </div>
                </div>

                <form onSubmit={onSubmit} className="grid gap-4">
                    <div className="grid gap-2">
                        <Label htmlFor="email" className="font-sans text-sm font-medium ml-1">Email</Label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                            <Input
                                id="email"
                                name="email"
                                type="email"
                                placeholder="name@example.com"
                                required
                                disabled={isLoading || isGoogleLoading}
                                className="pl-10 border-primary/10 focus-visible:ring-primary/30"
                            />
                        </div>
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="password" title="Password" className="font-sans text-sm font-medium ml-1">Password</Label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                            <Input
                                id="password"
                                name="password"
                                type="password"
                                required
                                disabled={isLoading || isGoogleLoading}
                                className="pl-10 border-primary/10 focus-visible:ring-primary/30"
                            />
                        </div>
                    </div>
                    <Button
                        type="submit"
                        disabled={isLoading || isGoogleLoading}
                        className="w-full font-serif uppercase tracking-widest mt-2 h-11 shadow-lg shadow-primary/10"
                    >
                        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Create Account
                    </Button>
                </form>
            </CardContent>
            <CardFooter className="flex flex-wrap items-center justify-center gap-1 text-sm text-muted-foreground">
                <span className="font-sans">Already have an account?</span>
                <Link
                    href="/sign-in"
                    className="text-primary hover:underline font-medium italic"
                >
                    Sign in
                </Link>
            </CardFooter>
        </Card >
    )
}
