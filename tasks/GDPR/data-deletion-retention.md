# stars.guide — Data Deletion Implementation Spec
**For:** Claude Code / Engineering Agent  
**Scope:** User-facing data deletion flow + backend erasure logic  
**Compliance targets:** GDPR (EU/EEA), CCPA (California), Australian Privacy Act, global best-practice baseline  
**Last updated:** 2026-05-23

---

## 1. Legal Context (Read First)

### What laws apply to stars.guide

| Regulation | Who it covers | Deletion deadline | Applies to you? |
|---|---|---|---|
| **GDPR Art. 17** | Any person in the EU/EEA | **30 calendar days** from request | **Yes** — you serve EU users |
| **CCPA / CPRA** | California residents | **45 days** (extendable to 90) | Only if you hit $25M revenue OR 100k+ consumers — but implement anyway as best practice |
| **Australian Privacy Act** | Australian residents | Reasonable time (no hard deadline, ~30 days is safe) | **Yes** — you are incorporated/operating in Australia |
| **PIPEDA (Canada)** | Canadian residents | Reasonable time | Yes if you collect Canadian users |

**Practical rule:** Treat all users equally. Honor deletion within **30 days** for everyone. This satisfies the strictest requirement (GDPR) globally.

### The 90-day "grace period" question

There is **no legally mandated 30- or 90-day waiting period before deletion**. That is a business practice some companies use for chargeback / account-recovery reasons — it is **not required by law**. GDPR in fact says "without undue delay."

**Recommendation for stars.guide:** Do **not** impose a waiting period. You have no financial transactions, subscriptions requiring billing reconciliation, or other legal retention triggers. Delete promptly. This is the best UX *and* the cleanest legal posture.

**One exception:** Convex backups. You cannot surgically remove data from a point-in-time backup snapshot without restoring and re-deleting. GDPR regulators accept this — you must:
1. Delete from all live systems immediately (or within 30 days).
2. Document that backups containing the data will expire on their normal rotation schedule.
3. Ensure the data is **not restored** to live systems from those backups.

---

## 2. Full Data Inventory

Every piece of data you hold, where it lives, and what to do with it:

### 2a. Convex Database (Primary Store)

| Data | Table / Field | Deletion action |
|---|---|---|
| Email address | `users.email` | Hard delete field |
| Hashed password | `users.passwordHash` | Hard delete field |
| OAuth provider + provider user ID | `authAccounts` (convex/auth) | Hard delete all records for user |
| OAuth refresh/access tokens | `authSessions` (convex/auth) | Hard delete all sessions |
| Date of birth | `users.dob` or birth chart table | Hard delete |
| Time of birth | `users.birthTime` or birth chart table | Hard delete |
| City/location of birth | `users.birthLocation` | Hard delete |
| Geocoordinates (lat/long) | `users.birthLat`, `users.birthLong` | Hard delete |
| Calculated chart data (planets, houses, aspects) | `birthCharts` table | Hard delete entire document |
| AI chat history / analysis results | `messages` or equivalent | Hard delete all messages for user |
| User preferences / settings | `userSettings` | Hard delete |
| Deletion request log (see §4) | `deletionRequests` | **Retain** — this is your compliance record |

### 2b. Cloudflare (Current + Future)

| Data | What Cloudflare holds | Deletion action |
|---|---|---|
| IP address / country (logs) | Cloudflare edge logs | Configure **log retention to ≤ 7 days** in Cloudflare dashboard. No per-user deletion needed since logs are aggregated and roll off. |
| Analytics data | Cloudflare Web Analytics | Privacy-friendly by default (no PII stored). No action needed. |
| Bot score / threat data | Cloudflare WAF | Ephemeral, not tied to user identity. No action needed. |
| Cookies set by CF | `__cf_bm`, `cf_clearance` | These are session-only. No stored PII. No action needed. |

**Future Cloudflare data:** If you add Cloudflare Workers KV, R2 storage, or D1 for user data — add those to this inventory before launch.

### 2c. Third-Party Services (Audit Before Launch)

Check each service you use and confirm they have a deletion API or honor deletion requests via DPA (Data Processing Agreement):

- [ ] **Email provider** (Resend, Postmark, etc.) — delete contact/subscriber record
- [ ] **Error monitoring** (Sentry, etc.) — Sentry has a GDPR delete endpoint; use it
- [ ] **Analytics** (if any beyond Cloudflare) — delete user events
- [ ] **AI API providers** (Anthropic, OpenAI, etc.) — confirm they do not store user birth data beyond the request; review their DPA
- [ ] **Convex itself** — Convex is a data processor; their DPA covers your obligation to delete records via their API

---

## 3. Required Pages / URLs

### 3a. `/account/delete` — User-facing deletion page

This is the URL you provide as your "Data Deletion URL" in app store listings, privacy policy, and any platform integrations (e.g., Meta, Google OAuth app review).

**Page must contain:**
1. Clear explanation of what will be deleted
2. What will be **retained** (deletion audit log — explain why: legal compliance)
3. Any clarification on backup data (honest, brief)
4. A confirmation button/flow
5. No dark patterns — the delete action must be as easy to find and complete as account creation

