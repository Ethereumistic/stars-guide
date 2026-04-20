/**
 * Maps raw Convex Auth error messages to user-friendly messages.
 *
 * Known error strings from @convex-dev/auth:
 * - "InvalidSecret" — wrong password
 * - "InvalidAccountId" — no account with that email
 * - "TooManyFailedAttempts" — rate limited
 * - "Invalid credentials" — generic wrong email/password (from Password.ts)
 * - "Invalid password" — password too short on sign-up
 * - "Account <email> already exists" — duplicate email on sign-up
 * - "[Request ID: ...] Server Error ..." — unexpected server errors
 */

export type AuthErrorContext = "signIn" | "signUp";

export function mapAuthError(
  rawError: unknown,
  context: AuthErrorContext,
): string {
  const message =
    rawError instanceof Error ? rawError.message : String(rawError);

  // Strip Convex request ID prefix if present: "[Request ID: xyz] Server Error ..."
  const cleaned = message
    .replace(/^\[Request ID: [^\]]+\]\s*Server Error\s*/i, "")
    .trim();

  // Direct matches from Convex Auth internals
  if (cleaned === "InvalidSecret") {
    return "The password you entered is incorrect. Please try again.";
  }

  if (cleaned === "InvalidAccountId") {
    return "No account found with that email. Would you like to sign up instead?";
  }

  if (cleaned === "Invalid credentials") {
    return "The email or password you entered is incorrect.";
  }

  if (cleaned === "TooManyFailedAttempts") {
    return "Too many failed attempts. Please wait a moment and try again.";
  }

  if (cleaned === "Invalid password") {
    return "Password must be at least 8 characters long.";
  }

  // "Account <email> already exists"
  if (/^Account\s+.+\s+already exists$/i.test(cleaned)) {
    return "An account with this email already exists. Try signing in instead.";
  }

  // Catch-all for unexpected errors with context-aware fallback
  if (context === "signIn") {
    return "Unable to sign in. Please check your email and password and try again.";
  }

  return "Unable to create your account. Please check your details and try again.";
}
