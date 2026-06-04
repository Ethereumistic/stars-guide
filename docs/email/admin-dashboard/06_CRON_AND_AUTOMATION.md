# Cron Jobs & Email Automation v2

> **Scope**: Replace the naive dormancy heuristic with proper engagement tracking. Update existing cron jobs to respect `emailStatus` and `engagementStatus`. Add new cron jobs for engagement computation.

---

## Current State (What's Broken)

The existing re-engagement cron (`convex/email/crons.ts`):

```typescript
const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
const dormantUsers = allUsers.filter(
    (u) => u.email && u._creationTime && u._creationTime < sevenDaysAgo
);
```

**Problems**:
1. Uses `_creationTime` (signup date) instead of actual activity — a user who signed up 8 days ago but uses the app daily is "dormant"
2. Does not check `emailStatus` — sends to bounced, unsubscribed, and blocked users
3. Does not check `emailPreferences` — ignores user's frequency preference
4. Does not record delivery on failure — `sendViaSmtp` catches errors but the re-engagement loop never calls `recordDelivery`
5. No rate limiting — could theoretically email the same user every day
6. No deduplication — same user could receive multiple re-engagement emails if they match multiple campaigns

---

## New Cron Jobs

### 1. `computeEngagementStatus` (Daily, 00:15 UTC)

Runs after cosmic weather (00:05) and before precompute (01:30). Computes `engagementStatus` for all users.

```typescript
crons.daily(
    "compute-engagement-status",
    { hourUTC: 0, minuteUTC: 15 },
    internal.users.crons.computeEngagementStatus,
);
```

**Logic**:
```
For each user with !deletedAt:
    lastActive = user.lastActiveAt ?? user._creationTime
    daysSinceActive = floor((now - lastActive) / msPerDay)

    if daysSinceActive <= 7:
        engagementStatus = "new"    (if _creationTime is also <= 7d)
        OR engagementStatus = "active" (if older account but active recently)
    else if daysSinceActive <= 14:
        engagementStatus = "active"
    else if daysSinceActive <= 60:
        engagementStatus = "dormant"
    else:
        engagementStatus = "churned"

    Patch user document
```

**Edge case**: A brand-new user (signed up today) with `lastActiveAt = now` should have `engagementStatus = "new"`, not `"active"`. Use:
```
accountAgeDays = floor((now - _creationTime) / msPerDay)
if accountAgeDays <= 7:
    engagementStatus = "new"
elif daysSinceActive <= 14:
    engagementStatus = "active"
...
```

---

### 2. `sendReengagementEmails` v2 (Daily, 10:00 UTC)

Replace the existing cron. Same schedule, better logic.

**Eligibility criteria** (ALL must pass):
1. `engagementStatus === "dormant"`
2. `emailStatus === "active"` OR `undefined` (treat missing as active)
3. `emailPreferences.subscribed === true`
4. `emailPreferences.frequency` allows reengagement (i.e., not `"none"`)
5. `emailPreferences.disabledTypes` does NOT include `"reengagement"`
6. No re-engagement email sent to this user in the last 7 days (deduplication)
7. `role !== "banned"`
8. `deletedAt` is not set

**Deduplication query**:
```typescript
const recentReengagement = await ctx.db.query("emailDeliveries")
    .withIndex("by_user", (q) => q.eq("userId", user._id))
    .filter((q) =>
        q.and(
            q.eq(q.field("status"), "sent"),
            q.gt(q.field("sentAt"), now - 7 * 24 * 60 * 60 * 1000)
        )
    )
    .first(); // If any exists, skip
```

**Recording**:
- On success: `recordDelivery` with `status: "sent"`, `campaignId: null` (or a fixed re-engagement campaign ID)
- On failure: `recordDelivery` with `status: "failed"`, `errorMessage: err.message`

---

### 3. `sendWelcomeEmails` v2 (Daily, 07:00 UTC)

**Eligibility**:
1. `lead.status === "active"` (must have confirmed opt-in)
2. `emailStatus !== "bounced"` && `emailStatus !== "blocked"`
3. Respects the welcome series schedule (`WELCOME_SEQUENCE`) — unchanged

**Fix**: The existing welcome series already checks `deliveryCount >= sequenceEntry.emailNum` but does NOT record delivery on failure. Fix this.

---

### 4. `sendDailyHoroscopeEmails` v2 (Daily, 06:00 UTC)

