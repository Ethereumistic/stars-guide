# Backend API Specification

> **Scope**: All new Convex queries, mutations, and actions for `/admin/users` and `/admin/emails`.  
> **Conventions**: Follow existing patterns in `convex/notifications/admin.ts`, `convex/email/crons.ts`, and `convex/email/sender.ts`.

---

## File Map (New & Modified)

| File | Status | Description |
|------|--------|-------------|
| `convex/users/admin.ts` | **NEW** | Admin-facing user queries, mutations, actions |
| `convex/emails/admin.ts` | **NEW** | Admin-facing email queries, mutations, actions |
| `convex/users/activity.ts` | **NEW** | User activity tracking (update `lastActiveAt`) |
| `convex/email/crons.ts` | **MODIFY** | Update re-engagement + welcome series logic |
| `convex/crons.ts` | **MODIFY** | Add engagement-status computation cron |
| `convex/schema.ts` | **MODIFY** | All changes from `03_SCHEMA_CHANGES.md` |

---

## 1. `convex/users/admin.ts`

All functions require `role === "admin"` — check at the start of every handler.

### Queries

#### `list`
Paginated user list with optional filters.

```typescript
export const list = query({
    args: {
        paginationOpts: paginationOptsValidator,
        search: v.optional(v.string()),           // Search email/username
        role: v.optional(v.union(v.literal("user"), v.literal("admin"), v.literal("moderator"), v.literal("banned"))),
        tier: v.optional(v.union(v.literal("free"), v.literal("popular"), v.literal("premium"))),
        subscriptionStatus: v.optional(v.union(v.literal("active"), v.literal("canceled"), v.literal("past_due"), v.literal("trialing"), v.literal("none"))),
        emailStatus: v.optional(v.union(v.literal("active"), v.literal("bounced"), v.literal("complained"), v.literal("unsubscribed"), v.literal("blocked"))),
        engagementStatus: v.optional(v.union(v.literal("new"), v.literal("active"), v.literal("dormant"), v.literal("churned"))),
    },
    handler: async (ctx, args) => {
        // If search is provided, use .withSearch() or filter manually
        // For MVP: query all users, then filter in-memory (acceptable for < 10k users)
        // For scale: use index-based queries + composable filters

        let users = await ctx.db.query("users").collect();

        if (args.search) {
            const q = args.search.toLowerCase();
            users = users.filter(u =>
                (u.email?.toLowerCase().includes(q) ?? false) ||
                (u.username?.toLowerCase().includes(q) ?? false) ||
                u._id.includes(q)
            );
        }
        if (args.role) users = users.filter(u => u.role === args.role);
        if (args.tier) users = users.filter(u => u.tier === args.tier);
        if (args.subscriptionStatus) users = users.filter(u => u.subscriptionStatus === args.subscriptionStatus);
        if (args.emailStatus) users = users.filter(u => u.emailStatus === args.emailStatus);
        if (args.engagementStatus) users = users.filter(u => u.engagementStatus === args.engagementStatus);

        // Exclude deleted users by default
        users = users.filter(u => !u.deletedAt);

        // Manual pagination (since we're filtering in-memory)
        const { cursor, numItems } = args.paginationOpts;
        const start = cursor ? parseInt(cursor, 10) : 0;
        const page = users.slice(start, start + numItems);
        const nextCursor = start + page.length < users.length ? String(start + page.length) : null;
        const isDone = !nextCursor;

        return { page, continueCursor: nextCursor ?? "", isDone };
    },
});
```

**Performance note**: For >10k users, this in-memory filtering will hit Convex's 8MB function output limit. At that scale, refactor to use index-based queries. For now, this is fine.

#### `getById`
Full user profile with computed aggregates.