**Example page copy:**

```
Delete Your Account & Data

When you delete your stars.guide account, the following is permanently removed:
• Your email address and password (or linked social account)
• Your birth date, time, and location
• Your birth chart and all calculated astrological data
• All AI chat history and saved analyses
• Your preferences and settings

This cannot be undone.

We retain a minimal deletion record (that a deletion occurred, on what date, 
and an anonymized request ID) for up to 3 years, solely to demonstrate legal 
compliance if required by a regulator. This record contains no personal data.

Backup data: Our system backups may contain your data for up to [X] days 
(your current backup rotation period — fill this in). This data is isolated 
from our live systems and will not be used or restored. It expires automatically.

[Delete my account permanently] ← button
```

### 3b. `/privacy/data-deletion` — Static informational page (for platform links)

Some platforms (Meta app review, Google OAuth) require a static URL that explains *how* users can delete their data, not the deletion form itself. This page should:
- Explain the steps to delete (go to Account > Settings > Delete Account, or visit `/account/delete`)
- Provide a contact email (e.g., `privacy@stars.guide`) for users who cannot access their account
- State the 30-day response commitment

---

## 4. Backend Implementation

### 4a. Convex Mutation: `deleteUserAccount`

```typescript
// convex/users.ts

export const deleteUserAccount = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthenticated");
    
    // Verify the requesting user is deleting their own account
    const user = await ctx.db.get(args.userId);
    if (!user || user.tokenIdentifier !== identity.tokenIdentifier) {
      throw new Error("Unauthorized");
    }

    // 1. Delete all birth chart data
    const charts = await ctx.db
      .query("birthCharts")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();
    for (const chart of charts) {
      await ctx.db.delete(chart._id);
    }

    // 2. Delete AI chat/message history
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();
    for (const message of messages) {
      await ctx.db.delete(message._id);
    }

    // 3. Delete user preferences / settings
    const settings = await ctx.db
      .query("userSettings")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();
    if (settings) await ctx.db.delete(settings._id);

    // 4. Delete convex/auth sessions and linked accounts
    // convex/auth stores sessions in authSessions and OAuth accounts in authAccounts
    const sessions = await ctx.db
      .query("authSessions")
      .withIndex("userId", (q) => q.eq("userId", args.userId))
      .collect();
    for (const session of sessions) {
      await ctx.db.delete(session._id);
    }

    const authAccounts = await ctx.db
      .query("authAccounts")
      .withIndex("userIdAndProvider", (q) => q.eq("userId", args.userId))
      .collect();
    for (const account of authAccounts) {
      await ctx.db.delete(account._id);
    }

    // 5. Log the deletion event (compliance record — no PII stored here)
    await ctx.db.insert("deletionRequests", {
      requestId: crypto.randomUUID(), // non-identifying reference
      requestedAt: Date.now(),
      completedAt: Date.now(),
      status: "completed",
      // Do NOT store email, name, or any personal data in this record
    });

    // 6. Delete the user record itself — do this last
    await ctx.db.delete(args.userId);

    return { success: true };
  },
});
```

### 4b. Deletion Request Log Table Schema

```typescript
// convex/schema.ts — add this table

deletionRequests: defineTable({
  requestId: v.string(),       // UUID, not linked to user identity
  requestedAt: v.number(),     // Unix timestamp
  completedAt: v.optional(v.number()),
  status: v.union(
    v.literal("pending"),
    v.literal("completed"),
    v.literal("failed"),
    v.literal("rejected") // if you ever need to refuse for legal reasons
  ),
  rejectionReason: v.optional(v.string()), // only if status = rejected
  // NO email, name, userId, or any PII in this table
})
```

> **Why keep this?** GDPR Art. 5(2) requires you to demonstrate compliance ("accountability principle"). If a data protection authority audits you, you need to show deletion requests were honored. The log proves this without re-storing personal data.

### 4c. Frontend Deletion Flow

```typescript
// Recommended UX flow:

// Step 1: User clicks "Delete Account" in settings
// Step 2: Show confirmation modal with summary of what's deleted
// Step 3: Require user to type "DELETE" or their email to confirm (prevents accidental deletion)
// Step 4: Call deleteUserAccount mutation
// Step 5: Sign user out immediately
// Step 6: Redirect to homepage with a message: "Your account has been deleted."
// Step 7: Send confirmation email BEFORE deletion (capture email first, then delete)

// Example React component skeleton:
const DeleteAccountFlow = () => {
  const [step, setStep] = useState<'confirm' | 'typing' | 'deleting' | 'done'>('confirm');
  const [confirmText, setConfirmText] = useState('');
  const deleteAccount = useMutation(api.users.deleteUserAccount);
  
  const handleDelete = async () => {
    if (confirmText !== 'DELETE') return;
    setStep('deleting');
    try {
      // Capture email before deletion for confirmation email
      await sendDeletionConfirmationEmail(user.email); // do this first
      await deleteAccount({ userId: user._id });
      await signOut();
      setStep('done');
    } catch (err) {
      // Handle error — show support contact
    }
  };
  
  // ... render steps
};
```

