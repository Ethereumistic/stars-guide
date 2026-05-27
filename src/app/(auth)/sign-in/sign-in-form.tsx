"use client";

import { cn } from "@/lib/utils";
import { useAuthActions } from "@convex-dev/auth/react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { motion } from "motion/react";
import { Mail, Lock, Loader2 } from "lucide-react";
import { mapAuthError } from "@/lib/auth-errors";
import { FcGoogle } from "react-icons/fc";
import { FaXTwitter } from "react-icons/fa6";
import { FaFacebook } from "react-icons/fa";
import { useUserStore } from "@/store/use-user-store";
import { useGoogleOneTap } from "@/components/providers/google-one-tap-provider";

interface SignInFormProps extends React.ComponentPropsWithoutRef<"div"> {
  bare?: boolean;
}

export function SignInForm({ bare, className, ...props }: SignInFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const { triggerGoogleSignIn, isLoading: isGoogleOneTapLoading } =
    useGoogleOneTap();
  const [isTwitterLoading, setIsTwitterLoading] = useState(false);
  const [isFacebookLoading, setIsFacebookLoading] = useState(false);
  const [verificationStep, setVerificationStep] = useState<false | { email: string }>(false);
  const [otpCode, setOtpCode] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const router = useRouter();
  const { signIn } = useAuthActions();

  const {
    isAuthenticated,
    isLoading: isAuthLoading,
    needsOnboarding,
  } = useUserStore();

  useEffect(() => {
    if (isAuthenticated() && !isAuthLoading) {
      router.push(needsOnboarding() ? "/onboarding" : "/dashboard");
    }
  }, [isAuthenticated, isAuthLoading, needsOnboarding, router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const result = await signIn("password", { email, password, flow: "signIn" });
      if (!result.signingIn) {
        // Email verification required — show OTP step
        setVerificationStep({ email });
      } else {
        router.push("/dashboard");
      }
    } catch (error: unknown) {
      console.error("Login error:", error);
      setError(mapAuthError(error, "signIn"));
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verificationStep) return;
    setIsVerifying(true);
    setError(null);

    try {
      await signIn("password", {
        email: verificationStep.email,
        flow: "email-verification",
        code: otpCode,
      });
      router.push("/dashboard");
    } catch (error: unknown) {
      console.error("Verification error:", error);
      setError(mapAuthError(error, "signIn"));
    } finally {
      setIsVerifying(false);
    }
  };

  async function onGoogleSignIn() {
    setIsGoogleLoading(true);
    try {
      await triggerGoogleSignIn();
    } catch (error) {
      if (error instanceof Error && error.message !== "popup_closed") {
        toast.error("Failed to sign in with Google");
      }
    } finally {
      setTimeout(() => setIsGoogleLoading(false), 8000);
    }
  }

  async function onTwitterSignIn() {
    setIsTwitterLoading(true);
    try {
      await signIn("twitter", { redirectTo: "/dashboard" });
    } catch (error) {
      toast.error("Failed to sign in with X");
      setIsTwitterLoading(false);
    }
  }

  async function onFacebookSignIn() {
    setIsFacebookLoading(true);
    try {
      await signIn("facebook", { redirectTo: "/dashboard" });
    } catch (error) {
      toast.error("Failed to sign in with Facebook");
      setIsFacebookLoading(false);
    }
  }

  const anySocialLoading =
    isGoogleLoading || isGoogleOneTapLoading || isTwitterLoading || isFacebookLoading;

  const headerCn = bare
    ? "space-y-2 text-center !px-0"
    : "space-y-2 text-center";
  const contentCn = bare ? "grid gap-6 !px-0" : "grid gap-6";
  const footerCn = bare
    ? "flex flex-wrap items-center justify-center gap-1 text-sm text-muted-foreground !px-0"
    : "flex flex-wrap items-center justify-center gap-1 text-sm text-muted-foreground";

  const inner = (
    <>
      <CardHeader className={headerCn}>
        <CardTitle className="font-serif text-3xl tracking-tight text-foreground">
          Welcome Back
        </CardTitle>
        <CardDescription className="font-sans italic text-muted-foreground">
          Continue your cosmic journey
        </CardDescription>
      </CardHeader>
      <CardContent className={contentCn}>
        <div className="flex flex-row justify-center gap-4 lg:flex-col lg:gap-4">
          <Button
            variant="outline"
            size="icon"
            disabled={anySocialLoading || isLoading}
            onClick={onGoogleSignIn}
            className="size-14 lg:h-11 lg:w-full lg:justify-center font-sans border-primary/20 hover:text-foreground hover:bg-primary/5 hover:border-primary/40 transition-all duration-300"
          >
            {isGoogleLoading || isGoogleOneTapLoading ? (
              <Loader2 className="size-6 animate-spin lg:size-4" />
            ) : (
              <FcGoogle className="size-6 lg:size-4" />
            )}
            <span className="hidden lg:inline">Continue with Google</span>
          </Button>
          <Button
            variant="outline"
            size="icon"
            disabled={anySocialLoading || isLoading}
            onClick={onFacebookSignIn}
            className="size-14 lg:h-11 lg:w-full lg:justify-center font-sans border-primary/20 hover:text-foreground hover:bg-primary/5 hover:border-primary/40 transition-all duration-300"
          >
            {isFacebookLoading ? (
              <Loader2 className="size-6 animate-spin lg:size-4" />
            ) : (
              <FaFacebook className="size-6 text-[#1877F2] lg:size-4" />
            )}
            <span className="hidden lg:inline">Continue with Facebook</span>
          </Button>
          <Button
            variant="outline"
            size="icon"
            disabled={anySocialLoading || isLoading}
            onClick={onTwitterSignIn}
            className="size-14 lg:h-11 lg:w-full lg:justify-center font-sans border-primary/20 hover:text-foreground hover:bg-primary/5 hover:border-primary/40 transition-all duration-300"
          >
            {isTwitterLoading ? (
              <Loader2 className="size-6 animate-spin lg:size-4" />
            ) : (
              <FaXTwitter className="size-6 lg:size-4" />
            )}
            <span className="hidden lg:inline">Continue with X</span>
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

        {verificationStep ? (
          <form onSubmit={handleVerifyOtp}>
            <div className="flex flex-col gap-4">
              <div className="text-center space-y-2 mb-2">
                <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <Mail className="h-6 w-6 text-primary" />
                </div>
                <p className="font-sans text-sm text-muted-foreground">
                  We sent a verification code to <span className="text-foreground font-medium">{verificationStep.email}</span>
                </p>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="otp" className="font-sans text-sm font-medium ml-1">Verification code</Label>
                <Input
                  id="otp"
                  type="text"
                  inputMode="numeric"
                  placeholder="000000"
                  required
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value)}
                  disabled={isVerifying}
                  className="text-center text-2xl tracking-[0.5em] font-mono h-14 border-primary/10 focus-visible:ring-primary/30"
                  maxLength={6}
                  autoFocus
                />
              </div>
              {error && (
                <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm text-center">
                  {error}
                </div>
              )}
              <Button
                type="submit"
                disabled={isVerifying || otpCode.length < 6}
                className="w-full font-serif uppercase tracking-widest mt-2 h-11 shadow-lg shadow-primary/10"
              >
                {isVerifying && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Verify & Sign In
              </Button>
              <button
                type="button"
                className="text-xs text-muted-foreground hover:text-primary transition-colors font-sans"
                onClick={() => { setVerificationStep(false); setOtpCode(""); setError(null); }}
              >
                ← Back to sign in
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleLogin}>
            <div className="flex flex-col gap-4">
              <div className="grid gap-2">
                <Label
                  htmlFor="email"
                  className="font-sans text-sm font-medium ml-1"
                >
                  Email
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="name@example.com"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isLoading || anySocialLoading}
                    className="pl-10 border-primary/10 focus-visible:ring-primary/30"
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <div className="flex items-center justify-between ml-1">
                  <Label
                    htmlFor="password"
                    className="font-sans text-sm font-medium"
                  >
                    Password
                  </Label>
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
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isLoading || anySocialLoading}
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
                disabled={isLoading || anySocialLoading}
                className="w-full font-serif uppercase tracking-widest mt-2 h-11 shadow-lg shadow-primary/10"
              >
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{" "}
                Sign In
              </Button>
            </div>
          </form>
        )}
      </CardContent>
      <CardFooter className={footerCn}>
        <span className="font-sans">Don&apos;t have an account?</span>
        <Link
          href="/sign-up"
          className="text-primary hover:underline font-medium italic"
        >
          Create an account
        </Link>
      </CardFooter>
    </>
  );

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      {bare ? (
        inner
      ) : (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.2 }}
        >
          <Card className="border-primary/10 bg-background/60 backdrop-blur-xl shadow-2xl shadow-primary/10">
            {inner}
          </Card>
        </motion.div>
      )}
    </div>
  );
}