```typescript
export const getById = query({
    args: { userId: v.id("users") },
    handler: async (ctx, args) => {
        const user = await ctx.db.get(args.userId);
        if (!user || user.deletedAt) return null;

        // Count related records
        const journalCount = (await ctx.db.query("journal_entries")
            .withIndex("by_user", q => q.eq("userId", args.userId))
            .collect()).length;

        const oracleSessions = await ctx.db.query("oracle_sessions")
            .withIndex("by_user", q => q.eq("userId", args.userId))
            .collect();

        const referralCount = (await ctx.db.query("referrals")
            .withIndex("by_referrerId", q => q.eq("referrerId", args.userId))
            .collect()).length;

        const deliveries = await ctx.db.query("emailDeliveries")
            .withIndex("by_user", q => q.eq("userId", args.userId))
            .order("desc")
            .take(50);

        const notifications = await ctx.db.query("notifications")
            .withIndex("by_user_created", q => q.eq("userId", args.userId))
            .order("desc")
            .take(50);

        return {
            user,
            stats: {
                journalCount,
                oracleSessionCount: oracleSessions.length,
                referralCount,
                lastOracleAt: oracleSessions[0]?.lastMessageAt ?? null,
            },
            deliveries,
            notifications,
        };
    },
});
```

#### `getStats`
Aggregated counts for the overview stats cards.

```typescript
export const getStats = query({
    args: {},
    handler: async (ctx) => {
        const users = await ctx.db.query("users").collect();
        const activeUsers = users.filter(u => !u.deletedAt);

        const now = Date.now();
        const sevenDays = 7 * 24 * 60 * 60 * 1000;
        const fourteenDays = 14 * 24 * 60 * 60 * 1000;
        const sixtyDays = 60 * 24 * 60 * 60 * 1000;

        return {
            total: activeUsers.length,
            active7d: activeUsers.filter(u => (u.lastActiveAt ?? 0) > now - sevenDays).length,
            dormant: activeUsers.filter(u => u.engagementStatus === "dormant").length,
            churned: activeUsers.filter(u => u.engagementStatus === "churned").length,
            newUsers: activeUsers.filter(u => u.engagementStatus === "new").length,
            byTier: {
                free: activeUsers.filter(u => u.tier === "free").length,
                popular: activeUsers.filter(u => u.tier === "popular").length,
                premium: activeUsers.filter(u => u.tier === "premium").length,
            },
            byEmailStatus: {
                active: activeUsers.filter(u => u.emailStatus === "active" || !u.emailStatus).length,
                bounced: activeUsers.filter(u => u.emailStatus === "bounced").length,
                unsubscribed: activeUsers.filter(u => u.emailStatus === "unsubscribed").length,
            },
        };
    },
});
```

### Mutations

#### `updateUser`
Update editable user fields.

```typescript
export const updateUser = mutation({
    args: {
        userId: v.id("users"),
        role: v.optional(v.union(v.literal("user"), v.literal("admin"), v.literal("moderator"), v.literal("banned"))),
        tier: v.optional(v.union(v.literal("free"), v.literal("popular"), v.literal("premium"))),
        subscriptionStatus: v.optional(v.union(v.literal("active"), v.literal("canceled"), v.literal("past_due"), v.literal("trialing"), v.literal("none"))),
        emailStatus: v.optional(v.union(v.literal("active"), v.literal("bounced"), v.literal("complained"), v.literal("unsubscribed"), v.literal("blocked"))),
        engagementStatus: v.optional(v.union(v.literal("new"), v.literal("active"), v.literal("dormant"), v.literal("churned"))),
    },
    handler: async (ctx, args) => {
        const admin = await ctx.db.get(ctx.userId);
        if (!admin || admin.role !== "admin") throw new Error("Unauthorized");

        const user = await ctx.db.get(args.userId);
        if (!user || user.deletedAt) throw new Error("User not found");

        const patch: any = {};
        if (args.role) patch.role = args.role;
        if (args.tier) patch.tier = args.tier;
        if (args.subscriptionStatus) patch.subscriptionStatus = args.subscriptionStatus;
        if (args.emailStatus) patch.emailStatus = args.emailStatus;
        if (args.engagementStatus) patch.engagementStatus = args.engagementStatus;

        await ctx.db.patch(args.userId, patch);
        return { success: true };
    },
});
```

