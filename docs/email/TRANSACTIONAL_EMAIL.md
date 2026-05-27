# Transactional Email System

> Stars Guide sends transactional emails (verification, password reset) via
> MailCow SMTP through Convex Auth's `Email` provider, and marketing emails
> (horoscopes, onboarding) via cron jobs through the same SMTP pipeline.

---

## Architecture

```
User Action                    Convex Backend                     MailCow SMTP
──────────                     ──────────────                     ────────────

Sign up ──► signIn("password",
             flow:"signUp")
                │
                ▼
        ┌──────────────────┐
        │ Password provider│──── verify ──► verifyEmailProvider
        │ (convex/auth.ts) │                 │
        └──────────────────┘                 ▼
                                    sendVerificationRequest()
                                         │
                                         ▼
                                    ctx.runAction(
                                      internal.email.sender.sendEmail
                                    ) ──────────────────► nodemailer ──► SMTP
                                                                │
Forgot pw ──► signIn("password",        ▼                     auth@stars.guide
               flow:"reset")      resetEmailProvider     (or oracle@stars.guide)
                    │                    │
                    ▼                    ▼
              sendVerificationRequest()  ──► OTP email ──► user inbox

Cron job ──► email/crons.ts ──► ctx.runAction(sender.sendEmail) ──► nodemailer ──► SMTP
```

### Runtime boundary

Nodemailer requires Node.js builtins (`net`, `stream`, `crypto`). Convex's
default runtime doesn't provide these, so email sending lives in `"use node"`
files. Cron orchestrators (default runtime) cross the boundary via
`ctx.runAction()`:

| File | Runtime | Role |
|------|---------|------|
| `convex/email/lib.ts` | `"use node"` | SMTP transporters, pooled connections |
| `convex/email/sender.ts` | `"use node"` | `sendEmail` internalAction — the bridge |
| `convex/email/crons.ts` | Default | Cron orchestrators — calls `sender.sendEmail` |
| `convex/auth/emailProviders.ts` | Default | Convex Auth OTP providers — calls `sender.sendEmail` |
| `convex/email/webhooks.ts` | Default | Unsubscribe helper, email validation |
| `convex/email/leads.ts` | Default | Lead capture mutations/queries |
| `convex/email/queries.ts` | Default | Email data queries |

**Rule**: `"use node"` files can only import from other `"use node"` files.
Default-runtime files call `ctx.runAction(internal.email.sender.sendEmail, ...)`
to cross the boundary.

---

## Sender Identities

| Channel | From Address | Used For |
|---------|-------------|----------|
| `transactional` | `stars.guide <auth@stars.guide>` | Email verification, password reset, welcome emails |
| `marketing` | `stars.guide Oracle <oracle@stars.guide>` | Daily horoscopes, weekly cosmic digest, re-engagement |

Set `channel: "transactional"` or `channel: "marketing"` when calling
`sendEmail`. Default is `"transactional"`.

---

## Email Verification (Sign-Up)

When a user signs up with email + password, the Password provider's `verify`
option sends a **6-digit OTP** to their email. The account is created but the
user is **not signed in** until they enter the code.

**Provider**: `verifyEmailProvider` (`convex/auth/emailProviders.ts`)
- ID: `stars-verify`
- OTP length: 6 digits
- Expiry: 15 minutes
- Sent from: `auth@stars.guide`

### Flow

```
1. User enters email + password on /sign-up
      │
      ▼
2. signIn("password", { email, password, flow: "signUp" })
      │
      ▼  returns { signingIn: false }
3. Frontend shows OTP input
      │
      ▼
4. User enters code
      │
      ▼
5. signIn("password", { email, flow: "email-verification", code })
      │
      ▼  returns { signingIn: true }
6. User is signed in → redirect to /onboarding
```

### Frontend

| File | Behaviour |
|------|-----------|
| `src/app/(auth)/sign-up/sign-up-form.tsx` | After signUp returns `signingIn: false`, shows OTP input. Calls `email-verification` flow on submit. |
| `src/app/(auth)/sign-in/sign-in-form.tsx` | If a user signs in but hasn't verified yet, shows OTP input inline. |

