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
  type PromptMomentNotification,
} from "@/lib/google-one-tap";

// ---------------------------------------------------------------------------
// Fallback: redirect to standard Google OAuth
// ---------------------------------------------------------------------------

/**
 * Fall back to the Convex Auth redirect-based Google OAuth flow.
 * This always works regardless of browser / One Tap support — it just
 * redirects the entire page to Google's sign-in screen.
 */
async function fallbackToOAuthRedirect(
  signIn: ReturnType<typeof useAuthActions>["signIn"],
  setIsLoading: (v: boolean) => void,
) {
  try {
    await signIn("google", { redirectTo: "/dashboard" });
    // If signIn returns without redirecting the page (e.g. already signed in)
    // clear the loading state.  In the normal case the browser navigates away
    // before this line executes.
    setIsLoading(false);
  } catch (error) {
    console.error("[GoogleOneTap] OAuth redirect failed:", error);
    setIsLoading(false);
  }
}

// ---------------------------------------------------------------------------
// Provider — loads GIS, initialises One Tap, handles credential callbacks
// ---------------------------------------------------------------------------

/**
 * Mount this provider high in the tree (inside <ConvexClientProvider>).
 *
 * It:
 *  1. Loads the Google Identity Services script on auth pages
 *  2. Calls initialize() with FedCM + ITP support enabled
 *  3. Shows the One Tap auto-prompt after a short delay
 *  4. Dispatches the credential to the ConvexCredentials "google-onetap" provider
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
  const autoPromptTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isAuthPage =
    pathname.startsWith("/sign-in") ||
    pathname.startsWith("/sign-up") ||
    pathname.startsWith("/forgot-password");

  // ── Credential callback ──────────────────────────────────────────────
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
        console.error("[GoogleOneTap] Sign-in failed:", error);
      }
    },
    [signIn, router, isAuthenticated, needsOnboarding],
  );

  const handleCredentialRef = useRef(handleCredential);
  handleCredentialRef.current = handleCredential;

  // ── Auto-prompt on auth pages ────────────────────────────────────────
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

        initializeGoogleOneTap(
          GOOGLE_CLIENT_ID,
          (response) => {
            handleCredentialRef.current(response);
          },
          {
            autoSelect: true,
            cancelOnTapOutside: false,
            context: pathname.startsWith("/sign-up") ? "signup" : "signin",
            fedcmForPrompt: true,
          },
        );

        // Show the One Tap / FedCM prompt after a short delay so the page
        // has time to settle.  1000 ms is fast enough for mobile users while
        // still avoiding competition with the page's own layout paint.
        autoPromptTimerRef.current = setTimeout(() => {
          if (cancelled) return;

          promptGoogleOneTap((moment) => {
            handleAutoPromptMoment(moment);
          });
        }, 1000);
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
    // We intentionally only re-run when auth state or page changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthPage, isAuthenticated]);

  return <>{children}</>;
}

// ---------------------------------------------------------------------------
// Moment handlers (shared logic for auto-prompt & manual trigger)
// ---------------------------------------------------------------------------

/**
 * Handle moment notifications from the auto-prompt.
 *
 * We do NOT auto-redirect when the prompt can't display — that would be
 * jarring UX.  Instead we just log the reason so developers can debug.
 * The user can still click "Continue with Google" which has a proper
 * fallback to OAuth redirect.
 */