#### `bulkUpdateStatus`
Bulk update engagement or email status for multiple users.

```typescript
export const bulkUpdateStatus = mutation({
    args: {
        userIds: v.array(v.id("users")),
        emailStatus: v.optional(v.union(v.literal("active"), v.literal("bounced"), v.literal("complained"), v.literal("unsubscribed"), v.literal("blocked"))),
        engagementStatus: v.optional(v.union(v.literal("new"), v.literal("active"), v.literal("dormant"), v.literal("churned"))),
    },
    handler: async (ctx, args) => {
        const admin = await ctx.db.get(ctx.userId);
        if (!admin || admin.role !== "admin") throw new Error("Unauthorized");

        let updated = 0;
        for (const userId of args.userIds) {
            const user = await ctx.db.get(userId);
            if (!user || user.deletedAt) continue;

            const patch: any = {};
            if (args.emailStatus) patch.emailStatus = args.emailStatus;
            if (args.engagementStatus) patch.engagementStatus = args.engagementStatus;

            if (Object.keys(patch).length > 0) {
                await ctx.db.patch(userId, patch);
                updated++;
            }
        }
        return { updated };
    },
});
```

#### `deleteUser` (Soft Delete)

```typescript
export const deleteUser = mutation({
    args: { userId: v.id("users") },
    handler: async (ctx, args) => {
        const admin = await ctx.db.get(ctx.userId);
        if (!admin || admin.role !== "admin") throw new Error("Unauthorized");

        const user = await ctx.db.get(args.userId);
        if (!user) throw new Error("User not found");

        await ctx.db.patch(args.userId, {
            deletedAt: Date.now(),
            emailStatus: "blocked",
            engagementStatus: "churned",
        });
        return { success: true };
    },
});
```

---

## 2. `convex/emails/admin.ts`

### Queries

#### `listCampaigns`

```typescript
export const listCampaigns = query({
    args: {
        status: v.optional(v.union(v.literal("draft"), v.literal("scheduled"), v.literal("active"), v.literal("paused"), v.literal("completed"), v.literal("sending"))),
    },
    handler: async (ctx, args) => {
        let campaigns = await ctx.db.query("emailCampaigns").order("desc").collect();
        if (args.status) campaigns = campaigns.filter(c => c.status === args.status);
        return campaigns;
    },
});
```

#### `getCampaign`

```typescript
export const getCampaign = query({
    args: { campaignId: v.id("emailCampaigns") },
    handler: async (ctx, args) => {
        return await ctx.db.get(args.campaignId);
    },
});
```

#### `listDeliveries`

```typescript
export const listDeliveries = query({
    args: {
        paginationOpts: paginationOptsValidator,
        status: v.optional(v.union(v.literal("queued"), v.literal("sent"), v.literal("delivered"), v.literal("opened"), v.literal("clicked"), v.literal("bounced"), v.literal("complained"), v.literal("unsubscribed"), v.literal("failed"))),
        channel: v.optional(v.union(v.literal("transactional"), v.literal("marketing"))),
        campaignId: v.optional(v.id("emailCampaigns")),
        userId: v.optional(v.id("users")),
        searchEmail: v.optional(v.string()),
        dateFrom: v.optional(v.number()),  // Unix ms
        dateTo: v.optional(v.number()),    // Unix ms
    },
    handler: async (ctx, args) => {
        // Start with indexed query if possible
        let deliveries: Doc<"emailDeliveries">[] = [];

        if (args.campaignId) {
            deliveries = await ctx.db.query("emailDeliveries")
                .withIndex("by_campaign", q => q.eq("campaignId", args.campaignId))
                .order("desc")
                .collect();
        } else if (args.userId) {
            deliveries = await ctx.db.query("emailDeliveries")
                .withIndex("by_user", q => q.eq("userId", args.userId))
                .order("desc")
                .collect();
        } else {
            deliveries = await ctx.db.query("emailDeliveries").order("desc").collect();
        }

        // In-memory filters
        if (args.status) deliveries = deliveries.filter(d => d.status === args.status);
        if (args.channel) deliveries = deliveries.filter(d => d.channel === args.channel);
        if (args.searchEmail) {
            const q = args.searchEmail.toLowerCase();
            deliveries = deliveries.filter(d => d.email.toLowerCase().includes(q));
        }
        if (args.dateFrom) deliveries = deliveries.filter(d => (d.sentAt ?? 0) >= args.dateFrom);
        if (args.dateTo) deliveries = deliveries.filter(d => (d.sentAt ?? 0) <= args.dateTo);

        // Pagination
        const { cursor, numItems } = args.paginationOpts;
        const start = cursor ? parseInt(cursor, 10) : 0;
        const page = deliveries.slice(start, start + numItems);
        const nextCursor = start + page.length < deliveries.length ? String(start + page.length) : null;

        return { page, continueCursor: nextCursor ?? "", isDone: !nextCursor };
    },
});
```

