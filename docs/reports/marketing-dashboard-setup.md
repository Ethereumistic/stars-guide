# Wave 1 Marketing Dashboard — Setup Guide

> **Status:** Ready to configure
> **Last updated:** 2026-05-25
> **Owner:** echoray.io / stars.guide

This document covers how to set up and maintain the Wave 1 marketing dashboard.
The tracking infrastructure is built into Convex (`convex/analytics.ts`). This doc
covers the reporting layer: Google Sheets / Notion setup.

---

## Tracking Architecture

```
User lands on page
  → AnalyticsProvider reads UTM params from URL
  → recordUtmEvent() → utm_events table (first-touch)
  → recordSessionStart() → feature_events table
  → Session heartbeat every 30s via recordFeatureEvent()

User completes signup
  → trackSignupComplete() called from reveal-step.tsx
  → signup_completed event → feature_events
  → linkUtmToUser() backfills userId onto utm_events row

Daily cron (03:00 UTC)
  → aggregateDailyActivity() upserts user_activity rows for all active users

Daily cron (after aggregation)
  → detectAnomalies() compares today vs 7-day avg
  → Sends admin notification if spike (>3x) or drop (<30%)

Dashboard query
  → dashboardSnapshot() returns all KPIs for a date range
```

---

## Dashboard Setup Options

### Option A: Google Sheets (Recommended for Manual Editing)

Create a new Google Sheet called **stars.guide — Wave 1 Dashboard** and use
`/docs/reports/` as the import source.

**Sheet 1: Daily Signups**
| Date | Total | Google | Facebook | Instagram | Twitter | Reddit | Direct |
|------|-------|--------|----------|----------|---------|--------|--------|
| 2026-05-19 | 14 | 6 | 2 | 3 | 1 | 1 | 1 |

**Formula to pull from Convex (via Apps Script):**
```javascript
// In your Google Sheet, go Extensions → Apps Script
// Paste this function and run pullDashboard() to update from Convex API

const CONVEX_SITE = "https://stars.guide"; // or your Convex deployment URL

function pullDashboard() {
  const today = new Date().toISOString().slice(0, 10);
  const weekAgo = new Date(Date.now() - 7 * 86400_000).toISOString().slice(0, 10);

  const url = `${CONVEX_SITE}/api/dashboard/snapshot?start=${weekAgo}&end=${today}`;

  const response = UrlFetchApp.fetch(url, {
    method: "GET",
    headers: { "Content-Type": "application/json" }
  });

  const data = JSON.parse(response.getContentText());
  console.log(JSON.stringify(data, null, 2));
  // Parse and write to sheet...
}
```

> **Note:** The Convex HTTP API (`convex/http.ts`) needs a new endpoint to serve
> `dashboardSnapshot` as a REST endpoint. See **HTTP Endpoint** section below.

---

### Option B: Notion Database

Create a Notion database called **Wave 1 Metrics** with these properties:

| Property | Type | Notes |
|----------|------|-------|
| Date | Date | Primary filter |
| Signups | Number | Total |
| WAU | Number | Weekly active users |
| Referrals Completed | Number | |
| Referrals Pending | Number | |
| Top Channel | Text | UTM source with most signups |
| Notes | Text | Any anomalies / context |

Link the database to the Weekly Report template (`/docs/reports/weekly-report-template.md`).

---

### Option C: Direct Convex Query (No Middleman)

Query `api.analytics.dashboardSnapshot` directly from any React component
and render it in a private `/admin/dashboard` route.

```typescript
// Example: admin/dashboard/page.tsx
"use client";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";

function getDateRange() {
  const end = new Date();
  const start = new Date(Date.now() - 7 * 86400_000);
  return {
    startDate: start.toISOString().slice(0, 10),
    endDate: end.toISOString().slice(0, 10),
  };
}

export default function AdminDashboard() {
  const { startDate, endDate } = getDateRange();
  const data = useQuery(api.analytics.dashboardSnapshot, { startDate, endDate });

  if (!data) return <div>Loading...</div>;

  return (
    <div>
      <h1>Wave 1 Dashboard</h1>
      <p>Signups: {data.signups.total}</p>
      <p>WAU: {data.wau}</p>
      <pre>{JSON.stringify(data, null, 2)}</pre>
    </div>
  );
}
```

---

## Required Convex HTTP Endpoint

Add this to `convex/http.ts` to expose dashboard data to Google Sheets / external tools:

