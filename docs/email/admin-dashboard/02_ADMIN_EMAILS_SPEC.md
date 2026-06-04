# `/admin/emails` — Email Operations Dashboard

> **Scope**: Full operational control over the email infrastructure: campaign management, delivery tracking, SMTP health, template preview, lead subscribers, and manual one-off sends.  
> **Pattern Reference**: `/admin/notifications/page.tsx` (stats cards + campaign list + compose dialog + analytics).

---

## Routes

| Route | Purpose |
|-------|---------|
| `/admin/emails` | Overview — campaigns, deliveries, SMTP health, quick actions |
| `/admin/emails/campaigns` | Campaign list + create/edit (merges with `/admin/emails` as default tab) |
| `/admin/emails/deliveries` | Delivery log — all emails sent, filterable by status, user, campaign |
| `/admin/emails/leads` | Email lead subscriber management (`emailLeads` table) |
| `/admin/emails/templates` | Preview React Email templates, test-send templates |
| `/admin/emails/analytics` | Aggregated email analytics (open rates, bounce rates, etc.) |

---

## Page 1: `/admin/emails` — Overview (Tabbed Interface)

Use a tabbed layout (shadcn `Tabs`) with 5 tabs:

```
[📊 Overview] [📤 Campaigns] [📬 Deliveries] [👥 Leads] [🎨 Templates]
```

### Tab: Overview

#### Header
```
[Mail icon]  Email Operations          [Test SMTP] [Send Test Email]
             12,847 total deliveries
```

#### Stats Cards (4-column grid)

| Card | Value | Color |
|------|-------|-------|
| Total Deliveries | Count from `emailDeliveries` | White |
| Sent (24h) | Count where `sentAt > now - 24h` AND `status === "sent"` | Emerald |
| Bounced (24h) | Count where `status === "bounced"` in last 24h | Red |
| Open Rate (7d) | `openedCount / sentCount` for last 7 days | Amber |

#### SMTP Health Monitor

A small card showing real-time SMTP connectivity:

```
┌─────────────────────────────────────┐
│  SMTP Health                        │
│                                     │
│  ✅ auth@stars.guide               │
│     Connected · 587 · STARTTLS     │
│     Last test: 2 min ago            │
│                                     │
│  ✅ oracle@stars.guide             │
│     Connected · 587 · STARTTLS     │
│     Last test: 2 min ago            │
│                                     │
│  [Test Both] [View Logs]            │
└─────────────────────────────────────┘
```

- **Test Both** button → calls `api.emails.admin.testSmtp` action which sends a test email through both transporters to `badjarovv@gmail.com` (or admin email) and reports success/failure.
- Connection status is NOT persistent — it is computed on-demand when the admin opens the page or clicks Test.

#### Recent Campaigns (last 5)

Mini list of most recent `emailCampaigns` rows with status badges.
"View all →" link goes to Campaigns tab.

#### Recent Failed Deliveries (last 5)

Mini list of `emailDeliveries` with `status === "failed"` or `"bounced"` in the last 24h.
Shows: recipient email, campaign name (if any), error reason, timestamp.
"View all →" link goes to Deliveries tab.

---

### Tab: Campaigns

**This is the heavy-lifting tab.**

#### Campaign List

Same list pattern as `/admin/notifications` but for email campaigns.

Columns per campaign row:
- Name + status badge (`draft`, `scheduled`, `active`, `paused`, `completed`, `sending`)
- Type badge (`welcome_series`, `daily_horoscope`, `weekly_cosmic`, `monthly_roundup`, `reengagement`, `one_off`)
- Subject line (truncated)
- Segment/target (e.g. "All users", "Free tier", "Dormant")
- Schedule (e.g. "Daily 06:00 UTC", "One-off")
- Stats: sent count, open count, click count, bounce count
- Actions: Edit · Send Now (if draft) · Pause (if active) · Resume · Duplicate · Delete

#### Create Campaign Dialog

Form fields:
- **Campaign Name**: admin-facing (e.g. "June Re-engagement Blast")
- **Type**: select — `one_off`, `welcome_series`, `reengagement`, `custom`
- **Subject**: text input
- **Template**: select from existing React Email components + "Custom HTML"
  - If a named template is selected (e.g. `ReengagementEmail`), pre-fill the subject and show a "Preview" button
  - If "Custom HTML", show a textarea for raw HTML
- **Target Audience**:
  - `all_users_with_email`
  - `by_tier` → select tier
  - `by_engagement` → select `new` / `active` / `dormant` / `churned`
  - `by_email_status` → select `active` / `bounced` / `unsubscribed`
  - `by_segment` → select from `emailSegments`
  - `specific_users` → textarea for comma-separated emails (advanced)
- **Schedule**:
  - `send_now` — immediate (uses `ctx.scheduler.runAfter(0, ...)`)
  - `scheduled` — date + time picker + timezone (default UTC)
- **From Channel**: `transactional` (auth@) or `marketing` (oracle@)

**Preview Button**:
- Renders the selected template with dummy data via `@react-email/render` (client-side, or server action if client bundle is too heavy)
- Opens a modal with the rendered HTML in an iframe

**Save Draft / Schedule / Send Now** buttons.

---

### Tab: Deliveries

#### Delivery Log Table

A filterable, paginated table of every row in `emailDeliveries`.

Columns:
- Recipient (email, click to go to user profile if `userId` exists)
- Campaign (name, or "Manual" / "Transactional" if no campaign)
- Subject (if stored — see schema note)
- Channel badge (`transactional` = blue, `marketing` = purple)
- Status badge with dot color:
  - `sent` → blue dot
  - `delivered` → emerald dot
  - `opened` → amber dot
  - `clicked` → galactic dot
  - `bounced` → red dot
  - `failed` → red dot
  - `unsubscribed` → slate dot