#### `getDelivery`

```typescript
export const getDelivery = query({
    args: { deliveryId: v.id("emailDeliveries") },
    handler: async (ctx, args) => {
        const delivery = await ctx.db.get(args.deliveryId);
        if (!delivery) return null;

        let user = null;
        let campaign = null;
        if (delivery.userId) user = await ctx.db.get(delivery.userId);
        if (delivery.campaignId) campaign = await ctx.db.get(delivery.campaignId);

        return { delivery, user, campaign };
    },
});
```

#### `listLeads`

```typescript
export const listLeads = query({
    args: {
        paginationOpts: paginationOptsValidator,
        status: v.optional(v.union(v.literal("pending"), v.literal("active"), v.literal("unsubscribed"), v.literal("bounced"))),
        source: v.optional(v.union(v.literal("exit_intent_popup"), v.literal("blog_signup"), v.literal("social_cta"), v.literal("onboarding"))),
        search: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        let leads = await ctx.db.query("emailLeads").order("desc").collect();
        if (args.status) leads = leads.filter(l => l.status === args.status);
        if (args.source) leads = leads.filter(l => l.source === args.source);
        if (args.search) {
            const q = args.search.toLowerCase();
            leads = leads.filter(l => l.email.toLowerCase().includes(q));
        }

        const { cursor, numItems } = args.paginationOpts;
        const start = cursor ? parseInt(cursor, 10) : 0;
        const page = leads.slice(start, start + numItems);
        const nextCursor = start + page.length < leads.length ? String(start + page.length) : null;

        return { page, continueCursor: nextCursor ?? "", isDone: !nextCursor };
    },
});
```

#### `getStats`

```typescript
export const getStats = query({
    args: {},
    handler: async (ctx) => {
        const now = Date.now();
        const dayAgo = now - 24 * 60 * 60 * 1000;
        const weekAgo = now - 7 * 24 * 60 * 60 * 1000;

        const allDeliveries = await ctx.db.query("emailDeliveries").collect();

        const dayDeliveries = allDeliveries.filter(d => (d.sentAt ?? 0) >= dayAgo);
        const weekDeliveries = allDeliveries.filter(d => (d.sentAt ?? 0) >= weekAgo);

        const sent24h = dayDeliveries.filter(d => d.status === "sent" || d.status === "delivered" || d.status === "opened" || d.status === "clicked").length;
        const bounced24h = dayDeliveries.filter(d => d.status === "bounced").length;
        const failed24h = dayDeliveries.filter(d => d.status === "failed").length;

        const sent7d = weekDeliveries.filter(d => d.status === "sent" || d.status === "delivered" || d.status === "opened" || d.status === "clicked").length;
        const opened7d = weekDeliveries.filter(d => d.status === "opened" || d.status === "clicked").length;
        const openRate7d = sent7d > 0 ? (opened7d / sent7d) * 100 : 0;

        return {
            totalDeliveries: allDeliveries.length,
            sent24h,
            bounced24h,
            failed24h,
            openRate7d: Math.round(openRate7d * 10) / 10,
        };
    },
});
```

