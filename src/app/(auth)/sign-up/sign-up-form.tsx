'use client'

import { cn } from "@/lib/utils"
import { useAuthActions } from "@convex-dev/auth/react"
import { Button } from "@/components/ui/button"
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState, useEffect } from "react"
import { toast } from "sonner"
import { motion } from "motion/react"
import { Mail, Lock, Loader2 } from "lucide-react"
import { FcGoogle } from "react-icons/fc";
import { FaXTwitter } from "react-icons/fa6";
import { FaFacebook } from "react-icons/fa";
import { useUserStore } from "@/store/use-user-store";
import { useOnboardingStore } from "@/store/use-onboarding-store";

interface SignUpFormProps extends Omit<React.ComponentPropsWithoutRef<'div'>, 'title'> {
    title?: React.ReactNode;
    subtitle?: React.ReactNode;
}

export function SignUpForm({ className, title, subtitle, ...props }: SignUpFormProps) {
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [error, setError] = useState<string | null>(null)
    const [isLoading, setIsLoading] = useState(false)
    const [isGoogleLoading, setIsGoogleLoading] = useState(false)
    const [isTwitterLoading, setIsTwitterLoading] = useState(false)
    const [isFacebookLoading, setIsFacebookLoading] = useState(false)
    const router = useRouter()
    const { signIn } = useAuthActions()

    const { isAuthenticated, isLoading: isAuthLoading, needsOnboarding } = useUserStore()

    // Redirect if already authenticated
    useEffect(() => {
        if (isAuthenticated() && !isAuthLoading) {
            router.push(needsOnboarding() ? "/onboarding" : "/dashboard")
        }
    }, [isAuthenticated, isAuthLoading, needsOnboarding, router])

    const handleSignUp = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsLoading(true)
        setError(null)

        try {
            await signIn("password", {
                email,
                password,
                flow: "signUp",
            })

            router.push("/onboarding")
        } catch (error: unknown) {
            console.error("Sign up error:", error)
            const errorMessage = error instanceof Error ? error.message : "Failed to create account. Please try again."
            setError(errorMessage)
        } finally {
            setIsLoading(false)
        }
    }

    async function onGoogleSignIn() {
        setIsGoogleLoading(true)
        try {
            await signIn("google", { redirectTo: "/onboarding" })
        } catch (error) {
            toast.error("Failed to sign in with Google")
            console.error(error)
            setIsGoogleLoading(false)
        }
    }

    async function onTwitterSignIn() {
        setIsTwitterLoading(true)
        try {
            await signIn("twitter", { redirectTo: "/onboarding" })
        } catch (error) {
            toast.error("Failed to sign in with X")
            console.error(error)
            setIsTwitterLoading(false)
        }
    }

    async function onFacebookSignIn() {
        setIsFacebookLoading(true)
        try {
            await signIn("facebook", { redirectTo: "/onboarding" })
        } catch (error) {
            toast.error("Failed to sign in with Facebook")
            console.error(error)
            setIsFacebookLoading(false)
        }
    }

    return (
        <div className={cn('flex flex-col gap-6', className)} {...props}>
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.2 }}
            >
                <Card className="border-primary/20 bg-background/60 backdrop-blur-xl shadow-2xl shadow-primary/10">
                    <CardHeader className="space-y-2 text-center">
                        <CardTitle className="font-serif text-3xl tracking-tight text-foreground">
                            {title || "Create Account"}
                        </CardTitle>
                        <CardDescription className="font-sans italic text-muted-foreground w-full">
                            {subtitle || "Begin your mapping of the heavens"}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-6">
                        <div className="flex flex-col gap-4">
                            <Button
                                variant="outline"
                                disabled={isGoogleLoading || isTwitterLoading || isFacebookLoading || isLoading}
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
                                disabled={isGoogleLoading || isTwitterLoading || isFacebookLoading || isLoading}
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
                                disabled={isGoogleLoading || isTwitterLoading || isFacebookLoading || isLoading}
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

                        <form onSubmit={handleSignUp}>
                            <div className="flex flex-col gap-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="email" className="font-sans text-sm font-medium ml-1">Email</Label>
                                    <div className="relative">
                                        <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            id="email"
                                            type="email"
                                            placeholder="name@example.com"
                                            required
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            disabled={isLoading || isGoogleLoading || isTwitterLoading || isFacebookLoading}
                                            className="pl-10 border-primary/10 focus-visible:ring-primary/30"
                                        />
                                    </div>
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="password" className="font-sans text-sm font-medium ml-1">Password</Label>
                                    <div className="relative">
                                        <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            id="password"
                                            type="password"
                                            required
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            disabled={isLoading || isGoogleLoading || isTwitterLoading || isFacebookLoading}
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
                                    disabled={isLoading || isGoogleLoading || isTwitterLoading || isFacebookLoading}
                                    className="w-full font-serif uppercase tracking-widest mt-2 h-11 shadow-lg shadow-primary/10"
                                >
                                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Create Account
                                </Button>
                            </div>
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
                </Card>
            </motion.div>
        </div>
    )
}