- Sent At (relative time)
- Opened At (if applicable)
- Actions: [View] → opens a detail drawer/modal with full email HTML preview

#### Filters

- Status multi-select: sent, delivered, opened, clicked, bounced, failed, unsubscribed
- Channel: transactional / marketing
- Date range: last 24h, 7d, 30d, custom
- Campaign: dropdown of all `emailCampaigns`
- Search by recipient email

#### Delivery Detail Modal

When clicking a delivery row:
- Full recipient email
- Message ID (monospace, copyable)
- Full status timeline: `queued → sent → delivered → opened → clicked`
- Timestamps for each stage
- Email HTML preview (iframe)
- Raw SMTP response (if stored)
- User link (if `userId`)
- Campaign link (if `campaignId`)

---

### Tab: Leads

Management of `emailLeads` table (non-registered subscribers).

#### Lead List Table

Columns:
- Email
- Status badge (`pending`, `active`, `unsubscribed`, `bounced`)
- Source badge (`exit_intent_popup`, `blog_signup`, `social_cta`, `onboarding`)
- Sign (if captured)
- Linked User (if `userId` exists — link to user profile)
- Opt-in date
- Confirmed date (if applicable)
- Actions: [View] · [Edit Status] · [Delete]

#### Filters
- Status
- Source
- Search by email

#### Bulk Actions
- Change status (active / unsubscribed / bounced)
- Export CSV
- Delete selected

---

### Tab: Templates

#### Template Gallery

Grid of all email templates from the `emails/` directory:

```
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│  Welcome        │  │  Daily          │  │  Weekly         │
│  Email          │  │  Horoscope      │  │  Cosmic         │
│                 │  │                 │  │                 │
│  [Preview]      │  │  [Preview]      │  │  [Preview]      │
│  [Test Send]    │  │  [Test Send]    │  │  [Test Send]    │
└─────────────────┘  └─────────────────┘  └─────────────────┘
```

Templates to show:
- `WelcomeEmail.tsx`
- `DailyHoroscopeEmail.tsx`
- `WeeklyCosmicEmail.tsx`
- `MonthlyRoundupEmail.tsx`
- `ReengagementEmail.tsx`

#### Preview
- Clicking [Preview] renders the template with dummy props via `@react-email/render`
- Opens a modal with the HTML in a 600px-wide preview pane (simulating email client width)

#### Test Send
- Clicking [Test Send] opens a mini-dialog:
  - To: default `badjarovv@gmail.com`, editable
  - Subject: pre-filled from template
  - [Send Test Email] button
- Calls the same `sendEmail` action with the rendered HTML

---

## Page 2: `/admin/emails/analytics` — Email Analytics (Optional, Phase 2)

A dedicated analytics page with charts (recharts or similar):

- **Delivery Volume Chart**: Daily sent/delivered/bounced counts over last 30 days
- **Open Rate Chart**: Daily open rate % over last 30 days
- **Click Rate Chart**: Daily click rate % over last 30 days
- **Bounce Rate Chart**: Daily bounce rate % over last 30 days
- **Top Campaigns Table**: Best performing campaigns by open rate
- **Domain Breakdown**: Pie chart of recipient email domains (gmail.com, abv.bg, etc.)

**Note**: This requires aggregate queries. For MVP, the Overview tab's stats cards are sufficient. Move this to Phase 2.

---

## Convex Queries Needed

| Query | Purpose |
|-------|---------|
| `emails.admin.listCampaigns` | All email campaigns with stats |
| `emails.admin.getCampaign` | Single campaign with full config |
| `emails.admin.listDeliveries` | Paginated delivery log with filters |
| `emails.admin.getDelivery` | Single delivery with full timeline |
| `emails.admin.listLeads` | Paginated email leads with filters |
| `emails.admin.getSmtpHealth` | On-demand SMTP connectivity test |
| `emails.admin.getStats` | Aggregated stats for overview cards |
| `emails.admin.getAnalytics` | Time-series data for charts (Phase 2) |

---

## Convex Mutations Needed

| Mutation | Purpose |
|----------|---------|
| `emails.admin.createCampaign` | Create new email campaign |
| `emails.admin.updateCampaign` | Edit campaign (draft/scheduled only) |
| `emails.admin.deleteCampaign` | Delete draft/cancelled campaign |
| `emails.admin.sendCampaignNow` | Immediately trigger a draft/scheduled campaign |
| `emails.admin.pauseCampaign` | Pause an active campaign |
| `emails.admin.resumeCampaign` | Resume a paused campaign |
| `emails.admin.sendManualEmail` | One-off email to specific user(s) |
| `emails.admin.updateLeadStatus` | Update `emailLeads.status` |
| `emails.admin.bulkUpdateLeads` | Bulk update lead statuses |
| `emails.admin.deleteLead` | Remove a lead |

---

## Edge Cases & Guardrails

1. **Campaigns with `status === "sending"` are locked** — cannot edit or delete while sending is in progress.
2. **Duplicate campaign names** — warn but allow (names are admin-facing only).
3. **Scheduled campaigns in the past** — show a warning badge: "Overdue — will send immediately if resumed."
4. **Test sends count toward delivery stats** — they are real emails. Do not create `emailCampaigns` entries for test sends; record them in `emailDeliveries` with `campaignId: null`.
5. **Template preview requires `@react-email/render`** — this is a server-side Node.js function. The preview must be rendered via a Convex action (or a Next.js API route) because the client bundle cannot run `@react-email/render`. Document this in `05_FRONTEND_COMPONENTS.md`.
6. **Custom HTML campaigns** — raw HTML is stored in the campaign doc. No React Email rendering needed at send time. Sanitize on input (DOMPurify or similar) to prevent XSS in the admin dashboard itself.