**Key**: `signIn()` returns `{ signingIn: boolean }`. When `verify` is configured,
`signUp` and `signIn` return `{ signingIn: false }` for unverified emails,
triggering the OTP step.

---

## Password Reset

**Provider**: `resetEmailProvider` (`convex/auth/emailProviders.ts`)
- ID: `stars-reset`
- OTP length: 6 digits
- Expiry: 15 minutes
- Sent from: `auth@stars.guide`

### Flow

```
1. User enters email on /forgot-password
      │
      ▼
2. signIn("password", { email, flow: "reset" })
      │                sends OTP email
      ▼
3. Frontend shows code + new password form
      │
      ▼
4. User enters code + new password
      │
      ▼
5. signIn("password", { email, flow: "reset-verification", code, newPassword })
      │
      ▼
6. Password updated → redirect to /sign-in
```

### Frontend

| File | Behaviour |
|------|-----------|
| `src/app/(auth)/forgot-password/page.tsx` | 3-step UI: (1) enter email, (2) enter OTP + new password, (3) success message with link to sign in. |

**Important**: The `reset-verification` flow uses `newPassword` (not `password`)
as the field name. Convex Auth expects this exact key.

---

## Auth Email Provider Details

The providers in `convex/auth/emailProviders.ts` are custom configs built with
`@convex-dev/auth/providers/Email`. They:

1. Generate a 6-digit OTP using `@oslojs/crypto/random`
2. Call `ctx.runAction(internal.email.sender.sendEmail, { to, subject, html, text, channel })`
   to send the OTP email via our SMTP pipeline
3. Convex Auth validates the OTP on submission

**Quirk**: The `sendVerificationRequest` callback receives `ctx` (Convex
ActionCtx) as its second argument at runtime, but the TypeScript types don't
reflect this yet. There's a `@ts-expect-error` in Convex Auth's source. We
type `ctx` as `any` and guard with `if (!ctx?.runAction) throw ...`.

---

## Marketing / Scheduled Emails

Cron-scheduled emails (horoscopes, welcome, re-engagement) are defined in
`convex/email/crons.ts` and registered in `convex/crons.ts`.

| Cron | Schedule (UTC) | From | Description |
|------|----------------|------|-------------|
| `refresh-email-segments` | 00:30 daily | — | Recomputes user segments for targeting |
| `send-daily-horoscope-emails` | 06:00 daily | oracle@ | Daily horoscope digest |
| `send-welcome-emails` | 07:00 daily | auth@ | Welcome email for new sign-ups |
| `send-weekly-cosmic-emails` | 09:00 Saturday | oracle@ | Weekly cosmic weather digest |
| `send-reengagement-emails` | 10:00 daily | oracle@ | Re-engage inactive users |

Template files live in `emails/` (React Email components):
- `WelcomeEmail.tsx`
- `DailyHoroscopeEmail.tsx`
- `WeeklyCosmicEmail.tsx`
- `MonthlyRoundupEmail.tsx`
- `ReengagementEmail.tsx`
- `theme.ts` (shared styles)

---

## Infrastructure

### MailCow (email.echoray.io)

| Setting | Value |
|---------|-------|
| Domain | `stars.guide` |
| DKIM selector | `dkim` |
| DKIM key length | 2048-bit RSA |
| Mailbox: transactional | `auth@stars.guide` |
| Mailbox: marketing | `oracle@stars.guide` |
| SMTP auth | App passwords (not mailbox passwords) |

### Cloudflare DNS (stars.guide)

| Type | Name | Value | Proxy |
|------|------|-------|-------|
| MX | `@` | `email.echoray.io` (priority 10) | DNS only |
| TXT | `@` | `v=spf1 include:_spf.mx.cloudflare.net ip4:69.62.120.20 ~all` | — |
| TXT | `dkim._domainkey` | `v=DKIM1;k=rsa;t=s;s=email;p=MIIBIj...` | — |
| TXT | `_dmarc` | `v=DMARC1; p=quarantine; rua=mailto:auth@stars.guide; ruf=mailto:auth@stars.guide; fo=1` | — |
| CNAME | `autodiscover` | `email.echoray.io` | DNS only |
| CNAME | `autoconfig` | `email.echoray.io` | DNS only |
| SRV | `_autodiscover._tcp` | priority 0, weight 0, port 443, target `email.echoray.io` | — |

