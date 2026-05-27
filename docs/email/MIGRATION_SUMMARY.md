# Email System Migration — Resend → MailCow SMTP

> **Status**: Code changes complete and passing typecheck. Awaiting MailCow server setup, DNS configuration, and Convex environment variables before email sending is functional.

---

## What Was Done

### 1. Removed Resend entirely

- **Deleted** `convex/email/resend.ts` — the old Resend API client wrapper
- **Removed** `resend` npm package (`pnpm remove resend`)
- **Removed** the Resend webhook route from `convex/http.ts` (was `POST /email/webhooks/resend`)
- **Stripped** `convex/email/webhooks.ts` down to just the unsubscribe helper and email validation — all Resend webhook event handlers (delivered, opened, clicked, bounced, complained) are gone because MailCow doesn't offer real-time webhooks

### 2. Added nodemailer + new SMTP sender

- **Installed** `nodemailer` + `@types/nodemailer`
- **Created** `convex/email/lib.ts` (`"use node"`) — lazy, pooled SMTP transporters for two sender identities:
  - `auth@stars.guide` — transactional emails (welcome, verification)
  - `oracle@stars.guide` — marketing emails (horoscopes, cosmic weather, re-engagement)
- **Created** `convex/email/sender.ts` (`"use node"`) — `sendEmail` internalAction that accepts `{ to, subject, html, text?, channel?, from? }` and returns `{ messageId }`

### 3. Convex runtime boundary

Convex's default runtime cannot use Node.js builtins (`net`, `stream`, `crypto`) that nodemailer needs. The solution:

| File | Runtime | Role |
|------|---------|------|
| `convex/email/lib.ts` | `"use node"` | SMTP transporters (nodemailer) |
| `convex/email/sender.ts` | `"use node"` | `sendEmail` internalAction — the bridge |
| `convex/email/crons.ts` | Default Convex runtime | Cron orchestrators — calls `sender.sendEmail` via `ctx.runAction()` |
| `convex/email/webhooks.ts` | Default Convex runtime | Unsubscribe helper only |
| `convex/email/leads.ts` | Default Convex runtime | Lead capture mutations/queries |
| `convex/email/queries.ts` | Default Convex runtime | Email data queries |

**Critical rule**: `"use node"` files can only import from other `"use node"` files. The cron actions in `crons.ts` call the sender via `ctx.runAction(internal.email.sender.sendEmail, ...)` to cross the runtime boundary.

### 4. Schema changes (`convex/schema.ts`)

- Renamed `resendMessageId` field → `messageId` on the `emailDeliveries` table
- Renamed index `by_resendMessageId` → `by_messageId`
- Added `"failed"` as a valid status to the `emailDeliveries` status union
- Updated section comment from "Resend + React Email" → "MailCow SMTP + React Email"

### 5. Updated `convex/email/crons.ts`

