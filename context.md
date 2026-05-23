# Google One Tap Sign-In: Bug Analysis & Context

## Three Critical Bugs

### Bug 1: `ctx.db` is undefined in ConvexCredentials authorize (CRITICAL)
- **File**: `convex/auth.ts` (lines ~46-130, the `authorize` function)
- **Root Cause**: `authorize` runs in a Convex **action** context (`GenericActionCtxWithAuthConfig`), which does NOT have `ctx.db`. Actions must use `ctx.runQuery`/`ctx.runMutation`.
- **Impact**: Every One Tap sign-in attempt throws `TypeError: Cannot read properties of undefined (reading 'query')`
- **Secondary**: Index name `provider_accountId` is wrong — correct name is `providerAndAccountId`
- **Fix**: Use `retrieveAccount`/`createAccount` from `@convex-dev/auth/server` + custom internal mutation via `ctx.runMutation` for profile patches

### Bug 2: `moment.isNotDisplayedMoment()` is not a function
- **File**: `src/lib/google-one-tap.ts` (type declaration), `src/components/providers/google-one-tap-provider.tsx` (usage)
- **Root Cause**: GIS API has `isNotDisplayed()` (no "Moment" suffix), not `isNotDisplayedMoment()`
- **Impact**: Runtime TypeError crashes the prompt callback silently; fallback logic never executes
- **Fix**: Rename to `isNotDisplayed()` in interface and all call sites; add try/catch for FedCM compatibility

### Bug 3: Clicking "Continue with Google" before 1.5s One Tap delay does nothing
- **File**: `src/components/providers/google-one-tap-provider.tsx`
- **Root Cause**: When prompt can't display, moment listener only logs — never falls back to OAuth redirect
- **Impact**: User sees loading spinner for 5 seconds, then nothing happens
- **Fix**: Call `fallbackToOAuthRedirect()` in moment listener when `isNotDisplayed()` or `isSkippedMoment()`; cancel auto-prompt timer on manual trigger

## Key Architecture Facts
- `authorize` runs in **action context** (no `ctx.db`); `createOrUpdateUser` callback runs in **mutation context** (`ctx.db` IS available there)
- One Tap and OAuth must share `provider: "google"` in `authAccounts` — the ConvexCredentials `id: "google-onetap"` is just the auth method identifier
- `authTables` defines index `providerAndAccountId` on `authAccounts` (not `provider_accountId`)
- GIS `PromptMomentNotification` has: `isDisplayMoment()`, `isDisplayed()`, `isNotDisplayed()`, `getNotDisplayedReason()`, `isSkippedMoment()`, `getSkippedReason()`, `isDismissedMoment()`, `getDismissedReason()`, `getMomentType()`
- FedCM mode doesn't support `isNotDisplayed()`, `isDisplayed()`, `isDisplayMoment()`, or `getNotDisplayedReason()`

## Files Involved
- `convex/auth.ts` — authorize function, createOrUpdateUser callback
- `convex/lib/googleIdToken.ts` — ID token verification (no bugs)
- `src/lib/google-one-tap.ts` — GIS type declarations + utilities
- `src/components/providers/google-one-tap-provider.tsx` — GoogleOneTapProvider + useGoogleOneTap hook
- `convex/lib/googleOneTapAuth.ts` — NEW: internal mutation for profile updates