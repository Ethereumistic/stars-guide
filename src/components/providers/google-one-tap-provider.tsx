"use client";

import {
  useEffect,
  useCallback,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useAuthActions } from "@convex-dev/auth/react";
import { useRouter } from "next/navigation";
import { useUserStore } from "@/store/use-user-store";
import { usePathname } from "next/navigation";
import {
  GOOGLE_CLIENT_ID,
  loadGoogleIdentityServices,
  initializeGoogleOneTap,
  promptGoogleOneTap,
  cancelGoogleOneTap,
  safeMomentCheck,
  type CredentialResponse,
} from "@/lib/google-one-tap";

// ── Shared state between Provider and Hook ──────────────────────────────
// When the user clicks "Continue with Google", we set this flag so the
// auto-prompt timer in GoogleOneTapProvider knows to skip its own prompt.

let _manuallyTriggered = false;
function setManuallyTriggered(v: boolean) {
  _manuallyTriggered = v;
}
function isManuallyTriggered() {
  return _manuallyTriggered;
}

/**
 * This component:
 * 1. Loads the Google Identity Services script
 * 2. Initializes One Tap on auth-related pages (sign-in, sign-up)
 * 3. When a Google credential is received (One Tap or popup), calls our
 *    ConvexCredentials "google-onetap" provider — no redirect required
 * 4. Redirects the user to the appropriate page after sign-in
 */
export function GoogleOneTapProvider({
  children,
}: {
  children: ReactNode;
}) {
  const { signIn } = useAuthActions();
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, needsOnboarding } = useUserStore();

  const initialized = useRef(false);
  const pathnameRef = useRef(pathname);
  pathnameRef.current = pathname;
  const autoPromptTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isAuthPage =
    pathname.startsWith("/sign-in") ||
    pathname.startsWith("/sign-up") ||
    pathname.startsWith("/forgot-password");

  const handleCredential = useCallback(
    async (response: CredentialResponse) => {
      if (!response.credential) return;

      try {
        await signIn("google-onetap", {
          credential: response.credential,
        });

        setTimeout(() => {
          if (isAuthenticated()) {
            router.push(needsOnboarding() ? "/onboarding" : "/dashboard");
          }
        }, 300);
      } catch (error) {
        console.error("Google One Tap sign-in failed:", error);
      }
    },
    [signIn, router, isAuthenticated, needsOnboarding],
  );

  const handleCredentialRef = useRef(handleCredential);
  handleCredentialRef.current = handleCredential;

  useEffect(() => {
    if (isAuthenticated()) return;
    if (!isAuthPage) return;
    if (!GOOGLE_CLIENT_ID) return;

    let cancelled = false;

    loadGoogleIdentityServices()
      .then(() => {
        if (cancelled) return;
        if (initialized.current) return;
        initialized.current = true;

        initializeGoogleOneTap(GOOGLE_CLIENT_ID, (response) => {
          handleCredentialRef.current(response);
        }, {
          autoSelect: true,
          cancelOnTapOutside: false,
          context: pathnameRef.current.startsWith("/sign-up")
            ? "signup"
            : "signin",
        });

        // Show the One Tap prompt after a short delay to avoid
        // interfering with the page load
        autoPromptTimerRef.current = setTimeout(() => {
          if (!cancelled && !isManuallyTriggered()) {
            promptGoogleOneTap((moment) => {
              if (safeMomentCheck(moment, "isNotDisplayed")) {
                console.debug("[GoogleOneTap] Auto-prompt not displayed:", moment.getNotDisplayedReason?.());
              } else if (safeMomentCheck(moment, "isSkippedMoment")) {
                console.debug("[GoogleOneTap] Auto-prompt skipped:", moment.getSkippedReason?.());
              } else if (safeMomentCheck(moment, "isDismissedMoment")) {
                console.debug("[GoogleOneTap] Auto-prompt dismissed:", moment.getDismissedReason?.());
              }
            });
          }
        }, 1500);
      })
      .catch((err) => {
        console.debug("[GoogleOneTap] GIS load failed:", err);
      });

    return () => {
      cancelled = true;
      if (autoPromptTimerRef.current) {
        clearTimeout(autoPromptTimerRef.current);
      }
      cancelGoogleOneTap();
    };
  }, [isAuthPage, isAuthenticated]);

  return <>{children}</>;
}