### 4d. Email Confirmation

Send a transactional email **before** executing deletion (so you still have the address):

```
Subject: Your stars.guide account has been deleted

Hi,

Your account deletion request has been completed. All your personal data, 
birth chart information, and chat history have been permanently removed 
from our systems.

If you did not request this, please contact privacy@stars.guide immediately.

— The stars.guide team
```

---

## 5. Out-of-Account Deletion (for users who can't log in)

Some users will lose access before requesting deletion. You must provide an alternative path.

**Implementation:**

1. Add a form at `/privacy/data-deletion` or via email to `privacy@stars.guide`
2. Ask for: the email address associated with the account
3. Send a verification email to that address with a one-time deletion link
4. On click, execute the same `deleteUserAccount` flow
5. Log the request in `deletionRequests` with status `pending` → `completed`
6. Respond within **30 days** (GDPR requirement)

---

## 6. Third-Party Deletion Cascade

When a user is deleted from Convex, you must also trigger deletion from downstream services. Add these to your `deleteUserAccount` handler or a scheduled job:

```typescript
// After Convex deletion succeeds, fire these:

// 1. Email provider (example: Resend)
await fetch('https://api.resend.com/contacts/' + contactId, {
  method: 'DELETE',
  headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}` }
});

// 2. Sentry (if used for error tracking with user context)
// Use Sentry's "Forget Me" endpoint:
// POST https://sentry.io/api/0/users/me/forget/
// See: https://docs.sentry.io/product/security-legal-pii/gdpr/

// 3. Any analytics tool — use their erasure API
// Document each one here as you add integrations
```

---

## 7. Cloudflare-Specific Notes

You mentioned collecting IP/country data via Cloudflare in the future. Here's what you need to do:

**For standard Cloudflare logs:**
- Set log retention to **≤ 7 days** (Cloudflare dashboard → Logs → Logpush configuration)
- Cloudflare Web Analytics does not store individual-level PII by default — keep using it

**If you build Cloudflare Workers with KV storage for user data:**
- Any user-specific data in KV must be deleted on account deletion
- Add `await env.USER_KV.delete(userId)` to the deletion flow

**IP addresses in logs are personal data under GDPR.** By keeping log retention short (≤ 7 days), you avoid needing to handle individual IP deletion requests since the data auto-expires before a 30-day deadline.

---

## 8. Privacy Policy Updates Required

Your privacy policy must be updated to include (if not already present):

1. **Data we collect:** explicitly list DOB, birth time, birth location, geocoordinates, OAuth data
2. **Legal basis for processing (GDPR Art. 6):** Legitimate Interest or Consent — pick one and be consistent
3. **Retention periods:** "We retain your data for as long as your account is active. Upon deletion, data is removed within 30 days from live systems."
4. **Your rights:** Right to erasure, right to access, right to rectification, right to data portability
5. **How to exercise rights:** Link to `/account/delete` and `privacy@stars.guide`
6. **Third-party processors:** List Convex, Cloudflare, Anthropic API, email provider, etc. with links to their DPAs
7. **Backups:** Mention the backup retention window and that deleted data will not be restored

---

## 9. Implementation Checklist

### Phase 1 — Core (Required for launch)
- [ ] `/account/delete` page with confirmation flow
- [ ] `deleteUserAccount` Convex mutation covering all tables
- [ ] `deletionRequests` audit log table
- [ ] Confirmation email sent before deletion
- [ ] Sign out + redirect after deletion
- [ ] `/privacy/data-deletion` static page (for platform review links)
- [ ] `privacy@stars.guide` email address active and monitored

### Phase 2 — Complete (Required within 30 days of launch)
- [ ] Out-of-account deletion flow (email verification link)
- [ ] Third-party cascade (email provider, Sentry, etc.)
- [ ] Cloudflare log retention set to ≤ 7 days
- [ ] Privacy policy updated with all required sections
- [ ] DPAs signed with all processors (Convex, Cloudflare, Anthropic, etc.)

### Phase 3 — Ongoing
- [ ] Test deletion end-to-end every 3 months
- [ ] Review third-party integrations list when adding new services
- [ ] Update this document whenever data schema changes

---

## 10. What You Do NOT Need (keeping it lean)

- **No DPO (Data Protection Officer):** Only required for large-scale processing or sensitive data at scale. Stars.guide doesn't qualify yet.
- **No 90-day waiting period:** Not legally required; no billing or chargeback reason to implement it.
- **No cookie consent banner for functional cookies:** Authentication cookies are strictly necessary and exempt. You only need a banner if you add tracking/advertising cookies.
- **No CCPA-specific "Do Not Sell" button:** You don't sell user data. If that changes, add it.

---

## 11. Contact / Data Controller Identity

Your privacy policy and deletion page must identify the data controller. This should read:

```
Data Controller: [Your Legal Entity Name]
Address: [Registered address]
Contact: privacy@stars.guide
```

If you are not yet incorporated, use your personal details until you are. Do not leave this blank.

---

*This document should be reviewed by a qualified privacy lawyer before serving users in the EU at scale. It represents a technically sound good-faith implementation but is not a substitute for legal advice.*