### Mutations

#### `createCampaign`

```typescript
export const createCampaign = mutation({
    args: {
        name: v.string(),
        type: v.union(v.literal("welcome_series"), v.literal("daily_horoscope"), v.literal("weekly_cosmic"), v.literal("monthly_roundup"), v.literal("reengagement"), v.literal("one_off")),
        subject: v.string(),
        htmlContent: v.optional(v.string()),
        reactEmailTemplate: v.optional(v.string()),
        campaignData: v.optional(v.string()), // JSON string
        targetType: v.union(v.literal("all_users"), v.literal("by_tier"), v.literal("by_engagement"), v.literal("by_email_status"), v.literal("by_segment"), v.literal("specific_emails")),
        targetFilter: v.optional(v.string()),
        targetEmails: v.optional(v.array(v.string())),
        channel: v.union(v.literal("transactional"), v.literal("marketing")),
        scheduledAt: v.number(), // Unix ms
        status: v.union(v.literal("draft"), v.literal("scheduled")),
    },
    handler: async (ctx, args) => {
        const admin = await ctx.db.get(ctx.userId);
        if (!admin || admin.role !== "admin") throw new Error("Unauthorized");

        const campaignId = await ctx.db.insert("emailCampaigns", {
            name: args.name,
            type: args.type,
            status: args.status,
            subject: args.subject,
            templateId: args.reactEmailTemplate ?? "custom",
            segment: args.targetType, // Re-use existing field as target type
            schedule: {
                hourUTC: new Date(args.scheduledAt).getUTCHours(),
                minuteUTC: new Date(args.scheduledAt).getUTCMinutes(),
            },
            createdBy: ctx.userId,
            createdAt: Date.now(),
            updatedAt: Date.now(),
            // Expanded fields:
            htmlContent: args.htmlContent,
            reactEmailTemplate: args.reactEmailTemplate,
            campaignData: args.campaignData,
            targetType: args.targetType,
            targetFilter: args.targetFilter,
            targetEmails: args.targetEmails,
            sentBy: args.status === "scheduled" ? ctx.userId : undefined,
        });

        return { campaignId };
    },
});
```

**Note**: The schema has `templateId` as a required `v.string()`. Set it to the React Email template name or `"custom"`. The `segment` field is a string — repurpose it to store the `targetType` value.

#### `updateCampaign`

Only allowed for `draft` or `scheduled` campaigns. `sending`/`sent`/`completed` are immutable.

```typescript
export const updateCampaign = mutation({
    args: {
        campaignId: v.id("emailCampaigns"),
        name: v.optional(v.string()),
        subject: v.optional(v.string()),
        htmlContent: v.optional(v.string()),
        scheduledAt: v.optional(v.number()),
        status: v.optional(v.union(v.literal("draft"), v.literal("scheduled"))),
    },
    handler: async (ctx, args) => {
        const admin = await ctx.db.get(ctx.userId);
        if (!admin || admin.role !== "admin") throw new Error("Unauthorized");

        const campaign = await ctx.db.get(args.campaignId);
        if (!campaign) throw new Error("Campaign not found");
        if (campaign.status !== "draft" && campaign.status !== "scheduled") {
            throw new Error("Cannot edit a campaign that is already sending or sent");
        }

        const patch: any = { updatedAt: Date.now() };
        if (args.name) patch.name = args.name;
        if (args.subject) patch.subject = args.subject;
        if (args.htmlContent !== undefined) patch.htmlContent = args.htmlContent;
        if (args.scheduledAt) {
            patch.schedule = {
                hourUTC: new Date(args.scheduledAt).getUTCHours(),
                minuteUTC: new Date(args.scheduledAt).getUTCMinutes(),
            };
        }
        if (args.status) patch.status = args.status;

        await ctx.db.patch(args.campaignId, patch);
        return { success: true };
    },
});
```

