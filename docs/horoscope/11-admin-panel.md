# Admin Panel — Horoscope Management Dashboard

Source: `src/app/admin/horoscope/page.tsx`, `convex/horoscopes/admin.ts`

## Admin Pages

### 1. Horoscope Dashboard (`/admin/horoscope`)

Main management interface for daily horoscopes.

#### Controls Bar

| Control | Action | Convex Function |
|---------|--------|-----------------|
| Date picker | Select target date (defaults to today UTC) | Sets query param |
| Generate All 12 / Generate N | Trigger horoscope generation | `triggerDailyGeneration` or `triggerGenerationForSigns` |
| Recompute Context | Rebuild daily astrology context | `recomputeAstrologyContext` |
| Override | Manually set horoscope content | `overrideHoroscope` (mutation) |
| Select All / None | Toggle sign checkboxes for selective generation | UI state only |

#### Sign Grid

12 cards in a responsive grid (1–6 columns). Each card shows:

- **Element color accent** — colored line at top based on sign's element
- **Checkbox** — for multi-select generation
- **Zodiac icon** — from `zodiacUIConfig`
- **Sign name** — "Aries", "Taurus", etc.
- **Status icon** — ✓ generated, ✗ failed, ⏳ pending, ✎ overridden, ⚠ missing
- **Meta badges** — generation time, duration (seconds), model name

#### Summary Bar

Aggregated counts across all 12 signs:
- Generated count (green checkmark)
- Pending count (pulsing clock)
- Failed count (red X) — only shown if > 0
- Overridden count (amber pencil) — only shown if > 0
- Missing/not queued — greyed warning

#### Failed Generations Panel

If any horoscopes have `status: "failed"`, a red-highlighted section lists them
with the sign, date, error message (truncated), and a "Retry" button.

**Retry action:** Calls `retryFailedGeneration` which:
1. Verifies admin auth
2. Resets the record status to `"pending"`
3. Schedules `generateForSign` via `ctx.scheduler.runAfter(0, ...)`

#### Detail Dialog

Clicking a sign card opens a dialog showing the full horoscope record:

- Status badge (generated/failed/pending/overridden)
- Model used
- Generation timestamp + duration
- Content fields (v2: hook, bodyText, mantra, dailyPillars, domainScores)
- v1 fallback: insight, energy, navigate, cosmicDetails
- Error messages (if failed)

#### Override Dialog

Form to manually set horoscope content:

| Field | Input | Constraints |
|-------|-------|-------------|
| Date | Date input | "YYYY-MM-DD" |
| Sign | Select dropdown | 12 canonical signs |
| Hook | Textarea | 15-60 chars |
| Body Text | Textarea | 2-3 sentences, 100-390 chars |
| Mantra | Input | ≤12 words, first-person |
| Vibe | Input | 2-3 words |
| Power Move | Input | 2-5 words |
| Blind Spot | Input | 2-6 words |
| Lucky Spark | Input | 2-5 words |
| Domain Scores | Textarea | JSON array (optional) |

Saves via `overrideHoroscope` mutation → `status: "overridden"`.

---

### 2. Context Viewer (`/admin/horoscope/context`)

Source: `src/app/admin/horoscope/context/page.tsx`

Inspects the enriched `daily_astrology_context` for a given date.

#### Features

- **Date picker** + **Recompute Context** button
- **Meta badges** — generation timestamp, dominant element icon, stellium sign
- **Energy Signature card** — displays the full token string

#### Collapsible Sections

| Section | Content | Default |
|---------|---------|---------|
| Moon Phase | Phase name + emoji, illumination %, VoC window, next ingress | Open |
| Planet Positions | Grid of planet → sign (degree) with retrograde ℞ badge | Open |
| Active Aspects | Badges showing planetA aspect planetB (orb), color-coded by influence | Closed |
| Retrograde Context | 3 sub-sections: current/upcoming/recentDirect | Closed |
| Dominant Themes | Badge list of theme keywords | Closed |
| Aspect Summary | Badge list of pattern descriptors | Closed |

Aspect influence colors:
- Harmonious → green/emerald
- Challenging → red
- Dynamic → amber

---

## Admin Auth

All admin endpoints use `requireAdmin(ctx)` which checks:
1. Authenticated via `getAuthUserId(ctx)`
2. User record has `role === "admin"`

Actions that need auth verification call `internal.horoscopes.helpers._checkAdmin`
via `ctx.runQuery()` since actions don't have direct `ctx.db` access.

## Admin API Summary

| Function | Type | Purpose |
|----------|------|---------|
| `listHoroscopesForDate` | query | All 12 signs for date, optional status filter |
| `getAstrologyContext` | query | Fetch daily_astrology_context record |
| `getFailedGenerations` | query | List all failed horoscopes (optional date filter) |
| `overrideHoroscope` | mutation | Manually replace horoscope content |
| `retryFailedGeneration` | action | Reset to pending + re-trigger generation |
| `recomputeAstrologyContext` | action | Trigger computeDailyContext |
| `triggerDailyGeneration` | action | Compute context + queue all 12 signs |
| `triggerGenerationForSigns` | action | Compute context + queue selected signs |