# Authentication Overview

stars.guide uses **Convex Auth** with multiple sign-in methods: password (email),
Google (One Tap + OAuth), Facebook, and X (Twitter). Two paths lead to account
creation — the **dedicated auth pages** (`/sign-in`, `/sign-up`) and the
**onboarding flow** (`/onboarding`). Both share the same backend providers but
have different UX sequences.

## Providers

| Provider ID       | Type              | Use-case                         |
|-------------------|-------------------|----------------------------------|
| `password`        | Convex Password   | Email + password sign-up/in      |
| `google`          | OAuth redirect    | Standard Google OAuth flow       |
| `google-onetap`   | ConvexCredentials | Google One Tap / FedCM (no redirect) |
| `facebook`        | OAuth redirect    | Facebook OAuth                   |
| `twitter`         | OAuth redirect    | X / Twitter OAuth                |

> **Key invariant:** `google-onetap` and `google` share the same `authAccounts`
> record (`provider: "google"`, `providerAccountId: <Google sub>`). A user who
> signs in via One Tap and later via OAuth (or vice versa) gets the same
> account — no duplicates.

## Architecture at a Glance

```
┌─────────────────────────────────────────────┐
│             Browser / Client                 │
│                                              │
│  GoogleOneTapProvider   ──►  GIS script      │
│  (auto-prompts on auth pages)                │
│                                              │
│  useGoogleOneTap()       ──►  prompt()       │
│  (button click handler)                     │
│                                              │
│  Auth pages / Onboarding  ──►  signIn()      │
│                                              │
├─────────────────────────────────────────────┤
│             Convex Backend                   │
│                                              │
│  google-onetap ──► verifyGoogleIdToken()     │
│                   retrieveAccount()          │
│                   createAccount()             │
│                                              │
│  google/facebook/twitter ──► OAuth redirect   │
│                              + account link   │
│                                              │
│  password ──► email + password flow          │
│                                              │
│  createOrUpdateUser ──► username generation  │
│                          email linking        │
└─────────────────────────────────────────────┘
```

## Key Files

| File | Purpose |
|------|---------|
| `convex/auth.ts` | Provider definitions, `createOrUpdateUser` callback |
| `convex/lib/googleIdToken.ts` | JWT verification for Google ID tokens |
| `src/lib/google-one-tap.ts` | GIS types, loaders, helpers |
| `src/components/providers/google-one-tap-provider.tsx` | Provider + `useGoogleOneTap` hook |
| `src/app/(auth)/sign-in/sign-in-form.tsx` | Sign-in form |
| `src/app/(auth)/sign-up/sign-up-form.tsx` | Sign-up form |
| `src/app/onboarding/_components/steps/email-step.tsx` | Onboarding auth step |
| `src/app/onboarding/_components/steps/password-step.tsx` | Onboarding password step |

## See also

- [Google One Tap flow](./google-one-tap-flow.md)
- [Onboarding auth flow](./onboarding-auth-flow.md)