#### `sendCampaignNow`
Immediately trigger a draft or scheduled campaign.

```typescript
export const sendCampaignNow = mutation({
    args: { campaignId: v.id("emailCampaigns") },
    handler: async (ctx, args) => {
        const admin = await ctx.db.get(ctx.userId);
        if (!admin || admin.role !== "admin") throw new Error("Unauthorized");

        const campaign = await ctx.db.get(args.campaignId);
        if (!campaign) throw new Error("Campaign not found");
        if (campaign.status !== "draft" && campaign.status !== "scheduled") {
            throw new Error("Campaign must be draft or scheduled to send");
        }

        // Lock the campaign
        await ctx.db.patch(args.campaignId, { status: "sending" });

        // Schedule the actual delivery action immediately
        await ctx.scheduler.runAfter(0, internal.emails.admin.deliverCampaign, {
            campaignId: args.campaignId,
        });

        return { success: true };
    },
});
```

#### `deliverCampaign` (Internal Action)
The actual fan-out delivery logic. This is an **action** because it calls `ctx.runAction(internal.email.sender.sendEmail, ...)`.

```typescript
export const deliverCampaign = internalAction({
    args: { campaignId: v.id("emailCampaigns") },
    handler: async (ctx, args) => {
        const campaign = await ctx.runQuery(internal.emails.admin.getCampaign, {
            campaignId: args.campaignId,
        });
        if (!campaign || campaign.status !== "sending") return;

        // Resolve recipients
        let recipients: { userId?: string; email: string }[] = [];

        // This requires internal queries — use ctx.runQuery
        // Implementation detail: create internalQuery helpers for each targetType

        // For each recipient:
        // 1. Render email HTML (if reactEmailTemplate) or use htmlContent
        // 2. Call ctx.runAction(internal.email.sender.sendEmail, ...)
        // 3. Record delivery in emailDeliveries
        // 4. Track stats

        // After all sends:
        await ctx.runMutation(internal.emails.admin.finalizeCampaign, {
            campaignId: args.campaignId,
            sentCount: recipients.length,
        });
    },
});
```

**Important**: The full `deliverCampaign` implementation is complex (template rendering, recipient resolution, error handling, batching). The implementing agent should model it after `convex/email/crons.ts` `sendReengagementEmails` but with campaign-driven configuration. Document the full implementation in the code, not just the stub above.

#### `sendManualEmail`
Send a one-off email to one or more specific users.

```typescript
export const sendManualEmail = mutation({
    args: {
        to: v.array(v.string()),           // Email addresses
        subject: v.string(),
        html: v.string(),
        text: v.optional(v.string()),
        channel: v.union(v.literal("transactional"), v.literal("marketing")),
        userIds: v.optional(v.array(v.id("users"))), // For recording deliveries
    },
    handler: async (ctx, args) => {
        const admin = await ctx.db.get(ctx.userId);
        if (!admin || admin.role !== "admin") throw new Error("Unauthorized");

        // Note: This mutation cannot call ctx.runAction directly.
        // It must schedule an action via ctx.scheduler.runAfter.
        const jobId = await ctx.scheduler.runAfter(0, internal.emails.admin.deliverManualEmails, {
            to: args.to,
            subject: args.subject,
            html: args.html,
            text: args.text,
            channel: args.channel,
            userIds: args.userIds,
            sentBy: ctx.userId,
        });

        return { jobId };
    },
});
```

#### `deliverManualEmails` (Internal Action)

