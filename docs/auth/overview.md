# Authentication Overview

stars.guide uses **Convex Auth** with multiple sign-in methods: password (email)
with OTP verification, Google (One Tap + OAuth), Facebook, and X (Twitter).
Two paths lead to account creation — the **dedicated auth pages** (`/sign-in`,
`/sign-up`) and the **onboarding flow** (`/onboarding`). Both share the same
backend providers but have different UX sequences.

## Providers

| Provider ID | Type | Use-case |
|---|---|---|
| `password` | Convex Password | Email + password sign-up/in with OTP verification |
| `google` | OAuth redirect | Standard Google OAuth flow |
| `google-onetap` | ConvexCredentials | Google One Tap / FedCM (no redirect) |
| `facebook` | OAuth redirect | Facebook OAuth |
| `twitter` | OAuth redirect | X / Twitter OAuth |

> **Key invariant:** `google-onetap` and `google` share the same `authAccounts`
> record (`provider: "google"`, `providerAccountId: <Google sub>`). A user who
> signs in via One Tap and later via OAuth (or vice versa) gets the same
> account — no duplicates.

## Email Verification & Password Reset

The Password provider has two email providers configured:

```ts
Password({
    verify: verifyEmailProvider,   // sends 6-digit OTP on sign-up
    reset: resetEmailProvider,      // sends 6-digit OTP on password reset
    profile(params) { ... },
})
```

Both providers (`convex/auth/emailProviders.ts`) use our MailCow SMTP pipeline
to send OTP emails via `ctx.runAction(internal.email.sender.sendEmail, ...)`.

### Email Verification (Sign-Up)

When a user signs up with email + password, Convex Auth sends a 6-digit OTP
to their email. The account is created but the user is **not signed in** until
they enter the code.

```
/sign-up → enter email + password → OTP sent → enter code → signed in → /onboarding
```

The `signIn()` function returns `{ signingIn: false }` when verification is
pending. The frontend checks this and shows the OTP input step.

### Password Reset

```
/forgot-password → enter email → OTP sent → enter code + new password → /sign-in
```

**Important**: The `reset-verification` flow uses `newPassword` (not `password`)
as the field name. This is a Convex Auth convention.

See [Transactional Email Docs](../email/TRANSACTIONAL_EMAIL.md) for full
architecture details, template layout, and troubleshooting.

## Architecture at a Glance

```
┌─────────────────────────────────────────────────────────────┐
│                      Browser / Client                        │
│                                                              │
│  GoogleOneTapProvider    ──►  GIS script                     │
│  (auto-prompts on auth pages)                                │
│                                                              │
│  useGoogleOneTap()        ──►  prompt()                     │
│  (button click handler)                                      │
│                                                              │
│  Auth pages / Onboarding  ──►  signIn()                      │
│                                                              │
│  Sign-up form  ──►  OTP verification step                    │
│  Sign-in form  ──►  OTP verification step (if unverified)    │
│  Forgot password ──►  OTP + new password step                 │
│                                                              │
├─────────────────────────────────────────────────────────────┤
│                      Convex Backend                           │
│                                                              │
│  google-onetap ──► verifyGoogleIdToken()                     │
│                   retrieveAccount()                           │
│                   createAccount()                             │
│                                                              │
│  google/facebook/twitter ──► OAuth redirect                   │
│                              + account link                   │
│                                                              │
│  password ──► email + password flow                          │
│          ├─ verify:  verifyEmailProvider (6-digit OTP)        │
│          └─ reset:   resetEmailProvider (6-digit OTP)         │
│                                                              │
│  createOrUpdateUser ──► username generation                  │
│                          email linking                       │
│                                                              │
│  Email OTP ──► ctx.runAction(sender.sendEmail) ──► SMTP      │
└─────────────────────────────────────────────────────────────┘
```

## Key Files

