# Schema Changes

> **File to modify**: `convex/schema.ts`  
> **Rule**: Add new tables and fields only. Do NOT remove or rename existing fields/tables unless explicitly noted. Keep backward compatibility.

---

## 1. `users` Table — Additions

Add the following fields to the existing `users` table definition (inside `defineTable`, after the `preferences` field):

```typescript
// ─── Email Deliverability State ───
emailStatus: v.optional(v.union(
    v.literal("active"),       // Receiving emails normally
    v.literal("bounced"),      // Hard bounce detected — stop sending
    v.literal("complained"),   // Marked spam — stop sending
    v.literal("unsubscribed"), // User opted out of marketing emails
    v.literal("blocked"),       // Admin manually blocked
)),

// ─── Engagement / Lifecycle State ───
engagementStatus: v.optional(v.union(
    v.literal("new"),       // 0–7 days since signup
    v.literal("active"),    // Engaged within last 14 days
    v.literal("dormant"),   // No activity for 14–60 days
    v.literal("churned"),   // No activity for >60 days
)),

// ─── Activity Tracking ───
lastActiveAt: v.optional(v.number()),   // Unix ms — updated on meaningful activity
lastLoginAt: v.optional(v.number()),    // Unix ms — updated on every auth session

// ─── Admin / Moderation ───
// Expand role union to include "banned"
// NOTE: This requires changing the existing role field union:
role: v.union(
    v.literal("user"),
    v.literal("admin"),
    v.literal("moderator"),
    v.literal("banned"),     // NEW — cannot sign in, data preserved for audit
),

// ─── Soft Delete ───
deletedAt: v.optional(v.number()),      // Unix ms — set on account deletion request
```

**New index** on `users`:

```typescript
.index("by_email_status", ["emailStatus"])
.index("by_engagement_status", ["engagementStatus"])
.index("by_last_active", ["lastActiveAt"])
```

### Migration Notes

- Existing users will have `emailStatus: undefined` → treat as `"active"` in queries.
- Existing users will have `engagementStatus: undefined` → the cron migration job (`updateEngagementStatus`) should compute and backfill these on first run.
- Existing users with `role === "user" | "admin" | "moderator"` are unaffected.
- `deletedAt` is `undefined` for all existing users → they are active accounts.

---

## 2. `emailCampaigns` Table — Expansion

The existing `emailCampaigns` table is cron-oriented. Expand it to support admin-created one-off and custom campaigns:

**Add to `emailCampaigns` definition**:

```typescript
// ─── Content ─── (new fields)
htmlContent: v.optional(v.string()),       // For custom HTML campaigns
reactEmailTemplate: v.optional(v.string()), // Template name: "WelcomeEmail" | "ReengagementEmail" | etc.

campaignData: v.optional(v.object({          // Template props serialized as JSON string
    sign: v.optional(v.string()),
    daysAway: v.optional(v.number()),
    // ... other template-specific props
})),

// ─── Targeting ─── (expand existing `segment` field usage)
targetType: v.union(
    v.literal("all_users"),
    v.literal("by_tier"),
    v.literal("by_engagement"),
    v.literal("by_email_status"),
    v.literal("by_segment"),
    v.literal("specific_emails"),
),
targetFilter: v.optional(v.string()),        // Tier value, engagement value, segment name, etc.
targetEmails: v.optional(v.array(v.string())), // For specific_emails mode

// ─── Delivery Stats ─── (expand existing)
// Add to the existing schema:
// (these were already optional in the existing schema, just ensure they exist)
// sentCount, readCount are already there. Add:
deliveredCount: v.optional(v.number()),
bouncedCount: v.optional(v.number()),
failedCount: v.optional(v.number()),
openedCount: v.optional(v.number()),
clickedCount: v.optional(v.number()),

// ─── Metadata ───
sentBy: v.optional(v.id("users")),         // Admin who triggered send (null for cron)
```

**New index**:

```typescript
.index("by_type", ["type"])
.index("by_status_created", ["status", "createdAt"])
```

---

## 3. `emailDeliveries` Table — Expansion

The existing `emailDeliveries` table tracks per-email status. Add:

```typescript
// ─── Content ───
subject: v.optional(v.string()),           // What was the email subject?
htmlPreview: v.optional(v.string()),        // Truncated HTML snippet (first 2KB) for admin preview
channel: v.optional(v.union(                // Which SMTP identity was used
    v.literal("transactional"),
    v.literal("marketing"),
)),

// ─── Error Details ───
errorMessage: v.optional(v.string()),       // SMTP error text on failure
errorCode: v.optional(v.string()),         // e.g. "EAUTH", "ECONNREFUSED"

// ─── Campaign Link ───
// campaignId and userId already exist — ensure they are indexed
```

**New index**:

```typescript
.index("by_channel", ["channel"])
.index("by_email_status", ["email", "status"])
.index("by_date", ["sentAt"])   // Only if sentAt is guaranteed to exist; use with care
```

---

## 4. New Table: `userActivityEvents` (Optional, Recommended)

A lightweight event stream for precise engagement tracking. If this feels too heavy, compute engagement from existing tables (`journal_entries`, `oracle_sessions`, `user_activity`).

```typescript
userActivityEvents: defineTable({
    userId: v.id("users"),
    eventType: v.union(
        v.literal("login"),
        v.literal("page_view"),
        v.literal("oracle_session"),
        v.literal("journal_entry"),
        v.literal("horoscope_view"),
        v.literal("settings_update"),
        v.literal("email_open"),
        v.literal("email_click"),
    ),
    metadata: v.optional(v.record(v.string(), v.string())), // e.g. { page: "/dashboard", sign: "Aries" }
    timestamp: v.number(),
})
    .index("by_user", ["userId"])
    .index("by_user_timestamp", ["userId", "timestamp"])
    .index("by_event_type", ["eventType", "timestamp"]),
```