/**
 * Fall back to the original Convex Auth redirect-based Google OAuth flow.
 */
async function fallbackToOAuthRedirect(
  signIn: ReturnType<typeof useAuthActions>["signIn"],
  setIsLoading: (v: boolean) => void,
) {
  try {
    await signIn("google", { redirectTo: "/dashboard" });
    // The redirect happens automatically
  } catch (error) {
    console.error("Google OAuth redirect failed:", error);
    setIsLoading(false);
  }
}

/**
 * Hook that exposes a function to trigger Google sign-in from a button click.
 *
 * Uses Google Identity Services' prompt() so the user stays on the same page
 * (no redirect). Falls back to OAuth redirect if GIS can't show a prompt.
 */
export function useGoogleOneTap() {
  const [isLoading, setIsLoading] = useState(false);
  const { signIn } = useAuthActions();
  const router = useRouter();
  const { isAuthenticated, needsOnboarding } = useUserStore();

  const triggerGoogleSignIn = useCallback(async () => {
    setIsLoading(true);
    // Signal to GoogleOneTapProvider that a manual trigger happened,
    // so it cancels the auto-prompt timer
    setManuallyTriggered(true);

    try {
      // If GIS is loaded, trigger the prompt (shows One Tap card or popup)
      if (window.google?.accounts?.id) {
        promptGoogleOneTap((moment) => {
          // If One Tap can't be displayed, fall back to OAuth redirect
          if (safeMomentCheck(moment, "isNotDisplayed")) {
            console.debug("[GoogleOneTap] Prompt not displayed, falling back to OAuth:", moment.getNotDisplayedReason?.());
            fallbackToOAuthRedirect(signIn, setIsLoading);
            return;
          }
          if (safeMomentCheck(moment, "isSkippedMoment")) {
            console.debug("[GoogleOneTap] Prompt skipped:", moment.getSkippedReason?.());
            setIsLoading(false);
            return;
          }
          if (safeMomentCheck(moment, "isDismissedMoment")) {
            const reason = moment.getDismissedReason?.();
            if (reason === "credential_returned") {
              // The credential callback will handle sign-in
              // Keep isLoading true until the auth state updates
            } else {
              setIsLoading(false);
            }
            return;
          }
        });
        // If the prompt was displayed, the credential callback will handle
        // the rest. Clear loading after a generous timeout.
        setTimeout(() => setIsLoading(false), 10000);
        return;
      }

      // GIS not loaded yet — load it and try again, or fall back
      try {
        await loadGoogleIdentityServices();

        if (window.google?.accounts?.id) {
          initializeGoogleOneTap(
            GOOGLE_CLIENT_ID,
            async (response: CredentialResponse) => {
              if (!response.credential) return;
              setIsLoading(true);
              try {
                await signIn("google-onetap", {
                  credential: response.credential,
                });
                setTimeout(() => {
                  if (isAuthenticated()) {
                    router.push(
                      needsOnboarding() ? "/onboarding" : "/dashboard",
                    );
                  }
                }, 300);
              } catch (error) {
                console.error("Google sign-in failed:", error);
              } finally {
                setIsLoading(false);
              }
            },
            {
              autoSelect: true,
              context: "signin",
            },
          );

          promptGoogleOneTap((moment) => {
            if (safeMomentCheck(moment, "isNotDisplayed")) {
              fallbackToOAuthRedirect(signIn, setIsLoading);
            } else if (safeMomentCheck(moment, "isSkippedMoment")) {
              setIsLoading(false);
            }
          });
        } else {
          await fallbackToOAuthRedirect(signIn, setIsLoading);
        }
      } catch {
        await fallbackToOAuthRedirect(signIn, setIsLoading);
      }
    } catch (error) {
      console.error("Google sign-in error:", error);
      setIsLoading(false);
    }
  }, [signIn, router, isAuthenticated, needsOnboarding]);

  return { triggerGoogleSignIn, isLoading };
}