- Replaced `import { sendEmail } from "./resend"` → `sendViaSmtp()` helper that calls `ctx.runAction(internal.email.sender.sendEmail, ...)`
- All `render()` calls changed to `await render()` (it returns a Promise)
- Fixed `user.createdAt` → `user._creationTime` (Convex documents don't have a `createdAt` field; `_creationTime` is the built-in)
- Fixed `refreshEmailSegments` — was using `ctx.db` in an action (not allowed) → now uses `ctx.runQuery()`
- Added `getUsersByTier` internalQuery to support segment tier filtering
- Marketing emails use `channel: "marketing"`, welcome emails use `channel: "transactional"`

### 6. Bug fixes (pre-existing, found during migration)

- `convex/analytics.ts` — `null` → `undefined` for optional fields
- `convex/referrals.ts` — `null` → `undefined` for optional fields, hoisted `milestoneKey` variable out of `if` block scope, added type cast for `MILESTONE_TIERS` index access
- `convex/email/leads.ts` — added missing `query` import
- `convex/email/queries.ts` — fixed `.eq().eq()` chaining → `q.and(q.eq(), q.eq())`
- `convex/analytics.internal.ts` — renamed to `convex/analyticsInternal.ts` (Convex doesn't support dots in filenames) and fixed cron references from `internal.analytics.*` → `internal.analyticsInternal.*`
- `emails/*.tsx` — all 5 templates fixed: `theme.baseStyles` → `baseStyles` (imported from `./theme`), added `baseStyles` to imports where missing

### 7. `convex/crons.ts` (main cron registry)

- Email cron jobs from `email/crons.ts` are **not yet registered** here. They need to be added when ready for production use.

---

## What Still Needs To Be Done

### A. MailCow Server Setup (on email.echoray.io)

1. **Add domain** `stars.guide` in MailCow admin: System → Configuration → Mail → Domains → Add
2. **Create mailbox** `auth@stars.guide` — for transactional emails
3. **Create mailbox** `oracle@stars.guide` — for marketing emails
4. **Generate app passwords** for each mailbox (MailCow → Mailboxes → Edit → App passwords). Use these — not the mailbox passwords — for SMTP auth.
5. **Generate DKIM key** for `stars.guide`: Configuration → ARC/DKIM → Add `stars.guide`, selector `mail`, key length 2048. Copy the public key for DNS.

### B. Cloudflare DNS Records (for stars.guide domain)

Add these records. Replace `YOUR_VPS_IP` with the actual VPS IP where MailCow runs:

| Type | Name | Value | Proxy |
|------|------|-------|-------|
| **A** | `mail` | `YOUR_VPS_IP` | DNS only (grey cloud ☁️) |
| **MX** | `@` | `mail.stars.guide` (priority 10) | DNS only |
| **TXT** | `@` | `v=spf1 mx a ip4:YOUR_VPS_IP ~all` | — |
| **TXT** | `mail._domainkey` | `v=DKIM1; k=rsa; p=PUBLIC_KEY_FROM_MAILCOW` | — |
| **TXT** | `_dmarc` | `v=DMARC1; p=quarantine; rua=mailto:auth@stars.guide; ruf=mailto:auth@stars.guide; fo=1` | — |

**Notes**:
- MX and A records for mail MUST be DNS-only (grey cloud), not proxied through Cloudflare
- Start with SPF `~all` (softfail). Switch to `-all` (hard fail) after verifying deliverability
- The DKIM TXT record name uses the selector from MailCow (e.g., if selector is `mail`, record name is `mail._domainkey`)
- DMARC `p=quarantine` is safe for initial setup. Move to `p=reject` after confirming emails land in inboxes

### C. Convex Environment Variables (self-hosted Convex)

Set these on the self-hosted Convex instance:

```
SMTP_HOST=email.echoray.io
SMTP_PORT=587
SMTP_USER_AUTH=auth@stars.guide
SMTP_PASS_AUTH=<app-password-for-auth-mailbox>
SMTP_USER_ORACLE=oracle@stars.guide
SMTP_PASS_ORACLE=<app-password-for-oracle-mailbox>
```

### D. Register Email Cron Jobs in `convex/crons.ts`

The email cron actions exist in `convex/email/crons.ts` but are **not yet registered** in the main `convex/crons.ts` file. Add these when ready:

```ts
// ─── EMAIL MARKETING ────────────────────────────────────────────────────
crons.daily(
    "send-daily-horoscope-emails",
    { hourUTC: 6, minuteUTC: 0 },
    internal.email.crons.sendDailyHoroscopeEmails,
);

crons.daily(
    "send-welcome-emails",
    { hourUTC: 7, minuteUTC: 0 },
    internal.email.crons.sendWelcomeEmails,
);

crons.daily(
    "send-weekly-cosmic-emails",
    { hourUTC: 9, minuteUTC: 0, dayOfWeekUTC: 6 }, // Saturday
    internal.email.crons.sendWeeklyCosmicEmails,
);

crons.daily(
    "send-reengagement-emails",
    { hourUTC: 10, minuteUTC: 0 },
    internal.email.crons.sendReengagementEmails,
);

crons.daily(
    "refresh-email-segments",
    { hourUTC: 0, minuteUTC: 30 },
    internal.email.crons.refreshEmailSegments,
);
```

### E. Deliverability Testing (after DNS + env vars are set)

1. Send a test email manually from the Convex dashboard by running `internal.email.sender.sendEmail` with test args
2. Check it arrives and inspect headers with a tool like https://www.mail-tester.com
3. Verify SPF, DKIM, and DMARC all pass
4. If any fail, adjust DNS records accordingly

### F. Future Improvements (not blocking)

- **Bounce tracking**: MailCow logs bounces to Postfix logs. Could add a cron that parses MailCow logs via its API and updates `emailDeliveries` status to `"bounced"`
- **Open/click tracking**: Would require adding tracking pixels and redirect URLs in email templates. No current infrastructure for this with MailCow.
- **Rate limiting**: The current `rateLimit: 14` in nodemailer is conservative. Tune based on MailCow's actual limits.
- **Email template improvements**: The 5 React Email templates exist in `/emails/` but have minimal content — they could use design polish

---

## File Map

```
convex/email/
  lib.ts          ← "use node" — SMTP transporters (nodemailer, pooled)
  sender.ts       ← "use node" — sendEmail internalAction (the bridge)
  crons.ts        ← default runtime — cron orchestrators, queries, mutations
  webhooks.ts     ← default runtime — unsubscribe helper, email validation
  leads.ts        ← default runtime — lead capture mutations/queries
  queries.ts      ← default runtime — email data internal queries

convex/schema.ts  ← emailDeliveries.messageId (was resendMessageId), "failed" status added

convex/http.ts    ← Resend webhook route removed, only auth routes remain
convex/crons.ts   ← Email cron jobs NOT yet registered here

emails/
  theme.ts                  ← Shared styles + baseStyles export
  WelcomeEmail.tsx          ← Fixed: imports baseStyles
  DailyHoroscopeEmail.tsx   ← Fixed: imports baseStyles
  WeeklyCosmicEmail.tsx     ← Fixed: imports baseStyles
  MonthlyRoundupEmail.tsx   ← Fixed: imports baseStyles
  ReengagementEmail.tsx     ← Fixed: imports baseStyles
```

## Email Channels

| Channel | From Address | Used For |
|---------|-------------|----------|
| `transactional` | `stars.guide <auth@stars.guide>` | Welcome emails, verification, password reset |
| `marketing` | `stars.guide Oracle <oracle@stars.guide>` | Daily horoscopes, weekly cosmic digest, re-engagement |

## Architecture Diagram

```
convex/crons.ts (scheduler)
  → internal.email.crons.sendDailyHoroscopeEmails (internalAction, default runtime)
      → ctx.runQuery() to get users/horoscopes (internalQuery)
      → ctx.runAction(internal.email.sender.sendEmail) ← crosses into Node.js runtime
          → nodemailer → SMTP → email.echoray.io (MailCow/Postfix)
      → ctx.runMutation() to record delivery (internalMutation)
```