**Alternative (lighter)**: Do NOT create this table. Instead, update `lastActiveAt` directly in the `users` table whenever a meaningful action occurs. Use existing `user_activity` table for DAU/MAU, and query `journal_entries`, `oracle_sessions` for feature-specific engagement.

**Recommendation**: Skip `userActivityEvents` for MVP. Use the `lastActiveAt` field + existing tables.

---

## 5. New Table: `adminActions` (Audit Log)

Track all admin mutations for compliance and forensics.

```typescript
adminActions: defineTable({
    adminUserId: v.id("users"),
    actionType: v.union(
        v.literal("user_update"),
        v.literal("user_ban"),
        v.literal("user_delete"),
        v.literal("email_send"),
        v.literal("campaign_create"),
        v.literal("campaign_send"),
        v.literal("campaign_cancel"),
        v.literal("lead_update"),
        v.literal("lead_delete"),
    ),
    targetUserId: v.optional(v.id("users")),
    targetCampaignId: v.optional(v.id("emailCampaigns")),
    targetLeadId: v.optional(v.id("emailLeads")),
    details: v.optional(v.string()),        // Human-readable summary
    previousValue: v.optional(v.string()),  // JSON string of before-state
    newValue: v.optional(v.string()),       // JSON string of after-state
    createdAt: v.number(),
})
    .index("by_admin", ["adminUserId"])
    .index("by_target_user", ["targetUserId"])
    .index("by_action_type", ["actionType"])
    .index("by_created", ["createdAt"]),
```

**Note**: This is Phase 2. For MVP, admin actions can be logged to `console.log` in Convex mutations. Add the table later.

---

## 6. `emailPreferences` Table — Expansion

The existing `emailPreferences` table has `subscribed`, `frequency`, `types`. Expand for granular control:

```typescript
// Add to existing emailPreferences table:
unsubscribedAt: v.optional(v.number()),      // When user opted out
unsubscribeReason: v.optional(v.string()),   // Optional free-text reason

// Granular type opt-outs (override the global `subscribed` flag)
// If a type is in this array, user does NOT receive that type even if subscribed=true
disabledTypes: v.optional(v.array(v.union(
    v.literal("welcome"),
    v.literal("daily_horoscope"),
    v.literal("weekly_cosmic"),
    v.literal("monthly_roundup"),
    v.literal("reengagement"),
    v.literal("admin_broadcast"),
))),
```

---

## 7. `emailSegments` Table — Expansion

Expand criteria to support engagement-based segments:

```typescript
// Expand existing criteria object:
criteria: v.object({
    tier: v.optional(v.union(v.literal("free"), v.literal("popular"), v.literal("premium"))),
    engagement: v.optional(v.union(v.literal("active"), v.literal("dormant"), v.literal("churned"), v.literal("new"))),
    daysInactive: v.optional(v.number()),
    sign: v.optional(v.string()),
    hasEmailPref: v.optional(v.boolean()),
    emailStatus: v.optional(v.union(v.literal("active"), v.literal("bounced"), v.literal("unsubscribed"))),
}),
```

---

## Summary of All Schema Changes

### Modified Tables
| Table | Change | Risk |
|-------|--------|------|
| `users` | Add `emailStatus`, `engagementStatus`, `lastActiveAt`, `lastLoginAt`, `deletedAt`. Expand `role` union to include `"banned"`. Add 3 indexes. | Low — all optional fields |
| `emailCampaigns` | Add `htmlContent`, `reactEmailTemplate`, `campaignData`, `targetType`, `targetFilter`, `targetEmails`, delivery count fields, `sentBy`. Add 2 indexes. | Low — all optional |
| `emailDeliveries` | Add `subject`, `htmlPreview`, `channel`, `errorMessage`, `errorCode`. Add 3 indexes. | Low — all optional |
| `emailPreferences` | Add `unsubscribedAt`, `unsubscribeReason`, `disabledTypes`. | Low — all optional |
| `emailSegments` | Expand `criteria` object. | Low — optional additions |

### New Tables
| Table | Phase | Notes |
|-------|-------|-------|
| `adminActions` | Phase 2 | Audit log — skip for MVP |
| `userActivityEvents` | Skipped | Use `lastActiveAt` + existing tables instead |

### Index Additions
| Table | Index | Fields |
|-------|-------|--------|
| `users` | `by_email_status` | `["emailStatus"]` |
| `users` | `by_engagement_status` | `["engagementStatus"]` |
| `users` | `by_last_active` | `["lastActiveAt"]` |
| `emailCampaigns` | `by_type` | `["type"]` |
| `emailCampaigns` | `by_status_created` | `["status", "createdAt"]` |
| `emailDeliveries` | `by_channel` | `["channel"]` |
| `emailDeliveries` | `by_email_status` | `["email", "status"]` |

---

## Backfill Strategy

After deploying schema changes, run a one-time backfill mutation:

```typescript
// convex/users/admin.ts (one-time internalAction)
export const backfillEngagementStatus = internalAction({
    args: {},
    handler: async (ctx) => {
        const users = await ctx.runQuery(internal.users.admin.getAllUsers);
        for (const user of users) {
            // Compute lastActiveAt from existing data
            // For MVP: set lastActiveAt = _creationTime as fallback
            // Set engagementStatus based on _creationTime age
            // ... 
        }
    },
});
```

This can be triggered once from the Convex dashboard. Document the exact backfill logic in `04_BACKEND_API_SPEC.md`.