```typescript
// convex/http.ts — add this handler

import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";

const http = httpRouter();

http.action("GET", "/api/dashboard/snapshot", async (ctx, request) => {
  const url = new URL(request.url);
  const startDate = url.searchParams.get("start") ?? "";
  const endDate = url.searchParams.get("end") ?? "";

  const data = await ctx.runQuery(internal.analytics.dashboardSnapshotQuery, {
    startDate,
    endDate,
  });

  return new Response(JSON.stringify(data), {
    headers: { "Content-Type": "application/json" },
  });
});

export default http;
```

> **Note:** `dashboardSnapshot` in `analytics.ts` is a `query`, not `internalQuery`.
> For the HTTP action to call it, either (a) make it an `internalQuery`, or (b) expose
> a public query that wraps it. Recommended: use `internalQuery` for internal use and
> a public wrapper for external HTTP access.

---

## Channel-Specific UTM Values

Standardize these across all marketing channels before launch:

| Channel | utm_source | utm_medium | Example URL |
|---------|------------|------------|-------------|
| Google Search | google | cpc | `https://stars.guide/?utm_source=google&utm_medium=cpc&utm_campaign=wave1_aries` |
| Facebook | facebook | social | `https://stars.guide/?utm_source=facebook&utm_medium=social&utm_campaign=wave1_launch` |
| Instagram | instagram | social | `https://stars.guide/?utm_source=instagram&utm_medium=social&utm_campaign=wave1_launch` |
| Twitter/X | twitter | social | `https://stars.guide/?utm_source=twitter&utm_medium=social&utm_campaign=wave1_launch` |
| Reddit | reddit | social | `https://stars.guide/?utm_source=reddit&utm_medium=social&utm_campaign=wave1_astro` |
| Email newsletter | mailchimp | email | `https://stars.guide/?utm_source=mailchimp&utm_medium=email&utm_campaign=weekly_horoscope` |
| Podcast | podcast | referral | `https://stars.guide/?utm_source=podcast_name&utm_medium=referral&utm_campaign=wave1` |
| Affiliate | affiliate | referral | `https://stars.guide/?utm_source=affiliate_name&utm_medium=referral&utm_campaign=wave1` |
| Direct | (none) | direct | `https://stars.guide/` (no UTM params) |
| Organic | (none) | organic | `https://stars.guide/` (no UTM, no referrer) |

---

## KPI Categories (from Wave 1 KPI Framework)

The dashboard must track 6 categories:

1. **Acquisition** — Signups by channel, UTM source, top traffic sources
2. **Activation** — Onboarding completion rate, time-to-first-chart, first feature used
3. **Engagement** — DAU/WAU, session duration, pages/session, top features
4. **Referral & Community** — Referral program stats, Discord members, Reddit karma
5. **Revenue** — Free/Popular/Premium breakdown, upgrade rate, MRR
6. **Retention** — 7-day retention, 30-day retention, churn signals

---

## Social Media Metrics (Manual Entry)

These require manual entry until native APIs are integrated:

| Platform | Metric | Where to Find | Update Frequency |
|----------|--------|---------------|-----------------|
| Twitter/X | Follower count | twitter.com/starsguide | Weekly |
| Twitter/X | Tweet engagement | analytics.twitter.com | Weekly |
| Instagram | Follower count | instagram.com/starsguide | Weekly |
| Instagram | Story/reel views | Instagram Insights | Weekly |
| Discord | Member count | discord.com/server | Weekly |
| Reddit | Karma score | reddit.com/u/starsguide | Weekly |
| Facebook | Page likes | facebook.com/starsguide | Weekly |

Add a **Social Metrics** tab to the Google Sheet and update weekly.

---

## Auto-Tagging

### Google Ads
Use ValueTrack parameters: `?utm_source=google&utm_medium=cpc&utm_campaign={campaignid}&utm_term={keyword}`

### Mailchimp
Add UTM params to all campaign URLs via Mailchimp's **Campaign URL** field.

### Linktree / Bio Links
Use `https://stars.guide/?utm_source=linktree&utm_medium=bio&utm_campaign=wave1`

### Podcast Show Notes
Append `?utm_source=podcast&utm_medium=referral&utm_campaign=<episode_name>` to all links.

---

## Verification Checklist

Before going live:

- [ ] All marketing links have UTM params (utm_source, utm_medium, utm_campaign minimum)
- [ ] Google Sheets / Notion dashboard is set up with all 6 KPI categories
- [ ] Social media metrics tab is set up for manual weekly entry
- [ ] Convex `dashboardSnapshot` query returns data (test with `pnpm convex run` or dashboard)
- [ ] Alert system verified: trigger a test signup and confirm feature_events row is created
- [ ] Referral tracking confirmed: create a test referral link, click it, sign up, verify utm_events row is backfilled with userId
- [ ] Weekly report template is linked in Notion or saved to `/docs/reports/`