function handleAutoPromptMoment(moment: PromptMomentNotification) {
  if (safeMomentCheck(moment, "isSkippedMoment")) {
    // In FedCM mode this is the primary "can't show" signal.
    // Possible reasons (non-FedCM): auto_cancel, user_cancel, tap_outside,
    // issuing_failed.  In FedCM mode getSkippedReason() returns null.
    console.debug(
      "[GoogleOneTap] Auto-prompt skipped.",
      moment.getSkippedReason?.() ?? "(FedCM — no reason available)",
    );
    return;
  }

  if (safeMomentCheck(moment, "isNotDisplayed")) {
    // Only fires on non-FedCM browsers (Safari, Firefox with itp_support).
    // On FedCM browsers this method doesn't exist.
    console.debug(
      "[GoogleOneTap] Auto-prompt not displayed:",
      moment.getNotDisplayedReason?.(),
    );
    return;
  }

  if (safeMomentCheck(moment, "isDismissedMoment")) {
    console.debug(
      "[GoogleOneTap] Auto-prompt dismissed:",
      moment.getDismissedReason?.(),
    );
    return;
  }

  // Unknown moment type — log for debugging
  console.debug("[GoogleOneTap] Auto-prompt moment:", moment.getMomentType?.());
}

// ---------------------------------------------------------------------------
// Hook — used by sign-in / sign-up buttons
// ---------------------------------------------------------------------------

/**
 * Hook that exposes `triggerGoogleSignIn` and `isLoading`.
 *
 * Priority:
 *  1. Try Google One Tap / FedCM prompt (stays on the same page)
 *  2. If the prompt can't display → immediately redirect to Google OAuth
 *  3. If the prompt callback never fires (some mobile browsers) → redirect
 *     after a 5 s safety timeout
 */
export function useGoogleOneTap() {
  const [isLoading, setIsLoading] = useState(false);
  const { signIn } = useAuthActions();
  const router = useRouter();
  const { isAuthenticated, needsOnboarding } = useUserStore();

  const triggerGoogleSignIn = useCallback(async () => {
    setIsLoading(true);

    try {
      // ── GIS already loaded → try One Tap ────────────────────────────
      if (window.google?.accounts?.id) {
        await attemptOneTapOrFallback(signIn, setIsLoading);
        return;
      }

      // ── GIS not yet loaded → try loading it ─────────────────────────
      try {
        await loadGoogleIdentityServices();

        if (window.google?.accounts?.id) {
          // Re-initialise with our callback so the credential is captured
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
                console.error("[GoogleOneTap] Sign-in failed:", error);
              } finally {
                setIsLoading(false);
              }
            },
            { autoSelect: true, context: "signin", fedcmForPrompt: true },
          );

          await attemptOneTapOrFallback(signIn, setIsLoading);
        } else {
          // GIS loaded but accounts.id unavailable — fall back to OAuth
          await fallbackToOAuthRedirect(signIn, setIsLoading);
        }
      } catch {
        // GIS failed to load — fall back to OAuth
        await fallbackToOAuthRedirect(signIn, setIsLoading);
      }
    } catch (error) {
      console.error("[GoogleOneTap] Sign-in error:", error);
      setIsLoading(false);
    }
  }, [signIn, router, isAuthenticated, needsOnboarding]);

  return { triggerGoogleSignIn, isLoading };
}

// ---------------------------------------------------------------------------
// Core logic: try One Tap, fall back to OAuth redirect
// ---------------------------------------------------------------------------

/**
 * Call google.accounts.id.prompt() and wait for the moment listener.
 *
 * Decision tree:
 *  - isSkippedMoment   → One Tap/FedCM can't show → OAuth redirect NOW
 *  - isNotDisplayed    → Non-FedCM browser can't show → OAuth redirect NOW
 *  - isDismissedMoment("credential_returned") → success, keep loading
 *  - isDismissedMoment(other) → user dismissed → OAuth redirect (user
 *    may have accidentally dismissed on mobile, so we offer the full flow)
 *  - callback never fires within SAFETY_TIMEOUT_MS → OAuth redirect
 */
const SAFETY_TIMEOUT_MS = 5_000;