```typescript
export const deliverManualEmails = internalAction({
    args: {
        to: v.array(v.string()),
        subject: v.string(),
        html: v.string(),
        text: v.optional(v.string()),
        channel: v.union(v.literal("transactional"), v.literal("marketing")),
        userIds: v.optional(v.array(v.id("users"))),
        sentBy: v.id("users"),
    },
    handler: async (ctx, args) => {
        for (let i = 0; i < args.to.length; i++) {
            const email = args.to[i];
            const userId = args.userIds?.[i];

            try {
                const result = await ctx.runAction(internal.email.sender.sendEmail, {
                    to: email,
                    subject: args.subject,
                    html: args.html,
                    text: args.text,
                    channel: args.channel,
                });

                await ctx.runMutation(internal.email.crons.recordDelivery, {
                    userId,
                    email,
                    messageId: result.messageId,
                    status: "sent",
                    sentAt: Date.now(),
                });
            } catch (err: any) {
                await ctx.runMutation(internal.email.crons.recordDelivery, {
                    userId,
                    email,
                    status: "failed",
                    sentAt: Date.now(),
                });
                console.error(`[Manual email] Failed to ${email}:`, err.message);
            }
        }
    },
});
```

### Actions

#### `testSmtp`
Test both SMTP transporters and return health status.

```typescript
export const testSmtp = action({
    args: {},
    handler: async (ctx) => {
        // We cannot import nodemailer here (not "use node").
        // We must call an internal "use node" action.
        // Re-use or create: internal.email.sender.testTransporters

        // For MVP: simply send a test email through each channel
        // and report success/failure.

        const admin = await ctx.runQuery(internal.users.current);
        if (!admin || admin.role !== "admin") throw new Error("Unauthorized");

        const testEmail = admin.email ?? "badjarovv@gmail.com";
        const results = { auth: false, oracle: false, errors: [] as string[] };

        try {
            await ctx.runAction(internal.email.sender.sendEmail, {
                to: testEmail,
                subject: "[SMTP Test] auth@stars.guide",
                html: "<p>This is a test email from auth@stars.guide. If you received it, the transactional SMTP channel is healthy.</p>",
                channel: "transactional",
            });
            results.auth = true;
        } catch (err: any) {
            results.errors.push(`auth: ${err.message}`);
        }

        try {
            await ctx.runAction(internal.email.sender.sendEmail, {
                to: testEmail,
                subject: "[SMTP Test] oracle@stars.guide",
                html: "<p>This is a test email from oracle@stars.guide. If you received it, the marketing SMTP channel is healthy.</p>",
                channel: "marketing",
            });
            results.oracle = true;
        } catch (err: any) {
            results.errors.push(`oracle: ${err.message}`);
        }

        return results;
    },
});
```

---

## 3. `convex/users/activity.ts` — Activity Tracking

### Mutation: `trackActivity`

Call this from frontend or other mutations whenever a user does something meaningful.

```typescript
export const trackActivity = mutation({
    args: {
        userId: v.id("users"),
        eventType: v.union(v.literal("login"), v.literal("page_view"), v.literal("oracle_session"), v.literal("journal_entry"), v.literal("horoscope_view")),
    },
    handler: async (ctx, args) => {
        await ctx.db.patch(args.userId, {
            lastActiveAt: Date.now(),
        });
    },
});
```

**Integration points**:
- Call `trackActivity` on every page load (via a lightweight `useEffect` in the app shell)
- Call `trackActivity({ eventType: "login" })` after successful auth
- Call `trackActivity({ eventType: "oracle_session" })` when a new oracle message is sent
- Call `trackActivity({ eventType: "journal_entry" })` when a journal entry is created

---

## 4. Updated Cron Jobs

See `06_CRON_AND_AUTOMATION.md` for the full cron specification.

---

## Auth Guard Pattern

Every admin mutation/query must verify the caller is an admin:

```typescript
const admin = await ctx.db.get(ctx.userId);
if (!admin || admin.role !== "admin") throw new Error("Unauthorized");
```

For **queries**, `ctx.userId` may not be available. Use a pattern like:

```typescript
// In query:
const identity = await ctx.auth.getUserIdentity();
if (!identity) throw new Error("Not authenticated");
const user = await ctx.db.query("users")
    .withIndex("by_email", q => q.eq("email", identity.email))
    .first();
if (!user || user.role !== "admin") throw new Error("Unauthorized");
```

**Note**: The existing admin layout already guards at the UI level (`role !== "admin"` → redirect). The backend guards are defense-in-depth.