| File | Purpose |
|------|---------|
| **Auth Config** | |
| `convex/auth.ts` | Provider definitions, `createOrUpdateUser` callback, `verify` + `reset` wired in |
| `convex/auth/emailProviders.ts` | Convex Auth Email providers for OTP verification & password reset |
| **Email Pipeline** | |
| `convex/email/lib.ts` | `"use node"` — SMTP transporters (nodemailer, pooled) |
| `convex/email/sender.ts` | `"use node"` — `sendEmail` internalAction |
| `convex/email/crons.ts` | Cron-scheduled marketing emails (horoscopes, welcome, etc.) |
| **Auth UI** | |
| `src/app/(auth)/sign-up/sign-up-form.tsx` | Sign-up form + OTP verification step |
| `src/app/(auth)/sign-in/sign-in-form.tsx` | Sign-in form + OTP verification step for unverified emails |
| `src/app/(auth)/forgot-password/page.tsx` | 3-step password reset: email → code + new password → done |
| **Google One Tap** | |
| `convex/lib/googleIdToken.ts` | JWT verification for Google ID tokens |
| `src/lib/google-one-tap.ts` | GIS types, loaders, helpers |
| `src/components/providers/google-one-tap-provider.tsx` | Provider + `useGoogleOneTap` hook |
| **Onboarding** | |
| `src/app/onboarding/_components/steps/email-step.tsx` | Onboarding auth step |
| `src/app/onboarding/_components/steps/password-step.tsx` | Onboarding password step |

## Auth Flows

### New user (email + password)

1. `/sign-up` → enter email + password → `signIn("password", { flow: "signUp" })`
2. Returns `{ signingIn: false }` → OTP input shown
3. 6-digit code sent to `auth@stars.guide` via SMTP
4. Enter code → `signIn("password", { flow: "email-verification", code })`
5. Returns `{ signingIn: true }` → redirect to `/onboarding`

### Returning user (email + password, already verified)

1. `/sign-in` → enter email + password → `signIn("password", { flow: "signIn" })`
2. Returns `{ signingIn: true }` → redirect to `/dashboard`

### Returning user (email + password, not yet verified)

1. `/sign-in` → enter email + password → `signIn("password", { flow: "signIn" })`
2. Returns `{ signingIn: false }` → OTP input shown
3. Enter code → `signIn("password", { flow: "email-verification", code })`
4. Returns `{ signingIn: true }` → redirect to `/dashboard`

### Password reset

1. `/forgot-password` → enter email → `signIn("password", { flow: "reset" })`
2. OTP sent to email
3. Enter code + new password → `signIn("password", { flow: "reset-verification", code, newPassword })`
4. Success → redirect to `/sign-in`

### OAuth (Google, Facebook, X)

1. Click social button → OAuth redirect or One Tap popup
2. Account linked/created via `createOrUpdateUser`
3. Redirect to `/onboarding` (new user) or `/dashboard` (existing)

## Environment Variables

Required for auth email (in Convex dashboard + `.env.local`):

```
SMTP_HOST=email.echoray.io
SMTP_PORT=587
SMTP_USER_AUTH=auth@stars.guide
SMTP_PASS_AUTH=<app-password>       # MailCow app password, quote in .env.local
SMTP_USER_ORACLE=oracle@stars.guide
SMTP_PASS_ORACLE=<app-password>     # MailCow app password, quote in .env.local
```

For OAuth providers (already configured):

```
AUTH_GOOGLE_ID=...
AUTH_GOOGLE_SECRET=...
AUTH_TWITTER_ID=...
AUTH_TWITTER_SECRET=...
AUTH_FACEBOOK_ID=...
AUTH_FACEBOOK_SECRET=...
```

## Error Handling

`src/lib/auth-errors.ts` maps raw Convex Auth errors to user-friendly messages:

| Raw Error | User Message |
|-----------|-------------|
| `InvalidSecret` | "The password you entered is incorrect." |
| `InvalidAccountId` | "No account found with that email." |
| `Invalid credentials` | "The email or password you entered is incorrect." |
| `TooManyFailedAttempts` | "Too many failed attempts. Please wait and try again." |
| `Invalid password` | "Password must be at least 8 characters long." |
| `Account <email> already exists` | "An account with this email already exists." |
| `Invalid code` | "Invalid or expired code. Please try again." |

## See also

- [Transactional Email System](../email/TRANSACTIONAL_EMAIL.md) — SMTP pipeline, OTP templates, deliverability
- [Google One Tap flow](./google-one-tap-flow.md)
- [Onboarding auth flow](./onboarding-auth-flow.md)
- [Local HTTPS development (OAuth on mobile)](./local-https-dev.md)
- [Email Migration Summary](../email/MIGRATION_SUMMARY.md) — Resend → MailCow migration details