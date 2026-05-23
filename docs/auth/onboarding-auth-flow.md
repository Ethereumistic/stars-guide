# Onboarding Auth Flow

## Overview

The `/onboarding` route is a multi-step wizard that collects the user's birth
data **before** asking them to create an account. This "try before you sign up"
pattern reduces friction: the user is already invested in their chart by the
time they reach the sign-up step.

## Step sequence

```
Step 1  Birth date         (month / day / year)
Step 2  Birth location     (city search + autocomplete)
Step 3  Time check         ("Do you know your birth time?")
Step 4  Birth time         (time picker, only if "yes" on step 3)
Step 5  Detective step 1   (personality questions — fallback for unknown time)
Step 6  Detective step 2   (more personality questions)
Step 7  Calculation step   (computes chart, saves if authenticated)
Step 8  Email step         ← auth step (this file's focus)
Step 9  Password step      (only for email sign-up)
Step 10 Reveal step        (shows chart, saves to DB)
```

All step state is persisted in `useOnboardingStore` (Zustand + localStorage)
so the user can refresh or close the browser and resume where they left off.

## Auth step (Step 8) — `EmailStep`

Step 8 is where the user chooses how to create their account. It offers two
paths:

### OAuth path (Google, Facebook, X)

```
User clicks "Continue with Google"
    │
    ▼
useGoogleOneTap().triggerGoogleSignIn()
    │
    ├── One Tap / FedCM works → user picks account → credential callback
    │   └─ signIn("google-onetap", { credential })
    │       └─ Same backend path as the auth pages
    │
    └── One Tap can't show → 5 s timeout or moment → OAuth redirect
        └─ signIn("google", { redirectTo: "/onboarding" })
            └─ Full-page redirect to Google → back to /onboarding
```

```
User clicks "Continue with Facebook" / "Continue with X"
    │
    ▼
signIn("facebook" | "twitter", { redirectTo: "/onboarding" })
    └─ Full-page redirect → OAuth consent → back to /onboarding
```

After an OAuth redirect, the browser returns to `/onboarding`. The
`OnboardingPage` component detects `isAuthenticated() && step === 8 &&
authMethod === 'oauth'` and automatically jumps to `step 10` (RevealStep).

### Email path

```
User types email → clicks "Continue"
    │
    ▼
setEmail(email)
setAuthMethod('email')
nextStep()  →  Step 9 (PasswordStep)
```

Step 9 collects a password, then calls:

```
signIn("password", { email, password, flow: "signUp", birthData: JSON.stringify(calculatedSigns) })
```

This creates the account and stores birth data in one call. After success the
step advances to 10 (RevealStep).

## Receiving the user after OAuth redirect

When the browser returns from an OAuth provider, the onboarding page must
handle a race condition: the Convex session may not be fully established yet.

```typescript
// OnboardingPage — useEffect
useEffect(() => {
    if (!isLoading && isAuthenticated() && step === 8 && authMethod === 'oauth' && calculatedSigns) {
        setStep(10);  // Jump directly to reveal
    }
}, [isLoading, isAuthenticated, step, authMethod, calculatedSigns, setStep]);
```

Key guards:
- `!isLoading` — wait for Convex auth to settle
- `isAuthenticated()` — confirmed signed in
- `step === 8` — still on the auth step
- `authMethod === 'oauth'` — came via OAuth, not password
- `calculatedSigns` — chart data is available (rehydrated from localStorage)

## RevealStep (Step 10)

The RevealStep component waits for authentication to settle, then saves the
birth data to the Convex `users` table via `updateBirthData` mutation:

```
authStatus === 'loading'    → show spinner ("Verifying your account...")
authStatus === 'failed'     → show error + "Back to sign-up" button
authStatus === 'authenticated' → animate progress bar → reveal chart cards
```

A 5-second grace period prevents false negatives when the Convex session is
still being established after an OAuth redirect.

## Google One Tap in onboarding

The onboarding `EmailStep` uses the same `useGoogleOneTap()` hook as the
dedicated sign-in and sign-up pages. This means:

1. **Auto-prompt**: The `GoogleOneTapProvider` wraps the entire app (including
   `/onboarding`), so the One Tap prompt will appear automatically if the user
   is on the onboarding page and not authenticated.

2. **Button fallback**: The "Continue with Google" button calls
   `triggerGoogleSignIn()`, which tries One Tap first and falls back to OAuth
   redirect — identical behaviour to the auth pages.

3. **FedCM + ITP**: The same FedCM and ITP compatibility applies. On mobile
   browsers where One Tap can't show, the button gracefully falls back to the
   full Google OAuth redirect flow.

## Password step — `PasswordStep`

The password flow is straightforward:

```
signIn("password", {
    email,
    password,
    flow: "signUp",
    birthData: JSON.stringify(calculatedSigns),  // stored via profile callback
})
```

The `birthData` is passed as an extra field in the sign-up request. Convex
Auth's `Password` provider includes it in the `profile` object, which gets
passed to the `createOrUpdateUser` callback in `convex/auth.ts`. The callback
saves `birthData` to the `users` table.

After successful sign-up, `setStep(10)` advances to RevealStep, which detects
that the user is already authenticated and skips straight to the chart reveal.

## Guard rails

| Scenario                              | Handling                                         |
|---------------------------------------|--------------------------------------------------|
| User refreshes during OAuth redirect  | Zustand store persists; `authMethod=oauth` + `calculatedSigns` survive |
| User returns to onboarding later      | `step` is persisted; redirects to correct step    |
| User already has birthData in DB      | `useEffect` redirects to `/dashboard`            |
| OAuth session not yet established     | 5-second grace period in RevealStep               |
| One Tap never fires (mobile bug)      | 5-second safety timeout → OAuth redirect fallback |
| Chart data not yet calculated         | RevealStep waits for `calculatedSigns` from store |

## Data flow diagram

```
Browser localStorage (Zustand persist)
    └── useOnboardingStore
         ├── step, birthDate, birthLocation, ...
         ├── authMethod: 'email' | 'oauth'
         └── calculatedSigns (EnrichedBirthData)

Convex DB
    └── users table
         ├── _id, email, username, image, ...
         └── birthData (EnrichedBirthData, stored as JSON)

authAccounts table
    └── provider: "google", providerAccountId: <Google sub>
```

When the user completes onboarding, their `birthData` is saved to the `users`
table. On subsequent visits, the `useUserStore` detects `user.birthData` and
the app redirects away from `/onboarding` to `/dashboard`.