# Journal System — Full Technical Explanation (v1)

> This document provides a complete technical explanation of the Journal system at stars.guide, covering the emotion capture model, database schema, entry CRUD, streak tracking, consent flow, voice/photo/location inputs, search/stats, prompt bank, calendar view, admin configuration, and the full integration with Oracle AI. Written against the current codebase state as of 2026-04-21.

---

## Table of Contents

1. [System Architecture Overview](#1-system-architecture-overview)
2. [Emotion Capture Model](#2-emotion-capture-model)
3. [Database Schema](#3-database-schema)
4. [Constants & Defaults](#4-constants--defaults)
5. [Astro Context Builder](#5-astro-context-builder)
6. [Entry CRUD Pipeline](#6-entry-crud-pipeline)
7. [Streak Tracking](#7-streak-tracking)
8. [Voice Input (Web Speech API)](#8-voice-input-web-speech-api)
9. [Photo Upload (Convex Storage)](#9-photo-upload-convex-storage)
10. [Location Tagging (Geolocation + Nominatim)](#10-location-tagging-geolocation--nominatim)
11. [Calendar View](#11-calendar-view)
12. [Search & Filtering](#12-search--filtering)
13. [Stats & Astro Correlations](#13-stats--astro-correlations)
14. [Daily Prompt Bank](#14-daily-prompt-bank)
15. [Oracle Consent Flow](#15-oracle-consent-flow)
16. [Oracle Context Assembly](#16-oracle-context-assembly)
17. [Oracle Pipeline Integration](#17-oracle-pipeline-integration)
18. [Cosmic Recall Feature](#18-cosmic-recall-feature)
19. [Oracle-Suggested Journal Prompts](#19-oracle-suggested-journal-prompts)
20. [Admin Configuration Surface](#20-admin-configuration-surface)
21. [User-Facing Flow (End-to-End Walkthrough)](#21-user-facing-flow-end-to-end-walkthrough)
22. [File Map](#22-file-map)
23. [Key Design Decisions & Trade-offs](#23-key-design-decisions--trade-offs)

---

## 1. System Architecture Overview

The Journal is a private, reflective journaling space that exists in symbiosis with Oracle AI. Every entry captures emotional state on a 2D mood model with clustered emotions, automatically correlates with astrological transits, and — with explicit user consent — feeds Oracle to give dramatically more personalized readings.

```
┌─────────────────────────────────────────────────────────────────────┐
│                        FRONTEND (Next.js)                           │
│                                                                     │
│  /journal               — Timeline view (default landing)           │
│  /journal/new           — Entry composer (4 entry types)           │
│  /journal/[entryId]     — Entry detail (read-only)                 │
│  /journal/[entryId]/edit — Entry editor (reuses composer)          │
│  /journal/calendar      — Month grid with mood dots + moon phases   │
│  /journal/search        — Full-text search with filters             │
│  /journal/stats         — Mood trends, emotion heatmaps, astro      │
│  /journal/settings      — Oracle consent toggle + granularity       │
│  /admin/journal         — Admin overview + link to settings          │
│  /admin/journal/settings — Tabbed admin (Limits/Features/Prompts/  │
│                             Oracle Integration)                     │
│                                                                     │
│  Zustand Store — use-journal-store.ts (composer state, search,      │
│                   voice state, active view)                         │
│  Voice Input  — voiceInput.ts (Web Speech API wrapper)              │
│  Location     — location.ts (geolocation + Nominatim)              │
└──────────────────────────┬──────────────────────────────────────────┘
                           │ Convex React hooks
┌──────────────────────────▼──────────────────────────────────────────┐
│                      BACKEND (Convex)                                │
│                                                                     │
│  journal/entries.ts    — Entry CRUD (create/read/update/delete)     │
│  journal/streaks.ts   — Streak tracking (consecutive day logic)     │
│  journal/astroContext.ts — Auto astro context at creation            │
│  journal/consent.ts   — Oracle access consent CRUD                  │
│  journal/context.ts   — [JOURNAL CONTEXT] block builder for Oracle   │
│  journal/search.ts    — Full-text search with filters               │
│  journal/stats.ts     — Aggregate statistics + astro correlations  │
│  journal/prompts.ts   — Daily prompt selection + admin CRUD         │
│  journal/settings.ts  — Admin settings CRUD                         │
│  journal/admin.ts     — Admin overview stats                         │
│  files.ts             — generateUploadUrl + getUrl for photos       │
│                                                                     │
│  Oracle Integration (modifications to existing files):               │
│  oracle/llm.ts        — Journal context assembly step                │
│  oracle/sessions.ts   — journalPrompt field on messages             │
└──────────────────────────────────────────────────────────────────────┘
```

Key architectural properties:
- **Emotion-first**: Every entry captures mood on a 2D valence×arousal grid and clustered emotions with intensity — far richer signal than a 1-5 rating
- **Astro-auto**: Every entry automatically gets the sky attached at creation time — zero user effort
- **Consent-gated**: Oracle can only read journal entries if the user explicitly grants access, with granular control
- **Zero external services**: Voice uses Web Speech API, location uses Nominatim (free, no key), everything else is Convex-native
- **Non-blocking integration**: If journal context assembly fails, Oracle proceeds without it

---

## 2. Emotion Capture Model

### The Problem with Simple Mood Scales

A 5-point linear scale (amazing → rough) forces humans into pre-defined boxes. Energy and valence are independent — you can be calm/content or anxious/excited. A flat list of emotions misses intensity, co-occurrence patterns, and the relational dimensions of real emotional experience.

### 2D Mood Grid (Valence × Arousal)

Based on the **Russell Circumplex Model of Affect** — the most widely validated dimensional model of emotion in psychology. Two continuous axes:

| Axis | Range | Meaning |
|------|-------|---------|
| Valence | -2 to +2 | Negative ←→ Positive |
| Arousal | -2 to +2 | Calm ←→ Activated |

From these two axes, a **mood zone** is derived for the quadrant the user lands in:

| Zone | Valence | Arousal | Emoji | Color |
|------|---------|---------|-------|-------|
| Excited | ≥ 0 | ≥ 0 | 🤩 | `#10b981` (emerald) |
| Content | ≥ 0 | < 0 | 😊 | `#22c55e` (green) |
| Tense | < 0 | ≥ 0 | 😤 | `#f97316` (orange) |
| Low | < 0 | < 0 | 😔 | `#ef4444` (red) |

**UI Interaction:** A 2D draggable pad (like a color picker XY pad). The user drags a glowing marker to mark where they are. The nearest mood zone label + emoji appears dynamically. This produces continuous data (e.g. valence=1.3, arousal=-0.7 = "Content" zone) rather than discrete buckets.

**Derivation function** (`src/lib/journal/constants.ts:deriveMoodZone`):
```typescript
if (valence >= 0 && arousal >= 0) return "excited";
if (valence >= 0 && arousal < 0) return "content";
if (valence < 0 && arousal >= 0) return "tense";
return "low";
```

### Clustered Emotions with Intensity

Emotions are grouped into 4 clusters that map to life domains. Each has a polarity (positive/negative/neutral) and an intensity level (1-3):

| Cluster | Emotions |
|---------|----------|
| Connection 💛 | Loved (+), Grateful (+), Lonely (-) |
| Energy ⚡ | Inspired (+), Excited (+), Restless (-), Numb (-) |
| Safety 🛡️ | Peaceful (+), Confident (+), Anxious (-), Overwhelmed (-) |
| Clarity 🔮 | Focused (+), Confused (-), Conflicted (neutral) |

Each selected emotion captures **what** (key) and **how much** (intensity: 1=mild, 2=moderate, 3=strong). Max 7 emotions per entry.

**UI Interaction:** Emotions displayed grouped by cluster with subtle headers. Tapping an emotion toggles it on — a 3-dot intensity selector appears (●○○ / ●●○ / ●●●). Default intensity on first tap: 2 (moderate).

### Why This Matters for Oracle

The 2D mood data lets Oracle distinguish between a user who is "low and exhausted" vs "tense and agitated" — leading to fundamentally different astrological interpretations and advice. Someone who is mildly anxious every day tells a completely different story than someone who is intensely anxious twice a week.

---

## 3. Database Schema

The Journal uses 5 Convex tables, plus modifications to the Oracle messages table:

### `journal_entries` (Table 16 — `convex/schema.ts:338-449`)

The core table. Every row is a single journal entry with full emotional, astrological, and contextual data:

| Field | Type | Purpose |
|-------|------|---------|
| `userId` | `id("users")` | Owner (indexed) |
| `title` | `optional(string)` | Optional title |
| `content` | `string` | Main body text (max 50,000 chars) |
| `entryType` | `"freeform" \| "checkin" \| "dream" \| "gratitude"` | Required |
| `mood` | `optional({ valence: number, arousal: number })` | 2D mood position |
| `moodZone` | `optional("excited" \| "content" \| "tense" \| "low")` | Derived from mood at creation |
| `emotions` | `optional(array({ key: string, intensity: 1\|2\|3 }))` | Max 7 |
| `energyLevel` | `optional(number)` | 1-5 physical energy (independent from arousal) |
| `timeOfDay` | `optional("morning"\|"midday"\|"evening"\|"night")` | Context marker |
| `astroContext` | `optional(object)` | Auto-attached at creation (see §5) |
| `voiceTranscript` | `optional(string)` | Raw STT transcript |
| `photoId` | `optional(id("_storage"))` | Convex storage reference |
| `photoCaption` | `optional(string)` | Photo caption |
| `location` | `optional({ lat, long, city?, country?, displayName? })` | Geolocation data |
| `tags` | `optional(array(string))` | Max 10 |
| `isPinned` | `optional(boolean)` | Pin to top of timeline |
| `dreamData` | `optional({ isLucid?, isRecurring?, dreamSigns?, emotionalTone? })` | Dream-specific |
| `gratitudeItems` | `optional(array(string))` | Max 5 |
| `oracleSessionId` | `optional(id("oracle_sessions"))` | Oracle session that inspired |
| `oracleInspired` | `optional(boolean)` | Was this entry suggested by Oracle? |
| `wordCount` | `optional(number)` | Computed at creation |
| `createdAt` | `number` | Timestamp |
| `updatedAt` | `number` | Timestamp |
| `entryDate` | `string` | "YYYY-MM-DD" for date-grouping |

**Indexes:**
- `by_user_date` — `[userId, entryDate]` — calendar view, daily grouping
- `by_user_created` — `[userId, createdAt]` — timeline query (newest first)
- `by_user_type` — `[userId, entryType]` — filter by type
- `by_user_pinned` — `[userId, isPinned]` — pinned entries
- `by_user_mood_zone` — `[userId, moodZone]` — filter by mood zone
- `by_oracle_session` — `[oracleSessionId]` — Oracle-to-Journal link
- `search_content` — full-text search on `content` with filters: `userId`, `entryType`, `moodZone`, `entryDate`

### `journal_streaks` (Table 17 — `convex/schema.ts:451-461`)

| Field | Type | Purpose |
|-------|------|---------|
| `userId` | `id("users")` | Indexed |
| `currentStreak` | `number` | Consecutive days |
| `longestStreak` | `number` | All-time record |
| `lastEntryDate` | `string` | "YYYY-MM-DD" |
| `totalEntries` | `number` | Total count |
| `updatedAt` | `number` | |

One row per user (created on first entry).

### `journal_consent` (Table 18 — `convex/schema.ts:462-479`)

| Field | Type | Purpose |
|-------|------|---------|
| `userId` | `id("users")` | Indexed |
| `oracleCanReadJournal` | `boolean` | Master consent toggle |
| `consentGivenAt` | `optional(number)` | When consent was granted |
| `consentRevokedAt` | `optional(number)` | When consent was revoked |
| `consentVersion` | `string` | "1.0" |
| `includeEntryContent` | `boolean` | Can Oracle read full text? |
| `includeMoodData` | `boolean` | Can Oracle read mood/emotions? |
| `includeDreamData` | `boolean` | Can Oracle read dream entries? |
| `lookbackDays` | `number` | 30/90/365/9999 |
| `updatedAt` | `number` | |

One row per user (created on first grant).

### `journal_prompt_bank` (Table 19 — `convex/schema.ts:480-507`)

| Field | Type | Purpose |
|-------|------|---------|
| `category` | `"daily"\|"moon"\|"retrograde"\|"seasonal"\|"gratitude"\|"dream"\|"relationship"\|"career"` | Prompt category |
| `moonPhase` | `optional(string)` | Only shown during this moon phase |
| `text` | `string` | The prompt text |
| `astrologyLevel` | `"none"\|"light"\|"medium"\|"deep"` | How much astro context is referenced |
| `isActive` | `boolean` | Toggle |
| `createdAt` | `number` | |
| `updatedAt` | `number` | |

**Indexes:** `by_category`, `by_moon_phase`, `by_active`

### `journal_settings` (Table 20 — `convex/schema.ts:508-525`)

Key-value configuration store, mirroring the `oracle_settings` pattern:

| Field | Type | Purpose |
|-------|------|---------|
| `key` | `string` | Unique identifier (indexed) |
| `value` | `string` | Always stored as string, parsed at app layer |
| `valueType` | `"string"\|"number"\|"boolean"\|"json"` | |
| `label` | `string` | Human-readable name |
| `description` | `optional(string)` | |
| `group` | `string` | `"limits" \| "features" \| "oracle_integration"` |
| `updatedAt` | `number` | |
| `updatedBy` | `optional(id("users"))` | |

### `oracle_messages` modification

Added `journalPrompt` field (`optional(string)`) to store journal prompt suggestions extracted from Oracle responses. See §19.

---

## 4. Constants & Defaults

All constants live in `src/lib/journal/constants.ts` (233 lines):

| Constant | Value | Purpose |
|----------|-------|---------|
| `ENTRY_TYPES` | `["freeform", "checkin", "dream", "gratitude"]` | All entry types |
| `MOOD_AXES` | `{ valence: [-2,2], arousal: [-2,2] }` | Mood grid bounds |
| `MOOD_ZONES` | 4 zones with emoji/color | Quadrant labels |
| `EMOTIONS` | 14 emotions across 4 clusters | Full emotion set |
| `JOURNAL_LIMITS.MAX_ENTRIES_PER_DAY` | 10 | Spam prevention |
| `JOURNAL_LIMITS.MAX_CONTENT_LENGTH` | 50,000 | Max chars per entry |
| `JOURNAL_LIMITS.MAX_TAGS_PER_ENTRY` | 10 | |
| `JOURNAL_LIMITS.MAX_EMOTIONS_PER_ENTRY` | 7 | |
| `JOURNAL_LIMITS.MAX_GRATITUDE_ITEMS` | 5 | |
| `JOURNAL_LIMITS.MAX_PHOTO_SIZE_BYTES` | 5,242,880 | 5 MB |
| `ORACLE_JOURNAL_CONTEXT.BUDGET_CHARS` | 4,000 | Max chars for journal context block |
| `ORACLE_JOURNAL_CONTEXT.MAX_ENTRY_CHARS` | 500 | Max chars per entry in context |
| `ORACLE_JOURNAL_CONTEXT.MAX_ENTRIES_IN_CONTEXT` | 10 | Max entries in Oracle prompt |
| `ORACLE_JOURNAL_CONTEXT.DEFAULT_LOOKBACK_DAYS` | 90 | Default lookback window |
| `CONSENT_VERSION` | "1.0" | Current consent version |
| `DREAM_EMOTIONAL_TONES` | 10 tones | eerie, joyful, confusing, etc. |
| `ENERGY_LEVELS` | 5 levels | Depleted → Charged |

---

## 5. Astro Context Builder

Every journal entry automatically gets the current sky attached at creation time. This is the key differentiator — every entry knows the moon phase, retrogrades, and active transits, at zero user cost.

**File:** `convex/journal/astroContext.ts` (129 lines)

**Function:** `buildAstroContext(ctx, userId)`

**Flow:**
1. Query `cosmicWeather` for today's date using the internal `getForDate` query
2. Extract `moonPhase.name` → `astroContext.moonPhase`
3. Find Moon's sign from `planetPositions` where `planet === "Moon"` → `astroContext.moonSign`
4. Find Sun's sign from `planetPositions` where `planet === "Sun"` → `astroContext.sunSign`
5. Filter `planetPositions` for `isRetrograde === true` → `astroContext.retrogradePlanets`
6. If user has `birthData.chart`, compute active transits:
   - Compare transiting planet signs to natal planet signs using sign-level aspect detection
   - Supported aspects: conjunction (same sign), opposition (6 signs apart), square (3 or 9 signs apart), trine (4 or 8 signs apart)
   - Only store major aspects (conjunction, opposition, square) — trines are skipped
   - Cap at 10 transits
7. Return the assembled `astroContext` object

**Non-blocking:** If astro context assembly fails (e.g. cosmicWeather data unavailable), the entry is still created — `astroContext` is set to `undefined`.

**Sign-level aspect calculation:**
```typescript
function signAspectType(signA, signB):
  diff = (indexB - indexA + 12) % 12
  if diff === 0 → "conjunction"
  if diff === 6 → "opposition"
  if diff === 3 || diff === 9 → "square"
  if diff === 4 || diff === 8 → "trine"
  else → null (not a major aspect)
```

---

## 6. Entry CRUD Pipeline

**File:** `convex/journal/entries.ts` (479 lines)

### `createEntry` (mutation)

The most complex mutation — validates, derives, attaches, persists:

1. **Auth check:** `getAuthUserId(ctx)` → throw if not authenticated
2. **Per-type validation:**
   - `freeform`: content required
   - `checkin`: content can be empty (mood-only check-ins are valid)
   - `dream`: content required
   - `gratitude`: at least 1 gratitude item required, max 5
3. **Shared field validation:**
   - Content length ≤ `MAX_CONTENT_LENGTH`
   - Title length ≤ `MAX_TITLE_LENGTH`
   - Tags ≤ `MAX_TAGS_PER_ENTRY`
   - Emotions ≤ `MAX_EMOTIONS_PER_ENTRY`
4. **Daily entry limit:** Count entries for this user on `entryDate` against `MAX_ENTRIES_PER_DAY`
5. **Derive moodZone** from valence/arousal using `deriveMoodZone()`
6. **Build astro context** via `buildAstroContext(ctx, userId)` (non-blocking)
7. **Compute word count**
8. **Insert** into `journal_entries`
9. **Update streak** via `internal.journal.streaks.updateStreak` (non-blocking)
10. **Return** entry ID

### `getUserEntries` (query)

Paginated query using `by_user_created` index, descending. Default page size: 20. Returns `{ entries, continueCursor, isDone }`.

### `getUserEntriesByDate` (query)

Query entries for a date range using `by_user_date` index. Used by calendar view.

### `getEntry` (query)

Single entry by ID. Verifies `userId` matches authenticated user (returns null if not owner).

### `getPinnedEntries` (query)

Returns all pinned entries for the authenticated user.

### `updateEntry` (mutation)

Partial updates. Only patches fields that are explicitly provided. Recomputes `moodZone` if `mood` changes, `wordCount` if `content` changes. Sets `updatedAt`.

### `deleteEntry` (mutation)

Verifies ownership, deletes the entry, and if a `photoId` exists, deletes the stored photo from Convex `_storage` (non-blocking).

---

## 7. Streak Tracking

**File:** `convex/journal/streaks.ts` (124 lines)

### `updateStreak` (internal mutation)

Called automatically by `createEntry`. Logic:

```
if lastEntryDate === today → no change (already counted today)
if lastEntryDate === yesterday → currentStreak += 1  (consecutive!)
if lastEntryDate < yesterday → currentStreak = 1    (streak broken)
longestStreak = max(longestStreak, currentStreak)
totalEntries += 1
lastEntryDate = today
```

### `getStreak` (query)

Returns streak data for the authenticated user. Checks liveness: if `lastEntryDate` is not today or yesterday, `currentStreak` is returned as 0 (streak is effectively dead).

---

## 8. Voice Input (Web Speech API)

**Files:**
- `src/lib/journal/voiceInput.ts` (106 lines) — Wrapper
- `src/components/journal/composer/voice-input-button.tsx` — UI component

### How It Works

Uses the browser-native `SpeechRecognition` / `webkitSpeechRecognition` API. Zero external services, zero cost.

**`isVoiceInputSupported()`**: Checks for `window.SpeechRecognition || window.webkitSpeechRecognition`.

**`createVoiceRecognition(onInterim, onFinal, onError, lang?)`**: Creates a continuous recognition instance with interim results. Returns a controller object:

```typescript
interface VoiceRecognitionController {
    start: () => void;    // Start listening
    stop: () => void;     // Stop and finalize
    isActive: () => boolean;
}
```

- `continuous: true` — Keeps listening across utterances
- `interimResults: true` — Streams partial text before finalization
- Safari: Attempts `processLocally = true` (Safari-only property)
- `onInterim` fires with partial transcript (for live preview)
- `onFinal` fires with completed transcript (appended to content)

**UI Component:** A microphone button with pulsing concentric rings during recording. Shows live interim transcript as italic text. When a final transcript arrives, it's appended to the entry content and also saved in the `voiceTranscript` field.

**Browser Support:** Chrome (full), Safari (partial), Firefox (not supported). The button shows as disabled with a tooltip when not supported.

---

## 9. Photo Upload (Convex Storage)

**Files:**
- `convex/files.ts` (33 lines) — Server-side upload URL generation
- `src/components/journal/composer/photo-uploader.tsx` — UI component

### Upload Flow

1. User taps "Add photo" → hidden file input (accept: `image/*`)
2. File type and size validation (max 5 MB)
3. Client calls `generateUploadUrl` mutation → gets a temporary Convex storage upload URL
4. Client POSTs the file directly to Convex storage → receives `{ storageId }`
5. `storageId` stored as `photoId` on the journal entry
6. Local preview via `URL.createObjectURL(file)` during upload
7. Stored photo fetched via `api.files.getUrl` query (Convex storage URL)

### Photo Removal

- User taps × on thumbnail → `photoId` set to null
- On entry deletion, the server deletes the file from `_storage`

### Caption

Optional `photoCaption` field stored alongside `photoId`.

---

## 10. Location Tagging (Geolocation + Nominatim)

**Files:**
- `src/lib/journal/location.ts` (153 lines) — Wrapper + reverse geocoding
- `src/components/journal/composer/location-input.tsx` — UI component

### How It Works

1. User taps "Add location" → browser `navigator.geolocation.getCurrentPosition()`
2. Latitude/longitude obtained
3. **Reverse geocoding** via Nominatim (OpenStreetMap, free, no API key): `https://nominatim.openstreetmap.org/reverse?lat=X&lon=Y&format=json&zoom=10`
4. Extracts `city` (or town/village/county) and `country`
5. Displays as "Prague, CZ" badge
6. User can edit display name manually (e.g. "Home", "Office")
7. **Cached** in localStorage for 30 minutes (same location, no re-geocoding)

### Data Stored

```typescript
location: {
    lat: number;
    long: number;
    city?: string;
    country?: string;
    displayName?: string;  // "Prague, CZ" or user override
}
```

---

## 11. Calendar View

**Files:**
- `src/app/journal/calendar/page.tsx` — Calendar page
- `src/components/journal/calendar/calendar-view.tsx` — Calendar grid component
- `src/components/journal/calendar/day-cell.tsx` — Individual day cell
- `src/components/journal/calendar/moon-phase-indicator.tsx` — Moon phase emoji

### Calendar Grid

- Standard Monday-first month grid (Mon–Sun, 4-6 rows, 42 cells)
- Previous/next month navigation
- "Today" button
- Each day cell shows:
  - Date number (galactic color if today)
  - **Mood-colored dots** — one per entry, colored by moodZone
  - **Moon phase icon** (🌑🌒🌓🌔🌕🌖🌗🌘) in corner — from `astroContext.moonPhase`
  - **Retrograde indicator** (℞) if any planet was retrograde that day
- Tap a day with entries → navigate to the first entry for that day
- Legend bar below showing mood zone colors

### Data Fetching

- `getUserEntriesByDate(startDate, endDate)` — all entries for the current month
- Entries grouped by `entryDate` client-side

---

## 12. Search & Filtering

**Files:**
- `convex/journal/search.ts` (78 lines) — Backend
- `src/app/journal/search/page.tsx` — Search page
- `src/components/journal/search/search-bar.tsx` — Search input
- `src/components/journal/search/search-filters.tsx` — Filter panel

### Backend (`searchEntries` query)

Uses Convex `withSearchIndex` on the `search_content` index for full-text search on the `content` field. Filters:

- `userId` (required)
- `entryType` — index-level filter
- `moodZone` — index-level filter
- `startDate`, `endDate` — in-memory filter on `entryDate`
- `tags` — in-memory filter (array intersection: entry must contain ALL specified tags)
- `moonPhase` — in-memory filter on `astroContext.moonPhase` (case-insensitive contains)

### Frontend

- Debounced search (300ms)
- Collapsible filter panel with: entry type chips, mood zone chips, moon phase select, date range inputs, tag input
- Results reuse `EntryCard` component with highlighted matches

---

## 13. Stats & Astro Correlations

**Files:**
- `convex/journal/stats.ts` (268 lines) — Backend
- `src/app/journal/stats/page.tsx` — Stats page
- `src/components/journal/stats/mood-trend-chart.tsx` — CSS-only mood visualization
- `src/components/journal/stats/entry-frequency-chart.tsx` — CSS-only bar chart
- `src/components/journal/stats/astro-correlation.tsx` — Insight cards

### `getStats` query (returns)

| Field | Description |
|-------|-------------|
| `totalEntries` | Count |
| `dateRange` | `{ start, end }` |
| `moodTrend` | Per-day: `{ date, avgValence, avgArousal, dominantZone }` |
| `topEmotions` | Top 10 by frequency with avg intensity |
| `entryFrequency` | `{ daily, weekly, monthly }` arrays |
| `entryTypeDistribution` | `{ freeform: N, checkin: N, dream: N, gratitude: N }` |
| `astroCorrelations` | Array of `{ insight, data }` objects |
| `streakData` | `{ currentStreak, longestStreak, totalEntries }` |

### Astro Correlation Engine

Computes correlations between journal behavior and celestial events:

1. **Moon phase frequency** — Identifies moon phases where user journals significantly more (>1.5× the average per phase). Generates insights like "You journal 2.3× more during Full Moons".

2. **Retrograde mood correlation** — Compares ratio of negative moods (tense + low) during retrograde periods vs non-retrograde. If negative mood ratio is >1.5× during retrogrades, generates "Your tense/low moods spike during retrogrades".

These are **computed server-side** with no LLM cost — pure statistical correlation. The insights are intentionally simple and conservative (1.5× threshold avoids noise).

### Visualization

All charts are **CSS-only** (no charting library). Mood trends show vertical bars per day colored by valence (green/red) and arousal (blue), with a mood-zone color strip along the bottom. Entry frequency is a simple bar chart.

---

## 14. Daily Prompt Bank

**Files:**
- `convex/journal/prompts.ts` (298 lines) — Backend
- `src/components/journal/prompt/daily-prompt-card.tsx` — Display card

### Prompt Selection Algorithm (`getDailyPrompt`)

Zero LLM cost. Deterministic per-user per-day:

1. Fetch today's `cosmicWeather` → moon phase, retrograde status
2. Filter `journal_prompt_bank` for `isActive: true`
3. **Priority cascade:**
   - If any planet is retrograde → select from `category: "retrograde"` pool
   - Else if specific moon phase (New Moon, Full Moon, etc.) → select from `category: "moon"` with matching `moonPhase`
   - Else → select from `category: "daily"` pool
   - Fallback: any active prompt
4. **Deterministic rotation:** `hash(userId + entryDate) % eligiblePrompts.length` → same user sees same prompt all day, different users see different prompts

### Seed Data

`seedPromptBank` internal mutation seeds 18 default prompts across categories: daily (5), moon (4), retrograde (3), gratitude (2), dream (2), relationship (1), career (1).

### UI

Daily prompt displayed at top of timeline as a dismissible card. Dismissed state stored in localStorage keyed by date. "Write about this →" link navigates to composer.

### Admin CRUD

Full CRUD via admin panel: add/edit/toggle/delete prompts, with inline editing. "Seed Default Prompts" button for first-time setup.

---

## 15. Oracle Consent Flow

**Files:**
- `convex/journal/consent.ts` (119 lines) — Backend
- `src/app/journal/settings/page.tsx` — Settings page
- `src/components/journal/consent/consent-modal.tsx` — Grant consent modal
- `src/components/journal/consent/consent-settings.tsx` — Manage/revue panel

### The Consent Model

Oracle **cannot** read journal entries by default. The user must explicitly grant access. This is enforced at the database level — `journal_consent.oracleCanReadJournal` must be `true` for the context assembler to return any data.

### Grant Consent Flow

1. User navigates to `/journal/settings`
2. If no consent record or `oracleCanReadJournal === false`, shows "Enable Oracle Access" button
3. Tapping opens consent modal with:
   - Toggle: Include full entry text (default: on)
   - Toggle: Include mood & emotion data (default: on)
   - Toggle: Include dream data (default: on)
   - Lookback window: 30 days / 90 days / 1 year / All time (default: 90 days)
4. User taps "Allow Access" → `grantConsent` mutation
5. Consent record created in `journal_consent` with `oracleCanReadJournal: true`

### Revoke Consent Flow

1. User goes to `/journal/settings` (consent already granted)
2. Sees `ConsentSettings` panel with current granularity
3. Can toggle individual permissions or tap "Revoke Access"
4. Revocation sets `oracleCanReadJournal: false` and `consentRevokedAt: Date.now()`
5. Oracle immediately stops receiving journal context

### Granular Permissions

Four dimensions of consent that Oracle must respect:

| Permission | What Oracle sees |
|-----------|-----------------|
| `includeEntryContent` | Full text of entries (truncated to `MAX_ENTRY_CHARS`) |
| `includeMoodData` | Mood zone, emotion keys with intensity, energy level |
| `includeDreamData` | Dream entries with lucidity/recurring/signs/tone |
| `lookbackDays` | How far back Oracle can see (30/90/365/9999) |

These are **enforced server-side** in `assembleJournalContext` — the context builder checks each permission flag before including data.

---

## 16. Oracle Context Assembly

**File:** `convex/journal/context.ts` (151 lines)

### `assembleJournalContext` (internal query)

Called by `invokeOracle` during prompt assembly. Returns a formatted `[JOURNAL CONTEXT]` string or `null`.

**Flow:**
1. Fetch `journal_consent` for user → if not consented, return `null`
2. Compute lookback cutoff from `consent.lookbackDays`
3. Query `journal_entries` for user within lookback, ordered by `createdAt` desc
4. Limit to `MAX_ENTRIES_IN_CONTEXT` (10, or 20 for Cosmic Recall with `expandedBudget`)
5. For each entry, build a compact summary respecting consent granularity:
   - **Always included:** `entryDate`, `entryType`, `moodZone`
   - **If `includeMoodData`:** emotions with intensity words, energy level
   - **If `includeEntryContent`:** truncated content (up to `MAX_ENTRY_CHARS`, or 1000 for Cosmic Recall)
   - **If `includeDreamData`:** dream data
   - **Always:** `astroContext.moonPhase`
6. Enforce `BUDGET_CHARS` (4,000 chars, or 8,000 for Cosmic Recall) — truncate from oldest entries
7. Format as the complete `[JOURNAL CONTEXT]` block:

```
[JOURNAL CONTEXT]
The user has consented to sharing their recent journal entries.
Here are summaries of their most recent reflections:

---ENTRY 2026-04-18 (zone: tense, arousal: high)---
Moon Phase: Waxing Gibbous
Emotions: strongly frustrated (safety), moderately lonely (connection)
Energy: 2/5
"Had another argument with Sarah about the same thing..."
---END ENTRY---

---ENTRY 2026-04-17 (zone: low, checkin)---
Moon Phase: First Quarter
Emotions: moderately anxious (safety), mildly overwhelmed (safety)
---END ENTRY---

[END JOURNAL CONTEXT]
Use this context to give more personalized, empathetic, and informed readings.
Reference their experiences naturally when relevant. Do not quote their journal
verbatim unless they ask you to reference it.
The mood data uses a 2D model: "zone" reflects the valence×arousal quadrant.
Emotion intensity ranges from mild (1) to strong (3) — weight your interpretation accordingly.
```

### Intensity Word Mapping

| Intensity | Word used in context |
|-----------|---------------------|
| 1 | "mildly" |
| 2 | "moderately" |
| 3 | "strongly" |

### Expanded Budget (Cosmic Recall)

When called with `expandedBudget: true`, all limits are doubled:
- `BUDGET_CHARS`: 4,000 → 8,000
- `MAX_ENTRY_CHARS`: 500 → 1,000
- `MAX_ENTRIES_IN_CONTEXT`: 10 → 20

---

## 17. Oracle Pipeline Integration

### Where Journal Context Enters Oracle

The journal context is injected into the Oracle prompt as **Block 3.5** — between feature injection (Block 3) and the title directive (Block 4):

```
[Block 1: ORACLE_SAFETY_RULES]        ← hardcoded, always first
[Block 2: soulDoc]                    ← from oracle_settings
[Block 3: featureInjection]          ← from feature table
[Block 3.5: journalContext]           ← NEW — from assembleJournalContext
[Block 4: ORACLE_TITLE_DIRECTIVE]     ← hardcoded
[Block 4.5: JOURNAL_PROMPT_DIRECTIVE] ← NEW — only if journalContext present
```

### Code Path (`convex/oracle/llm.ts:210-225`)

```typescript
const isCosmicRecall = activeFeature?.key === "journal_recall";
try {
    if (user?._id) {
        journalContext = await ctx.runQuery(
            internal.journal.context.assembleJournalContext,
            { userId: user._id, expandedBudget: isCosmicRecall },
        );
    }
} catch (e) {
    console.error("Journal context assembly failed (non-blocking):", e);
    journalContext = null;
}
```

**Key design decision:** Journal context assembly is **non-blocking**. If it fails (permission denied, database error, timeout), Oracle proceeds without journal context. The user still gets a reading — just without journal-awareness.

### When Journal Context Is Present

The `buildSystemPrompt()` function in `lib/oracle/promptBuilder.ts` includes `params.journalContext ?? ""`. When non-null, the `[JOURNAL CONTEXT]` block is inserted, and additionally the `JOURNAL_PROMPT_DIRECTIVE` is appended after the title directive:

```
[JOURNAL PROMPT SUGGESTION]
If your response touched on emotional themes the user might want to journal about,
you MAY optionally add a line: JOURNAL_PROMPT: <a reflective question for journaling>
This is optional — only include it when it feels natural and helpful.
[END JOURNAL PROMPT SUGGESTION]
```

---

## 18. Cosmic Recall Feature

**Feature definition:** `src/lib/oracle/features.ts`

```typescript
{
    key: "journal_recall",
    label: "Cosmic Recall",
    shortLabel: "Recall",
    description: "Search your journal entries for patterns tied to astrological events",
    defaultPrompt: "Look through my journal and help me find patterns",
    fallbackInjectionText: "[COSMIC RECALL MODE]\n...",
    menuGroup: "primary",
    implemented: true,
    requiresBirthData: false,
    requiresJournalConsent: true,  // ← NEW field on OracleFeatureDefinition
}
```

### What Makes It Special

1. **Requires journal consent** — `requiresJournalConsent: true` flag checked in the Oracle input component. If user hasn't granted consent, the feature appears disabled in the `+` menu with tooltip: "Requires journal access — enable in Journal Settings"

2. **Expanded context budget** — When `invokeOracle` detects `activeFeature.key === "journal_recall"`, it passes `expandedBudget: true` to `assembleJournalContext`, doubling all limits

3. **Feature injection** — The `[COSMIC RECALL MODE]` block instructs Oracle to search journal entries for patterns, cite specific dates, and relate them to astrological weather

### Consent Check in Oracle Input

The `OracleInput` component (`src/components/oracle/input/oracle-input.tsx`) queries `api.journal.consent.getConsent` and checks each feature's `requiresJournalConsent` flag. If the feature requires journal consent but the user hasn't granted it (or it's revoked), the feature is disabled with reason text.

---

## 19. Oracle-Suggested Journal Prompts

### The JOURNAL_PROMPT Directive

When journal context is present in the system prompt, Oracle is instructed that it MAY optionally include a `JOURNAL_PROMPT: <reflective question>` line in its response. This is **optional** — Oracle only includes it when it naturally touches on emotional themes the user might want to journal about.

### Parsing (`lib/oracle/promptBuilder.ts:parseJournalPromptFromResponse`)

```typescript
const promptRegex = /^\s*JOURNAL_PROMPT:\s*(.+?)\s*$/im;
```

Extracts the prompt text, strips quotes, enforces max 200 chars, removes the `JOURNAL_PROMPT:` line from the displayed content.

### Persistence

The journal prompt is stored on the `oracle_messages` row as `journalPrompt` (optional string). Both the `addMessage` and `finalizeStreamingMessage` mutations handle this field.

### UI Integration

In the Oracle chat page (`src/app/oracle/chat/[sessionId]/page.tsx`), after each assistant message's action buttons, if `journalPrompt` is present, a contextual CTA card appears:

```
[✦ Journal about this]
```

Tapping it navigates to `/journal/new?oracleSessionId=${sessionId}&presetPrompt=${prompt}&type=freeform`.

The composer page detects these query params and:
1. Pre-fills the content with the prompt text
2. Sets `oracleSessionId` and `oracleInspired: true` on the created entry
3. Shows an "Oracle Suggests" header above the composer

---

## 20. Admin Configuration Surface

**Files:**
- `src/app/admin/journal/page.tsx` — Overview dashboard
- `src/app/admin/journal/settings/page.tsx` — Tabbed settings
- `src/components/journal-admin/prompt-bank-editor.tsx` — Prompt bank CRUD

### Overview Dashboard (`/admin/journal`)

Shows aggregate stats from `getJournalAdminStats`:
- Total entries, active journalers, avg entries per user
- Entry type distribution (bar chart)
- Streak stats (avg streak, highest streak)
- Consent stats (enabled count, granularity breakdown, avg lookback)

### Tabbed Settings (`/admin/journal/settings`)

4 tabs:

| Tab | Controls |
|-----|----------|
| **Limits** | Max entries per day, max content length, max photo size |
| **Features** | Journal-Oracle integration toggle, voice input toggle |
| **Prompt Bank** | Full CRUD for journal prompts (add/edit/toggle/delete), seed defaults button |
| **Oracle Integration** | Context char budget, max chars per entry, max entries in context, default lookback days |

### Known Setting Keys

| Key | Group | ValueType | Default |
|-----|-------|-----------|---------|
| `max_entries_per_day` | limits | number | 10 |
| `max_content_length` | limits | number | 50000 |
| `max_photo_size_bytes` | limits | number | 5242880 |
| `journal_context_enabled` | features | boolean | true |
| `voice_input_enabled` | features | boolean | true |
| `journal_context_budget_chars` | oracle_integration | number | 4000 |
| `max_entry_context_chars` | oracle_integration | number | 500 |
| `max_context_journal_entries` | oracle_integration | number | 10 |
| `default_lookback_days` | oracle_integration | number | 90 |

---

## 21. User-Facing Flow (End-to-End Walkthrough)

### Flow A: Creating a Journal Entry

1. User navigates to `/journal` → sees timeline with daily prompt card and existing entries
2. Taps "New Entry" (sidebar or FAB) → `/journal/new`
3. Selects entry type (Freeform / Check-in / Dream / Gratitude)
4. **Freeform:** Types title + content, drags mood pad, selects emotions, toggles extras (energy, time-of-day, tags, voice, photo, location)
5. **Check-in:** Drags mood pad (prominent), selects emotions, optional note
6. **Dream:** Types description, toggles lucid/recurring, adds dream signs, emotional tone, mood
7. **Gratitude:** Fills 3-5 gratitude items, optional note
8. Taps "Save Entry" (or Cmd+Enter)
9. `createEntry` mutation fires → validates → derives mood zone → attaches astro context → computes word count → inserts row → updates streak
10. Navigates back to timeline → entry appears at top

### Flow B: Viewing Entries

1. Timeline shows entries grouped by date (Today / Yesterday / April 16, 2026)
2. Each card shows: mood zone color accent (left border), entry type icon, title/preview, astro badge, top emotions, tags, time
3. Tapping card → `/journal/[entryId]` → full detail view with all data
4. "Ask Oracle about this" button → `/oracle/new?journalEntryId=xxx`

### Flow C: Granting Oracle Access

1. User navigates to `/journal/settings`
2. If no consent record → sees "Enable Oracle Access" button
3. Taps → consent modal opens with granularity controls
4. Taps "Allow Access" → `grantConsent` mutation → consent record created
5. Now when user asks Oracle questions, Oracle's system prompt includes `[JOURNAL CONTEXT]` block
6. Oracle responses may reference the user's emotional patterns, specific entries, and astro correlations

### Flow D: Using Cosmic Recall

1. User opens Oracle chat
2. Taps `+` menu → selects "Cosmic Recall" (appears as enabled if consent is granted)
3. Types: "What was I going through during the last Mercury retrograde?"
4. `invokeOracle` detects `journal_recall` feature → passes `expandedBudget: true` to context assembler
5. Oracle receives double-budget journal context + Cosmic Recall feature injection
6. Oracle synthesizes a response citing specific journal entries by date, relating emotional patterns to retrograde transits

### Flow E: Oracle-Suggested Journaling

1. User has consent enabled. Asks Oracle: "I've been feeling anxious all week, what's going on?"
2. Oracle's response includes emotional analysis referencing journal entries
3. At end of response, Oracle outputs: `JOURNAL_PROMPT: What pattern in your anxiety has been repeating, and what might it be trying to tell you?`
4. This line is parsed out and stored as `journalPrompt` on the message
5. UI shows "✦ Journal about this" button below the response
6. User taps → composer opens with the prompt pre-filled, `oracleInspired: true`
7. New entry created linking back to the Oracle session

---

## 22. File Map

### Convex Backend

| File | Purpose |
|------|---------|
| `convex/journal/entries.ts` | Entry CRUD: create, read, update, delete |
| `convex/journal/streaks.ts` | Streak tracking (internal mutation + query) |
| `convex/journal/astroContext.ts` | Build astro context from cosmicWeather |
| `convex/journal/consent.ts` | Consent CRUD: grant, revoke, update granularity |
| `convex/journal/context.ts` | Assemble `[JOURNAL CONTEXT]` block for Oracle |
| `convex/journal/search.ts` | Full-text search with filters |
| `convex/journal/stats.ts` | Aggregate stats and astro correlations |
| `convex/journal/prompts.ts` | Daily prompt selection + admin CRUD + seed |
| `convex/journal/settings.ts` | Admin settings CRUD |
| `convex/journal/admin.ts` | Admin overview stats |
| `convex/files.ts` | Photo upload URL generation + URL retrieval |

### Frontend — Pages

| File | Purpose |
|------|---------|
| `src/app/journal/layout.tsx` | Layout shell with sidebar |
| `src/app/journal/page.tsx` | Timeline view (default) |
| `src/app/journal/new/page.tsx` | Entry composer (handles presetPrompt, type params) |
| `src/app/journal/[entryId]/page.tsx` | Entry detail view |
| `src/app/journal/[entryId]/edit/page.tsx` | Entry editor (reuses composer) |
| `src/app/journal/calendar/page.tsx` | Calendar month view |
| `src/app/journal/search/page.tsx` | Full-text search |
| `src/app/journal/stats/page.tsx` | Stats & charts |
| `src/app/journal/settings/page.tsx` | Oracle consent + preferences |
| `src/app/admin/journal/page.tsx` | Admin overview |
| `src/app/admin/journal/settings/page.tsx` | Admin settings (4 tabs including Prompt Bank) |

### Frontend — Components

| File | Purpose |
|------|---------|
| **Composer** | |
| `src/components/journal/composer/entry-composer.tsx` | Main composer (mode switcher, save, Oracle link support) |
| `src/components/journal/composer/freeform-editor.tsx` | Title + content inputs |
| `src/components/journal/composer/checkin-widget.tsx` | Quick mood + emotions + note |
| `src/components/journal/composer/dream-editor.tsx` | Dream description + dream data |
| `src/components/journal/composer/gratitude-editor.tsx` | 3-5 gratitude items + note |
| `src/components/journal/composer/mood-pad.tsx` | 2D valence×arousal draggable pad |
| `src/components/journal/composer/emotion-selector.tsx` | Clustered emotions with intensity |
| `src/components/journal/composer/energy-level-picker.tsx` | 1-5 energy selector |
| `src/components/journal/composer/time-of-day-picker.tsx` | Morning/midday/evening/night |
| `src/components/journal/composer/tag-input.tsx` | Tag chips with validation |
| `src/components/journal/composer/astro-context-strip.tsx` | Collapsible moon phase + retrogrades |
| `src/components/journal/composer/voice-input-button.tsx` | Mic button with live transcript |
| `src/components/journal/composer/photo-uploader.tsx` | Single image upload + preview |
| `src/components/journal/composer/location-input.tsx` | Geolocation + reverse geocode |
| **Timeline** | |
| `src/components/journal/timeline/timeline-view.tsx` | Scrollable entry list with pagination |
| `src/components/journal/timeline/entry-card.tsx` | Entry preview card |
| `src/components/journal/timeline/date-separator.tsx` | Date headers |
| `src/components/journal/timeline/streak-display.tsx` | Streak counter |
| **Detail** | |
| `src/components/journal/detail/emotion-badges.tsx` | Emotion chips with intensity dots |
| **Calendar** | |
| `src/components/journal/calendar/calendar-view.tsx` | Monthly calendar grid |
| `src/components/journal/calendar/day-cell.tsx` | Day cell with mood dots + moon phase |
| `src/components/journal/calendar/moon-phase-indicator.tsx` | Moon phase emoji |
| **Search** | |
| `src/components/journal/search/search-bar.tsx` | Search input |
| `src/components/journal/search/search-filters.tsx` | Collapsible filter panel |
| **Stats** | |
| `src/components/journal/stats/mood-trend-chart.tsx` | CSS mood trend visualization |
| `src/components/journal/stats/entry-frequency-chart.tsx` | CSS frequency bar chart |
| `src/components/journal/stats/astro-correlation.tsx` | Insight card display |
| **Consent** | |
| `src/components/journal/consent/consent-modal.tsx` | Grant consent flow |
| `src/components/journal/consent/consent-settings.tsx` | Manage/revoke consent |
| **Prompt** | |
| `src/components/journal/prompt/daily-prompt-card.tsx` | Daily prompt on timeline |
| **Admin** | |
| `src/components/journal-admin/prompt-bank-editor.tsx` | Prompt bank CRUD |
| **Other** | |
| `src/components/journal/journal-sidebar.tsx` | Sidebar navigation |

### Frontend — Libraries & State

| File | Purpose |
|------|---------|
| `src/lib/journal/constants.ts` | All constants, mood model, emotions, limits |
| `src/lib/journal/voiceInput.ts` | Web Speech API wrapper |
| `src/lib/journal/location.ts` | Geolocation + Nominatim reverse geocoding |
| `src/store/use-journal-store.ts` | Zustand store for composer/search/voice state |

---

## 23. Key Design Decisions & Trade-offs

### 1. 2D Mood Model Instead of 1-5 Scale
The 2D valence×arousal grid captures dramatically richer emotional data than a linear scale. "Burnt-out low" and "serene low" map to completely different astrological interpretations. The trade-off is slightly more UI complexity (a draggable 2D pad vs. a simple star rating), but users understand the 2D concept quickly.

### 2. Consent as a First-Class Primitive, Not an Afterthought
Journal consent is a separate table with granular permissions (entry content / mood data / dream data / lookback window), not a boolean toggle. This is enforced server-side in the context assembler. The trade-off is complexity, but it's essential for user trust — users need fine-grained control over what Oracle sees.

### 3. Astro Context Attached at Creation, Not at Read Time
The astro context is frozen at entry creation time and stored on the entry. This means the context is historically accurate — the entry from April 15 shows the moon phase that was actually present on April 15, not whatever the moon phase is when Oracle reads it. The trade-off is storage size (each entry carries its own astro context), but entries are typically bounded.

### 4. Non-Blocking Oracle Integration
Journal context assembly failures are caught and logged but never block Oracle from responding. If consent is missing, database errors occur, or the context is empty, Oracle proceeds without journal context. The user always gets a response.

### 5. Deterministic Daily Prompts Instead of LLM-Generated
Prompt selection uses a hash-based rotation (`hash(userId + date) % eligibleCount`) that's deterministic, zero-cost, and astrology-aware. The same user always sees the same prompt on a given day. The trade-off is less variety than an LLM-generated prompt, but the prompts can reference specific moon phases and retrogrades that are actually happening.

### 6. CSS-Only Charts Instead of Charting Library
Stats visualizations use pure CSS (colored divs, gradient bars) instead of a library like Recharts or Chart.js. This avoids adding a dependency (~50KB) for what are relatively simple visualizations. The trade-off is less interactivity (no tooltips, no zoom), but the stats page is fast and lightweight.

### 7. Browser-Native Voice Input
Voice uses the Web Speech API — zero cost, zero external services. The trade-off is limited browser support (Chrome: full, Safari: partial, Firefox: none). No server-side processing, no transcription storage costs.

### 8. Single Photo Per Entry
Only one photo per entry (5 MB limit). This keeps storage costs bounded and avoids building a media gallery. The trade-off is limitations for photo-heavy journaling, but this is aligned with the emotion-first design — the journal captures feelings, not photo albums.

### 9. `entryDate` String for Date Grouping
Entries use a `entryDate: "YYYY-MM-DD"` string field (separate from `createdAt` timestamp) for date-based queries and grouping. This is more efficient for the calendar and stats queries than computing dates from timestamps on the fly. The trade-off is a small denormalization, but the query patterns (by_user_date index) justify it.

### 10. Oracle Feature Menu Checks Journal Consent
The `requiresJournalConsent` field on `OracleFeatureDefinition` causes the Oracle input component to query `getConsent` and disable features that require journal access when consent hasn't been granted. This is a UX decision — showing the feature grayed out with a reason message ("Requires journal access") educates users about the dependency, rather than hiding the feature entirely.

---

*Document generated from codebase analysis. All file references use the format `filepath`. Last updated: 2026-04-21.*