async function attemptOneTapOrFallback(
  signIn: ReturnType<typeof useAuthActions>["signIn"],
  setIsLoading: (v: boolean) => void,
): Promise<void> {
  let resolved = false;

  const clearSafetyTimeout = scheduleSafetyFallback(signIn, setIsLoading, () => resolved);

  try {
    promptGoogleOneTap((moment) => {
      if (resolved) return; // Safety timeout already kicked in
      resolved = true;
      clearSafetyTimeout();

      handleManualPromptMoment(moment, signIn, setIsLoading);
    });
  } catch (error) {
    // prompt() threw — e.g. called before initialise, or GIS bug
    console.error("[GoogleOneTap] prompt() threw:", error);
    resolved = true;
    clearSafetyTimeout();
    await fallbackToOAuthRedirect(signIn, setIsLoading);
  }
}

/**
 * If the moment listener never fires (broken mobile browser, etc.),
 * automatically redirect to Google OAuth after SAFETY_TIMEOUT_MS.
 */
function scheduleSafetyFallback(
  signIn: ReturnType<typeof useAuthActions>["signIn"],
  setIsLoading: (v: boolean) => void,
  getResolved: () => boolean,
): () => void {
  const timer = setTimeout(() => {
    if (!getResolved()) {
      console.debug("[GoogleOneTap] Safety timeout — redirecting to OAuth");
      fallbackToOAuthRedirect(signIn, setIsLoading);
    }
  }, SAFETY_TIMEOUT_MS);

  return () => clearTimeout(timer);
}

/**
 * Handle the moment notification from a manually-triggered prompt
 * (i.e. the user clicked "Continue with Google").
 *
 * Unlike the auto-prompt, this ALWAYS falls back to OAuth redirect when
 * One Tap can't display — the user has explicitly asked to sign in.
 */
function handleManualPromptMoment(
  moment: PromptMomentNotification,
  signIn: ReturnType<typeof useAuthActions>["signIn"],
  setIsLoading: (v: boolean) => void,
) {
  // ── Skipped moment: prompt couldn't show ───────────────────────────
  // This is the PRIMARY "can't show" signal on FedCM browsers (Chrome 120+).
  // On non-FedCM browsers, you'd get isNotDisplayed() instead.
  if (safeMomentCheck(moment, "isSkippedMoment")) {
    const reason = moment.getSkippedReason?.();
    console.debug(
      "[GoogleOneTap] Prompt skipped, falling back to OAuth.",
      reason ?? "(FedCM — no reason available)",
    );
    fallbackToOAuthRedirect(signIn, setIsLoading);
    return;
  }

  // ── Not displayed: non-FedCM browser can't show One Tap ────────────
  // On FedCM browsers this method doesn't exist; safeMomentCheck returns false.
  if (safeMomentCheck(moment, "isNotDisplayed")) {
    console.debug(
      "[GoogleOneTap] Prompt not displayed, falling back to OAuth:",
      moment.getNotDisplayedReason?.(),
    );
    fallbackToOAuthRedirect(signIn, setIsLoading);
    return;
  }

  // ── Dismissed: user interacted (credential OR cancel) ──────────────
  if (safeMomentCheck(moment, "isDismissedMoment")) {
    const reason = moment.getDismissedReason?.();
    if (reason === "credential_returned") {
      // Great — the credential callback will handle sign-in.
      // Keep isLoading true until the auth state updates.
      console.debug("[GoogleOneTap] Credential returned — waiting for auth.");
    } else {
      // User dismissed the prompt (clicked X, tapped outside, ESC, etc.)
      // On mobile, dismissals are often accidental (fat-finger) so we
      // fall back to the full OAuth flow rather than leaving the user stuck.
      console.debug("[GoogleOneTap] Prompt dismissed, falling back to OAuth:", reason);
      fallbackToOAuthRedirect(signIn, setIsLoading);
    }
    return;
  }

  // ── Unknown moment type ────────────────────────────────────────────
  // Defensive: if nothing matched, redirect to OAuth so the user isn't stuck.
  console.debug("[GoogleOneTap] Unhandled moment type, falling back to OAuth:", moment.getMomentType?.());
  fallbackToOAuthRedirect(signIn, setIsLoading);
}