**Eligibility**:
1. `emailPreferences.frequency === "daily"`
2. `emailPreferences.subscribed === true`
3. `emailStatus` is active/undefined
4. `engagementStatus !== "churned"` (don't email churned users)
5. `emailPreferences.disabledTypes` does NOT include `"daily_horoscope"`

---

### 5. `sendWeeklyCosmicEmails` v2 (Saturday, 09:00 UTC)

**Eligibility**:
1. `emailPreferences.frequency === "weekly"` OR `"daily"` (daily subscribers also get weekly? Decide: yes, weekly is a superset digest)
2. Actually, let's keep it simple: `frequency === "weekly"` only. Daily subscribers get daily horoscopes, not weekly cosmic.
3. Same emailStatus/engagementStatus filters as daily horoscope.

---

### 6. `refreshEmailSegments` v2 (Daily, 00:30 UTC)

Update to use the new `engagementStatus` and `emailStatus` fields.

```typescript
// For each segment:
if criteria.engagement:
    users = users.filter(u => u.engagementStatus === criteria.engagement)
if criteria.emailStatus:
    users = users.filter(u => u.emailStatus === criteria.emailStatus || (!u.emailStatus && criteria.emailStatus === "active"))
```

---

### 7. `processBounces` (Hourly, optional)

If MailCow supports bounce webhooks or if we implement bounce detection via SMTP response parsing, add a cron to process bounces and update `emailStatus`.

**For MVP**: Skip this. Manual admin update of `emailStatus` via `/admin/users` is sufficient. Document as Phase 2.

---

## Updated `convex/crons.ts`

```typescript
// Add:
crons.daily(
    "compute-engagement-status",
    { hourUTC: 0, minuteUTC: 15 },
    internal.users.crons.computeEngagementStatus,
);
```

No changes needed to the re-engagement / horoscope / welcome cron registrations themselves — only the internal handler logic changes.

---

## `convex/users/crons.ts` (New File)

```typescript
import { internalAction, internalMutation } from "../_generated/server";
import { v } from "convex/values";

export const computeEngagementStatus = internalAction({
    args: {},
    handler: async (ctx) => {
        const users = await ctx.runQuery(internal.users.admin.getAllActiveUsers);
        const now = Date.now();
        const msPerDay = 24 * 60 * 60 * 1000;

        let updated = 0;
        for (const user of users) {
            const accountAgeMs = now - user._creationTime;
            const accountAgeDays = Math.floor(accountAgeMs / msPerDay);

            const lastActive = user.lastActiveAt ?? user._creationTime;
            const daysSinceActive = Math.floor((now - lastActive) / msPerDay);

            let newStatus: "new" | "active" | "dormant" | "churned";

            if (accountAgeDays <= 7) {
                newStatus = "new";
            } else if (daysSinceActive <= 14) {
                newStatus = "active";
            } else if (daysSinceActive <= 60) {
                newStatus = "dormant";
            } else {
                newStatus = "churned";
            }

            if (user.engagementStatus !== newStatus) {
                await ctx.runMutation(internal.users.admin.patchEngagementStatus, {
                    userId: user._id,
                    engagementStatus: newStatus,
                });
                updated++;
            }
        }

        console.log(`[computeEngagementStatus] Updated ${updated}/${users.length} users`);
    },
});
```

**Required internal query** `getAllActiveUsers`:
```typescript
export const getAllActiveUsers = internalQuery({
    args: {},
    handler: async (ctx) => {
        return await ctx.db.query("users")
            .filter((q) => q.eq(q.field("deletedAt"), undefined))
            .collect();
    },
});
```

**Required internal mutation** `patchEngagementStatus`:
```typescript
export const patchEngagementStatus = internalMutation({
    args: {
        userId: v.id("users"),
        engagementStatus: v.union(v.literal("new"), v.literal("active"), v.literal("dormant"), v.literal("churned")),
    },
    handler: async (ctx, args) => {
        await ctx.db.patch(args.userId, { engagementStatus: args.engagementStatus });
    },
});
```

---

## Email Preference Enforcement

Create a helper function used by all email cron jobs:

```typescript
// convex/email/lib.ts (or a new convex/email/helpers.ts)

/**
 * Check if a user is eligible to receive a specific email type.
 */
export async function isEligibleForEmail(
    ctx: any, // MutationCtx or ActionCtx
    user: Doc<"users">,
    emailType: "welcome" | "daily_horoscope" | "weekly_cosmic" | "monthly_roundup" | "reengagement",
    emailPrefs?: Doc<"emailPreferences">,
): Promise<{ eligible: boolean; reason?: string }> {
    // 1. Account state
    if (user.deletedAt) return { eligible: false, reason: "deleted" };
    if (user.role === "banned") return { eligible: false, reason: "banned" };

    // 2. Email deliverability
    const emailStatus = user.emailStatus ?? "active";
    if (emailStatus === "bounced") return { eligible: false, reason: "bounced" };
    if (emailStatus === "complained") return { eligible: false, reason: "complained" };
    if (emailStatus === "blocked") return { eligible: false, reason: "blocked" };

    // 3. Preferences
    if (emailPrefs) {
        if (!emailPrefs.subscribed) return { eligible: false, reason: "unsubscribed" };
        if (emailPrefs.disabledTypes?.includes(emailType)) return { eligible: false, reason: "type_disabled" };

        // Frequency check
        if (emailType === "daily_horoscope" && emailPrefs.frequency === "none") {
            return { eligible: false, reason: "frequency_none" };
        }
        if (emailType === "weekly_cosmic" && emailPrefs.frequency === "none") {
            return { eligible: false, reason: "frequency_none" };
        }
    }

    // 4. Engagement (marketing emails only)
    if (emailType !== "welcome" && user.engagementStatus === "churned") {
        return { eligible: false, reason: "churned" };
    }

    return { eligible: true };
}
```

**Integration**: Call this at the start of every email cron handler before rendering/sending.

---

## Rate Limiting & Safety

Add per-user daily email caps:

```typescript
const MAX_DAILY_EMAILS_PER_USER = 3; // welcome + daily horoscope + one other
```

Query `emailDeliveries` for `sentAt > todayMidnight` and count per user. Skip if cap exceeded.

**For MVP**: Skip explicit rate limiting. The existing cron schedule (daily horoscope at 06:00, welcome at 07:00, re-engagement at 10:00, weekly on Saturday) naturally limits to 2-3 emails per day max. Document as safety note.

---

## Backward Compatibility

- Existing `emailPreferences` docs without `disabledTypes` → treat as all types enabled
- Existing users without `emailStatus` → treat as `"active"`
- Existing users without `engagementStatus` → compute on first cron run
- Existing `emailCampaigns` docs without new fields → work as before (cron-driven campaigns)
