# Review & Publish

**Route**: `/admin/horoscope/review`
**Backend file**: `convex/admin.ts` → `getHoroscopesByDate`, `publishHoroscopes`, `updateHoroscopeContent`, `deleteHoroscope`, `unublishHoroscope`
**Public API**: `convex/horoscopes.ts` → `getPublished`, `getWeekPublished`, `getAllSignsForDate`
**DB table**: `horoscopes`

## What It Does

The final gate before horoscopes reach users. Admin reviews generated content, edits inline if needed, and publishes. Only `status: "published"` horoscopes are served to the public.

## The Lifecycle

```
Generation writes horoscopes with status: "draft"
        │
        ▼
Review page shows drafts (and published) for a date range
        │
        ├── Edit content inline → resets to "draft" (forces re-review)
        ├── Delete → permanent removal
        └── Publish → status becomes "published"
                │
                ▼
        Public API serves only "published" horoscopes
        with paywall enforcement by user tier
```

## Paywall Rules (in `horoscopes.ts`)

| Tier | Access Window |
|---|---|
| `free` | Today only (`diff === 0`) |
| `popular` | Yesterday, today, tomorrow (`-1 ≤ diff ≤ 1`) |
| `premium` | All past + up to 7 days future (`diff ≤ 7`) |

When a horoscope is outside the user's tier window, the API returns:
```json
{ "isPaywalled": true, "requiredTier": "premium", "date": "...", "sign": "..." }
```
The frontend uses this to show the paywall UI.

## Review Page Features

**Date Range Picker**: selects which dates to fetch. Defaults to today through +6 days.

**Date Filter Dropdown**: narrows the view to a single date within the range.

**Two View Modes**:
- **Table View**: expandable rows with full content preview, inline editing, checkbox selection for bulk publish
- **Matrix View**: 12 signs × N dates grid showing status at a glance (🟢 published, 🟡 draft, 🔴 missing/failed)

**Inline Editing**: click the pencil icon → textarea replaces the read-only view → save calls `updateHoroscopeContent` which always resets status to `"draft"` (even if previously published). This is intentional — edited content must be re-reviewed.

**Bulk Publish**: select multiple drafts via checkboxes → "Publish (N)" button → calls `publishHoroscopes` with the array of IDs. Only drafts are published; already-published IDs are silently skipped.

**Character Count Guide**: 330-460 chars is the sweet spot. The UI shows a red badge and warning if content is outside this range, but it's not enforced — the admin decides.

**Coverage Matrix**: visual grid showing which sign×date combinations are missing or failed. Helps the admin identify gaps before going live.

## Upsert Logic (at generation time)

In `admin.ts` → `upsertHoroscopes`:
1. **Content identical** → skip (no write)
2. **Content different** → overwrite, reset status to `"draft"`
3. **No existing record** → insert as `"draft"`

This means re-generating for the same sign×date is safe. Previously published content gets reset to draft, forcing re-review.

## Data Model

```
horoscopes table:
  _id: Id
  sign: string              // "Aries" | "Taurus" | ... | "Pisces"
  targetDate: string        // "YYYY-MM-DD"
  content: string           // the horoscope copy (330-460 chars target)
  status: "draft" | "published" | "failed"
  zeitgeistId: Id("zeitgeists")
  generatedBy: Id("generationJobs") | null
```
Indexes:
- `by_sign_and_date` on `["sign", "targetDate"]` — primary lookup
- `by_status` on `["status"]`
- `by_date` on `["targetDate"]` — fetch all signs for a date

## Public API Endpoints

| Function | Args | Returns |
|---|---|---|
| `getPublished` | `sign, date` | Single horoscope or paywall object (tier-checked) |
| `getWeekPublished` | `sign, dates[]` | Array of published horoscopes for a sign across dates |
| `getAllSignsForDate` | `date` | All 12 published horoscopes for a single date |

All three only return `status: "published"` rows. Drafts and failed entries are invisible to the public.

## Things to Know

- There is no "unpublish" button in the current UI, but `unpublishHoroscope` exists in the backend (reverts to draft)
- Delete is permanent — no undo, no soft delete
- The review page fetches data per-date in a loop, which is O(N) queries for N dates. This is fine for typical ranges (1-7 days) but would be slow for large ranges
- Failed horoscopes (from generation errors) appear in the matrix view but have no content to review — they need to be regenerated from the Generation Desk
