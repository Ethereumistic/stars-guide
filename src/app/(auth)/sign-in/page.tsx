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

export default function SignInPage() {
    const { signIn } = useAuthActions()
    const [isLoading, setIsLoading] = React.useState(false)
    const [isGoogleLoading, setIsGoogleLoading] = React.useState(false)

    async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault()
        setIsLoading(true)

        const formData = new FormData(event.currentTarget)
        const email = formData.get("email") as string
        const password = formData.get("password") as string

        try {
            await signIn("password", { email, password, flow: "signIn" })
            toast.success("Welcome back to the stars")
        } catch (error) {
            toast.error("Invalid email or password")
            console.error(error)
        } finally {
            setIsLoading(false)
        }
    }

    async function onGoogleSignIn() {
        setIsGoogleLoading(true)
        try {
            await signIn("google")
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
                    Welcome Back
                </CardTitle>
                <CardDescription className="font-sans italic text-muted-foreground">
                    Continue your cosmic journey
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
                        Continue with Google
                    </Button>
                </div>

                <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t border-primary/10" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-background px-2 text-muted-foreground font-sans">
                            Or continue with
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
                        <div className="flex items-center justify-between ml-1">
                            <Label htmlFor="password" title="Password" className="font-sans text-sm font-medium">Password</Label>
                            <Link
                                href="/forgot-password"
                                className="text-xs text-primary hover:underline font-medium italic"
                            >
                                Forgot password?
                            </Link>
                        </div>
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
                        Sign In
                    </Button>
                </form>
            </CardContent>
            <CardFooter className="flex flex-wrap items-center justify-center gap-1 text-sm text-muted-foreground">
                <span className="font-sans">Don't have an account?</span>
                <Link
                    href="/sign-up"
                    className="text-primary hover:underline font-medium italic"
                >
                    Create an account
                </Link>
            </CardFooter>
        </Card >
    )
}
