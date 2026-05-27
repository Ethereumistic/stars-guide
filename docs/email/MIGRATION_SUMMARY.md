# Email System Migration — Resend → MailCow SMTP

> **Status**: ✅ Complete. MailCow, DNS, SMTP, cron jobs, email verification,
> and password reset all operational.

---

## What Was Done

### 1. Removed Resend entirely

- **Deleted** `convex/email/resend.ts` — the old Resend API client wrapper
- **Removed** `resend` npm package (`pnpm remove resend`)
- **Removed** the Resend webhook route from `convex/http.ts`
- **Stripped** `convex/email/webhooks.ts` down to unsubscribe helper + email validation

### 2. Added nodemailer + SMTP sender

- **Installed** `nodemailer` + `@types/nodemailer`
- **Created** `convex/email/lib.ts` (`"use node"`) — lazy, pooled SMTP transporters for:
  - `auth@stars.guide` — transactional emails (verification, password reset, welcome)
  - `oracle@stars.guide` — marketing emails (horoscopes, cosmic weather, re-engagement)
- **Created** `convex/email/sender.ts` (`"use node"`) — `sendEmail` internalAction

### 3. Added email verification & password reset

- **Created** `convex/auth/emailProviders.ts` — Convex Auth `Email` providers:
  - `verifyEmailProvider` — 6-digit OTP for email verification on sign-up
  - `resetEmailProvider` — 6-digit OTP for password reset
  - Both send via `ctx.runAction(internal.email.sender.sendEmail, ...)` to cross the Node.js runtime boundary
  - Branded dark-theme HTML template with gold accent OTP code
- **Updated** `convex/auth.ts` — wired `verify` and `reset` into the Password provider
- **Updated** `src/app/(auth)/sign-up/sign-up-form.tsx` — OTP verification step after sign-up
- **Updated** `src/app/(auth)/sign-in/sign-in-form.tsx` — OTP verification step for unverified emails
- **Rewrote** `src/app/(auth)/forgot-password/page.tsx` — full 3-step reset flow (email → code + new password → done)

### 4. Convex runtime boundary

| File | Runtime | Role |
|------|---------|------|
| `convex/email/lib.ts` | `"use node"` | SMTP transporters (nodemailer) |
| `convex/email/sender.ts` | `"use node"` | `sendEmail` internalAction — the bridge |
| `convex/auth/emailProviders.ts` | Default | OTP providers — calls sender via `ctx.runAction()` |
| `convex/email/crons.ts` | Default | Cron orchestrators — calls sender via `ctx.runAction()` |
| `convex/email/webhooks.ts` | Default | Unsubscribe helper only |
| `convex/email/leads.ts` | Default | Lead capture mutations/queries |
| `convex/email/queries.ts` | Default | Email data queries |

### 5. Schema changes (`convex/schema.ts`)

- Renamed `resendMessageId` → `messageId` on `emailDeliveries`
- Renamed index `by_resendMessageId` → `by_messageId`
- Added `"failed"` as valid status
- Updated section comment to "MailCow SMTP + React Email"

### 6. Registered cron jobs (`convex/crons.ts`)

| Cron | Schedule (UTC) | Description |
|------|----------------|-------------|
| `refresh-email-segments` | 00:30 daily | Recomputes user segments |
| `send-daily-horoscope-emails` | 06:00 daily | Daily horoscope digest |
| `send-welcome-emails` | 07:00 daily | Welcome email for new sign-ups |
| `send-weekly-cosmic-emails` | 09:00 Saturday | Weekly cosmic weather digest |
| `send-reengagement-emails` | 10:00 daily | Re-engage inactive users |

### 7. Infra setup (completed)

- MailCow domain + mailboxes on `email.echoray.io`
- App passwords for `auth@stars.guide` and `oracle@stars.guide`
- Cloudflare DNS (MX, SPF, DKIM, DMARC, SRV, CNAMEs)
- Convex env vars (SMTP_*) set in both `.env.local` and self-hosted dashboard
- Deliverability test passed ✅

---

## Important Notes

### Convex Auth field names

The `reset-verification` flow uses **`newPassword`** (not `password`). This is a
Convex Auth convention. Using `password` instead will cause an "Invalid password"
error because the field is undefined.

### `sendVerificationRequest` ctx quirk

Convex Auth passes the ActionCtx as the second argument to
`sendVerificationRequest` at runtime, but TypeScript doesn't reflect this yet.
The provider configs type `ctx` as `any` with a runtime guard:
`if (!ctx?.runAction) throw new Error(...)`.

### Password requirements

Convex Auth's default validation requires passwords ≥ 8 characters. The UI
validates this client-side before submission. The error message "Invalid
password" from the server maps to "Password must be at least 8 characters
long." via `src/lib/auth-errors.ts`.

---

## See also

- [Transactional Email System](./TRANSACTIONAL_EMAIL.md) — full architecture, flows, infra, troubleshooting
- [Auth Overview](../auth/overview.md) — auth flows, provider config, key files