**Notes**:
- MX and CNAME records for mail MUST be DNS-only (grey cloud ☁️)
- SPF starts with `~all` (softfail); switch to `-all` after verifying deliverability
- DMARC starts with `p=quarantine`; move to `p=reject` once confirmed

### Convex Environment Variables

```
SMTP_HOST=email.echoray.io
SMTP_PORT=587
SMTP_USER_AUTH=auth@stars.guide
SMTP_PASS_AUTH=<app-password>
SMTP_USER_ORACLE=oracle@stars.guide
SMTP_PASS_ORACLE=<app-password>
```

Set in both:
- `.env.local` (local dev, values quoted to prevent `#` comment issues)
- Self-hosted Convex dashboard (production)

---

## File Map

```
convex/
  auth/
    emailProviders.ts      ← Convex Auth Email providers (verify + reset OTP)
    auth.ts                ← Password({ verify, reset }) wired in
  email/
    lib.ts                 ← "use node" — SMTP transporters (nodemailer, pooled)
    sender.ts              ← "use node" — sendEmail internalAction
    crons.ts               ← default runtime — cron orchestrators
    webhooks.ts             ← default runtime — unsubscribe helper
    leads.ts               ← default runtime — lead capture
    queries.ts             ← default runtime — email data queries
  crons.ts                ← Main cron registry (all email crons registered)
  http.ts                 ← Auth routes only (Resend webhook removed)

emails/
  theme.ts                ← Shared styles + baseStyles export
  WelcomeEmail.tsx        ← Welcome email template
  DailyHoroscopeEmail.tsx ← Daily horoscope template
  WeeklyCosmicEmail.tsx   ← Weekly cosmic digest template
  MonthlyRoundupEmail.tsx ← Monthly roundup template
  ReengagementEmail.tsx   ← Re-engagement template

src/app/(auth)/
  sign-up/sign-up-form.tsx    ← OTP verification step after sign-up
  sign-in/sign-in-form.tsx    ← OTP verification step for unverified sign-in
  forgot-password/page.tsx     ← 3-step: email → code + new password → done
```

---

## OTP Email Template

Both verification and password reset emails use the same HTML template
(defined in `convex/auth/emailProviders.ts`). The template features:

- Dark background (`#0a0a12`) matching the Stars Guide brand
- Gold accent color (`#c9a87c`) for the OTP code
- Serif heading font (Georgia)
- Responsive 440px max-width card layout
- 15-minute expiry notice
- Plain-text fallback included

---

## Deliverability Checklist

- [x] SPF record includes MailCow VPS IP and Cloudflare
- [x] DKIM signed with 2048-bit RSA (selector: `dkim`)
- [x] DMARC policy set to `quarantine` with reports to `auth@stars.guide`
- [x] Test email sent and received successfully
- [ ] Run through https://www.mail-tester.com for score
- [ ] Switch SPF to `-all` (hard fail) after verification
- [ ] Switch DMARC to `p=reject` after verification

---

## Troubleshooting

| Symptom | Likely Cause | Fix |
|---------|-------------|-----|
| OTP not received | DNS/DKIM issue | Check DNS records; verify SPF/DKIM with `mail-tester.com` |
| "Invalid code" on OTP entry | Code expired (15 min) or wrong code | Resend OTP; ensure 6-digit code is entered exactly |
| "Invalid password" on reset | Password < 8 characters | Client validates min 8 chars; server also validates |
| SMTP not configured error | Missing env vars | All 6 `SMTP_*` vars must be set in Convex env |
| "Auth email: Convex ctx not available" | `sendVerificationRequest` called without ctx | Should not happen — check Convex Auth version |
| Email lands in spam | Missing/wrong DNS records | Verify SPF, DKIM, DMARC; check IP reputation |