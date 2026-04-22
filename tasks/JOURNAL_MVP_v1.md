# Journal MVP v1 — Implementation Plan

> **Goal:** Ship a journal that is immediately valuable to users for emotional self-reflection *and* immediately valuable to Oracle AI as personal context. Astrology-native, emotion-first, psychologically grounded.

---

## Guiding Principles

1. **Emotion journaling is the core product.** Users track how they feel, write about it, and see their emotional landscape over time — all automatically correlated with astrological transits.
2. **Every entry feeds Oracle.** The journal exists in symbiosis with Oracle. Oracle reads the journal (with consent) to give readings that actually understand the user. This is the #1 differentiator.
3. **Emotions are multi-dimensional, not checkboxes.** Mood is captured on a 2D valence×arousal grid (Russell Circumplex Model), emotions have intensity levels and cluster groupings. This produces dramatically richer data for both the user and Oracle.
4. **Zero external integrations.** No weather APIs, no fitness/health providers, no third-party STT services. Everything is self-contained within our Convex + Next.js stack and browser-native APIs.

---

## What's IN

| Feature | Why It's Priority |
|---|---|
| **Freeform entries** | Core journaling — the blank page |
| **Quick check-in entries** | Ultra-low friction mood logging; keeps streaks alive; feeds Oracle emotion data even on busy days |
| **Dream journal entries** | Dreams are deeply tied to astrological transits (moon phases, Neptune) — unique to our platform |
| **Gratitude entries** | Low-friction positive-emotion journaling; valuable pattern data for Oracle |
| **2D mood capture (valence × arousal)** | Psychologically grounded; distinguishes "burnt-out low" from "serene low" — massively richer signal for Oracle |
| **Clustered emotions with intensity** | Captures not just *what* you feel but *how much*; cluster trends reveal patterns no flat list can |
| **Auto astro context** | The differentiator — every entry knows the sky. Zero cost, deterministic, already have `cosmicWeather` data |
| **Tags** | Lightweight organization; lets Oracle correlate themes across entries |
| **Location tagging** | Optional geolocation — where you are shapes how you feel; valuable context dimension |
| **Streaks** | Retention mechanic; motivates daily journaling which produces richer Oracle context |
| **Oracle consent + context injection** | The crown jewel — Oracle reads your journal to give personalized readings |
| **Oracle Cosmic Recall** | "What was I going through during the last Mercury retrograde?" — killer feature |
| **Oracle-suggested journal prompts** | Oracle reading → "Journal about this" button → closes the loop |
| **Timeline view** | Users need to see their entries |
| **Calendar view** | Month grid with mood-colored dots and moon phase icons — visual pattern recognition at a glance |
| **Search with filters** | Find entries by mood zone, tag, date range, entry type, moon phase |
| **Stats & charts** | Mood trends, emotion cluster heatmaps, entry frequency, astrology correlations |
| **Prompt bank** | Algorithmic daily prompts (astrology-aware, zero LLM cost) — surfaces the right question at the right time |
| **Composer (all entry types)** | Users need to write entries |
| **Entry detail view** | Users need to read their entries back |
| **Entry editing** | Users need to fix things |
| **Voice input (Web Speech API)** | Browser-native, zero cost; lowers friction for people who think out loud |
| **Image attachments (lightweight)** | A single photo per entry — captures the moment without building a media gallery |
| **Admin panel (`/admin/journal`)** | Tabbed settings page mirroring `/admin/oracle/settings` — manage limits, prompt bank, consent stats |

## What's OUT

| Feature | Why It's Deferred |
|---|---|
| Weather data | Requires external API; low astrological value |
| Fitness/health integrations | External providers; not core to emotional journaling |
| Video attachments | Heavy storage; complex playback; not core |
| Books/collections | Organizational power feature — users need entries first |
| Guided entry type with template engine | Complex — system templates, prompt types, astro token injection. The prompt bank covers the "guided" use case with less complexity |
| User-created templates | Power feature, deferred |
| Streak notifications | Requires notification infrastructure; deferred |
| Audio recording storage | Save voice memo blob alongside transcript — nice-to-have |
| Entry sharing/export | Export as markdown/PDF — deferred |

---

## 1. Emotion Capture Model

### The Problem with Simple Mood Scales

A 5-point linear scale (amazing → rough) forces humans into pre-defined boxes. People rarely feel "amazing" or "rough" as clean states. Energy and valence are independent — you can be calm/content or anxious/excited. A flat list of emotions misses intensity, co-occurrence patterns, and the relational dimensions of real emotional experience.

### The Solution: Russell Circumplex + Clustered Emotions with Intensity

#### 2D Mood Grid (Valence × Arousal)

Based on the **Russell Circumplex Model of Affect** — the most widely validated dimensional model of emotion in psychology.

```typescript
// Two continuous axes: valence (bad→good) + arousal (calm→activated)
export const MOOD_AXES = {
    valence: { min: -2, max: 2 },   // negative ←→ positive
    arousal: { min: -2, max: 2 },   // calm ←→ activated
} as const;

// Derive a "mood zone" from the two axes for display/labeling
// These are the 4 quadrants — used for labels, colors, and emoji in the UI
export const MOOD_ZONES = [
    { key: "excited",  label: "Excited",  valence: [0, 2],  arousal: [0, 2],  emoji: "🤩", color: "#10b981" },
    { key: "content",  label: "Content",  valence: [0, 2],  arousal: [-2, 0], emoji: "😊", color: "#22c55e" },
    { key: "tense",    label: "Tense",    valence: [-2, 0], arousal: [0, 2],  emoji: "😤", color: "#f97316" },
    { key: "low",      label: "Low",      valence: [-2, 0], arousal: [-2, 0], emoji: "😔", color: "#ef4444" },
] as const;
```

**UI Interaction:** A 2D draggable pad (like a color picker XY pad). The user drags a point to mark where they are on the valence/arousal plane. The nearest mood zone label appears as the current state. Fast, intuitive, and produces continuous data.

#### Clustered Emotions with Intensity

Emotions are grouped into clusters that map to life domains. Each selected emotion has an intensity level (1–3: mild / moderate / strong).

```typescript
export type EmotionPolarity = "positive" | "negative" | "neutral";

export interface Emotion {
    key: string;
    label: string;
    polarity: EmotionPolarity;
    cluster: string;   // for grouping in UI and analytics
}

export const EMOTIONS: Emotion[] = [
    // Connection cluster
    { key: "loved",       label: "Loved",       polarity: "positive", cluster: "connection" },
    { key: "grateful",    label: "Grateful",    polarity: "positive", cluster: "connection" },
    { key: "lonely",      label: "Lonely",      polarity: "negative", cluster: "connection" },

    // Energy cluster
    { key: "inspired",    label: "Inspired",    polarity: "positive", cluster: "energy" },
    { key: "excited",     label: "Excited",     polarity: "positive", cluster: "energy" },
    { key: "restless",    label: "Restless",    polarity: "negative", cluster: "energy" },
    { key: "numb",        label: "Numb",        polarity: "negative", cluster: "energy" },

    // Safety cluster
    { key: "peaceful",    label: "Peaceful",    polarity: "positive", cluster: "safety" },
    { key: "confident",   label: "Confident",   polarity: "positive", cluster: "safety" },
    { key: "anxious",     label: "Anxious",     polarity: "negative", cluster: "safety" },
    { key: "overwhelmed", label: "Overwhelmed", polarity: "negative", cluster: "safety" },

    // Clarity cluster
    { key: "focused",     label: "Focused",     polarity: "positive", cluster: "clarity" },
    { key: "confused",    label: "Confused",    polarity: "negative", cluster: "clarity" },
    { key: "conflicted",  label: "Conflicted",  polarity: "neutral",  cluster: "clarity" },
] as const;

// Each emotion entry captures what + how much
export interface EmotionEntry {
    key: string;
    intensity: 1 | 2 | 3;   // mild / moderate / strong
}
```

**UI Interaction:** Emotions are displayed grouped by cluster (connection, energy, safety, clarity). Tapping an emotion toggles it on. Once selected, a small 3-dot intensity selector appears (●○○ / ●●○ / ●●●). Max 5–7 emotions per entry to keep it lightweight.

#### Why This Is Better

| Dimension | Old Model | New Model |
|---|---|---|
| Mood model | 5-point linear scale | 2D valence × arousal grid |
| Emotion depth | Flat list, binary select | Clustered + intensity (1–3) |
| Co-occurrence | Not modeled | Implicit via `EmotionEntry[]` |
| Physical state | Absent | `energyLevel` field (1–5) |
| Context | Absent | Time-of-day (`morning/midday/evening/night`) + free note |
| Analytics potential | Basic frequency counts | Cluster trends, arousal drift, intensity patterns, 2D mood trajectory |

The **biggest wins** are the **2D mood grid** (you immediately distinguish "burnt-out low" from "serene low") and **emotion intensity** (someone who is *mildly* anxious every day tells a completely different story than someone who is *intensely* anxious twice a week).

---

## 2. Database Schema (Convex)

### New Tables to Add to `convex/schema.ts`

#### `journal_entries`

```typescript
journal_entries: defineTable({
    userId: v.id("users"),

    // --- Content ---
    title: v.optional(v.string()),
    content: v.string(),                          // Main entry body (plain text / light markdown)

    // --- Entry Type ---
    entryType: v.union(
        v.literal("freeform"),                   // User writes freely
        v.literal("checkin"),                    // Quick mood + optional emotions
        v.literal("dream"),                      // Dream journal entry
        v.literal("gratitude"),                  // Gratitude-specific entry
    ),

    // --- Mood (2D Circumplex) ---
    mood: v.optional(v.object({
        valence: v.number(),                     // -2 to +2 (negative ←→ positive)
        arousal: v.number(),                     // -2 to +2 (calm ←→ activated)
    })),
    moodZone: v.optional(v.union(                // Derived label for display/filtering
        v.literal("excited"),                    // high valence, high arousal
        v.literal("content"),                    // high valence, low arousal
        v.literal("tense"),                      // low valence, high arousal
        v.literal("low"),                        // low valence, low arousal
    )),

    // --- Emotions (clustered + intensity) ---
    emotions: v.optional(v.array(v.object({
        key: v.string(),                          // e.g. "anxious", "grateful"
        intensity: v.union(                       // mild / moderate / strong
            v.literal(1),
            v.literal(2),
            v.literal(3),
        ),
    }))),

    // --- Energy & Context ---
    energyLevel: v.optional(v.number()),          // 1-5 physical energy (separate from arousal)
    timeOfDay: v.optional(v.union(                // Contextual time marker
        v.literal("morning"),
        v.literal("midday"),
        v.literal("evening"),
        v.literal("night"),
    )),

    // --- Astrological Context (auto-attached at creation) ---
    astroContext: v.optional(v.object({
        moonPhase: v.string(),                   // "Waxing Gibbous" etc.
        moonSign: v.optional(v.string()),
        sunSign: v.optional(v.string()),
        retrogradePlanets: v.optional(v.array(v.string())),
        activeTransits: v.optional(v.array(v.object({
            planet: v.string(),
            sign: v.string(),
            aspect: v.optional(v.string()),
            house: v.optional(v.number()),
        }))),
    })),

    // --- Voice ---
    voiceTranscript: v.optional(v.string()),     // Raw STT transcript (Web Speech API)

    // --- Photo (single lightweight image) ---
    photoId: v.optional(v.id("_storage")),
    photoCaption: v.optional(v.string()),

    // --- Location ---
    location: v.optional(v.object({
        lat: v.number(),
        long: v.number(),
        city: v.optional(v.string()),
        country: v.optional(v.string()),
        displayName: v.optional(v.string()),     // "Prague, CZ" or user-typed override
    })),

    // --- Organization ---
    tags: v.optional(v.array(v.string())),
    isPinned: v.optional(v.boolean()),

    // --- Dream-Specific ---
    dreamData: v.optional(v.object({
        isLucid: v.optional(v.boolean()),
        isRecurring: v.optional(v.boolean()),
        dreamSigns: v.optional(v.array(v.string())),     // Recurring symbols
        emotionalTone: v.optional(v.string()),            // "eerie", "joyful", "confusing"
    })),

    // --- Gratitude-Specific ---
    gratitudeItems: v.optional(v.array(v.string())),     // What the user is grateful for (3-5 items)

    // --- Oracle Link ---
    oracleSessionId: v.optional(v.id("oracle_sessions")),
    oracleInspired: v.optional(v.boolean()),             // Was this entry suggested by Oracle?

    // --- Metadata ---
    wordCount: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
    entryDate: v.string(),                                // "YYYY-MM-DD"
})
    .index("by_user_date", ["userId", "entryDate"])
    .index("by_user_created", ["userId", "createdAt"])
    .index("by_user_type", ["userId", "entryType"])
    .index("by_user_pinned", ["userId", "isPinned"])
    .index("by_user_mood_zone", ["userId", "moodZone"])
    .index("by_oracle_session", ["oracleSessionId"])
    .searchIndex("search_content", {
        searchField: "content",
        filterFields: ["userId", "entryType", "moodZone", "entryDate"],
    })
```

#### `journal_streaks`

```typescript
journal_streaks: defineTable({
    userId: v.id("users"),
    currentStreak: v.number(),
    longestStreak: v.number(),
    lastEntryDate: v.string(),                    // "YYYY-MM-DD"
    totalEntries: v.number(),
    updatedAt: v.number(),
})
    .index("by_user", ["userId"])
```

#### `journal_consent` (Oracle Access)

```typescript
journal_consent: defineTable({
    userId: v.id("users"),
    oracleCanReadJournal: v.boolean(),
    consentGivenAt: v.optional(v.number()),
    consentRevokedAt: v.optional(v.number()),
    consentVersion: v.string(),                   // "1.0"

    // Granular permissions
    includeEntryContent: v.boolean(),            // Can Oracle read full entry text?
    includeMoodData: v.boolean(),                // Can Oracle read mood/emotion data?
    includeDreamData: v.boolean(),               // Can Oracle read dream entries?
    lookbackDays: v.number(),                     // How many days back Oracle can see (30, 90, 365, 9999)

    updatedAt: v.number(),
})
    .index("by_user", ["userId"])
```

#### `journal_prompt_bank` (Algorithmic Daily Prompts)

```typescript
journal_prompt_bank: defineTable({
    category: v.union(
        v.literal("daily"),
        v.literal("moon"),
        v.literal("retrograde"),
        v.literal("seasonal"),
        v.literal("gratitude"),
        v.literal("dream"),
        v.literal("relationship"),
        v.literal("career"),
    ),
    moonPhase: v.optional(v.string()),             // Only shown during this moon phase (e.g. "Full Moon")
    text: v.string(),                               // The prompt text
    astrologyLevel: v.union(
        v.literal("none"),                          // No astrology context needed
        v.literal("light"),                         // References moon phase
        v.literal("medium"),                        // References current transits
        v.literal("deep"),                          // References natal chart specifics
    ),
    isActive: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
})
    .index("by_category", ["category"])
    .index("by_moon_phase", ["moonPhase"])
    .index("by_active", ["isActive"])
```

#### `journal_settings` (Admin Configuration)

```typescript
journal_settings: defineTable({
    key: v.string(),
    value: v.string(),                             // Always stored as string — parsed at app layer
    valueType: v.union(
        v.literal("string"),
        v.literal("number"),
        v.literal("boolean"),
        v.literal("json"),
    ),
    label: v.string(),
    description: v.optional(v.string()),
    group: v.string(),                             // "limits", "features", "oracle_integration"
    updatedAt: v.number(),
    updatedBy: v.optional(v.id("users")),
})
    .index("by_key", ["key"])
    .index("by_group", ["group"])
```

---

## 3. Constants & Defaults

Create `src/lib/journal/constants.ts`:

```typescript
// --- Entry Types ---
export const ENTRY_TYPES = ["freeform", "checkin", "dream", "gratitude"] as const;
export type EntryType = (typeof ENTRY_TYPES)[number];

// --- Mood (2D Circumplex) ---
export const MOOD_AXES = {
    valence: { min: -2, max: 2 },
    arousal: { min: -2, max: 2 },
} as const;

export const MOOD_ZONES = [
    { key: "excited",  label: "Excited",  valence: [0, 2] as const,  arousal: [0, 2] as const,  emoji: "🤩", color: "#10b981" },
    { key: "content",  label: "Content",  valence: [0, 2] as const,  arousal: [-2, 0] as const, emoji: "😊", color: "#22c55e" },
    { key: "tense",    label: "Tense",    valence: [-2, 0] as const, arousal: [0, 2] as const,  emoji: "😤", color: "#f97316" },
    { key: "low",      label: "Low",      valence: [-2, 0] as const, arousal: [-2, 0] as const, emoji: "😔", color: "#ef4444" },
] as const;

export type MoodZone = (typeof MOOD_ZONES)[number]["key"];

// Helper: derive mood zone from valence/arousal values
export function deriveMoodZone(valence: number, arousal: number): MoodZone {
    if (valence >= 0 && arousal >= 0) return "excited";
    if (valence >= 0 && arousal < 0) return "content";
    if (valence < 0 && arousal >= 0) return "tense";
    return "low";
}

// --- Emotions (clustered + intensity) ---
export type EmotionPolarity = "positive" | "negative" | "neutral";

export interface EmotionDefinition {
    key: string;
    label: string;
    polarity: EmotionPolarity;
    cluster: string;
}

export const EMOTIONS: EmotionDefinition[] = [
    // Connection cluster
    { key: "loved",       label: "Loved",       polarity: "positive", cluster: "connection" },
    { key: "grateful",    label: "Grateful",    polarity: "positive", cluster: "connection" },
    { key: "lonely",      label: "Lonely",      polarity: "negative", cluster: "connection" },

    // Energy cluster
    { key: "inspired",    label: "Inspired",    polarity: "positive", cluster: "energy" },
    { key: "excited",     label: "Excited",     polarity: "positive", cluster: "energy" },
    { key: "restless",    label: "Restless",    polarity: "negative", cluster: "energy" },
    { key: "numb",        label: "Numb",        polarity: "negative", cluster: "energy" },

    // Safety cluster
    { key: "peaceful",    label: "Peaceful",    polarity: "positive", cluster: "safety" },
    { key: "confident",   label: "Confident",   polarity: "positive", cluster: "safety" },
    { key: "anxious",     label: "Anxious",     polarity: "negative", cluster: "safety" },
    { key: "overwhelmed", label: "Overwhelmed", polarity: "negative", cluster: "safety" },

    // Clarity cluster
    { key: "focused",     label: "Focused",     polarity: "positive", cluster: "clarity" },
    { key: "confused",    label: "Confused",    polarity: "negative", cluster: "clarity" },
    { key: "conflicted",  label: "Conflicted",  polarity: "neutral",  cluster: "clarity" },
] as const;

export const EMOTION_CLUSTERS = ["connection", "energy", "safety", "clarity"] as const;

export interface EmotionEntry {
    key: string;
    intensity: 1 | 2 | 3;   // mild / moderate / strong
}

// --- Time of Day ---
export const TIME_OF_DAY = [
    { key: "morning", label: "Morning", icon: "🌅" },
    { key: "midday",  label: "Midday",  icon: "☀️" },
    { key: "evening", label: "Evening", icon: "🌇" },
    { key: "night",   label: "Night",   icon: "🌙" },
] as const;

// --- Limits ---
export const JOURNAL_LIMITS = {
    MAX_ENTRIES_PER_DAY: 10,
    MAX_CONTENT_LENGTH: 50_000,
    MAX_TITLE_LENGTH: 100,
    MAX_TAGS_PER_ENTRY: 10,
    MAX_TAG_LENGTH: 30,
    MAX_EMOTIONS_PER_ENTRY: 7,
    MAX_GRATITUDE_ITEMS: 5,
    MAX_DREAM_SIGNS: 10,
    MAX_PHOTO_SIZE_BYTES: 5_242_880, // 5 MB
} as const;

// --- Oracle Integration ---
export const ORACLE_JOURNAL_CONTEXT = {
    BUDGET_CHARS: 4_000,
    MAX_ENTRY_CHARS: 500,
    MAX_ENTRIES_IN_CONTEXT: 10,
    DEFAULT_LOOKBACK_DAYS: 90,
} as const;

// --- Consent ---
export const CONSENT_VERSION = "1.0";

// --- Admin Settings Defaults ---
export const JOURNAL_SETTINGS_DEFAULTS: Record<string, { value: string; valueType: string; label: string; group: string; description: string }> = {
    max_entries_per_day:         { value: "10",    valueType: "number",  label: "Max Entries Per Day",           group: "limits",             description: "Prevent spam" },
    max_content_length:          { value: "50000", valueType: "number",  label: "Max Content Length (chars)",    group: "limits",             description: "Characters per entry" },
    max_photo_size_bytes:        { value: "5242880", valueType: "number", label: "Max Photo Size (bytes)",       group: "limits",             description: "5 MB default" },
    journal_context_budget_chars:{ value: "4000",  valueType: "number",  label: "Journal Context Char Budget",   group: "oracle_integration", description: "Max chars for journal context in Oracle prompt" },
    max_entry_context_chars:     { value: "500",   valueType: "number",  label: "Max Chars Per Entry in Context",group: "oracle_integration", description: "Max chars per journal entry in Oracle context" },
    max_context_journal_entries: { value: "10",    valueType: "number",  label: "Max Entries in Context",        group: "oracle_integration", description: "Max journal entries included in Oracle prompt" },
    journal_context_enabled:     { value: "true",  valueType: "boolean", label: "Journal-Oracle Integration",    group: "features",           description: "Global toggle for Journal-Oracle context sharing" },
    voice_input_enabled:         { value: "true",  valueType: "boolean", label: "Voice Input",                   group: "features",           description: "Global toggle for voice journaling" },
    default_lookback_days:       { value: "90",    valueType: "number",  label: "Default Lookback Days",         group: "oracle_integration", description: "Default lookback for Oracle journal context" },
};
```

---

## 4. File Map

### Convex Backend

| File | Purpose | Phase |
|---|---|---|
| `convex/journal/entries.ts` | Entry CRUD: `createEntry`, `getEntry`, `getUserEntries`, `getUserEntriesByDate`, `updateEntry`, `deleteEntry` | 1 |
| `convex/journal/streaks.ts` | `updateStreak` (called by `createEntry`), `getStreak` | 1 |
| `convex/journal/astroContext.ts` | `buildAstroContext(userId)` — assembles astro context from `cosmicWeather` + user birth data | 1 |
| `convex/journal/consent.ts` | `getConsent`, `grantConsent`, `revokeConsent`, `updateConsentGranularity` | 4 |
| `convex/journal/context.ts` | `assembleJournalContext(userId)` — builds the `[JOURNAL CONTEXT]` block for Oracle | 4 |
| `convex/journal/search.ts` | `searchEntries(userId, query, filters)` — full-text search using Convex search index | 5 |
| `convex/journal/stats.ts` | `getStats(userId)` — aggregate stats: mood zone distribution, emotion cluster heatmap, entry frequency, astro correlations | 5 |
| `convex/journal/prompts.ts` | `getDailyPrompt(userId)` — algorithmic prompt selection from `journal_prompt_bank` based on moon phase, user patterns | 5 |
| `convex/journal/settings.ts` | `getSetting`, `upsertSetting`, `listAllSettings` — admin config CRUD (mirrors `oracle/settings.ts` pattern) | 6 |

### Frontend — Pages

| File | Purpose | Phase |
|---|---|---|
| `src/app/journal/layout.tsx` | Journal layout shell (sidebar with streak, nav, quick-create buttons) | 1 |
| `src/app/journal/page.tsx` | Timeline view — reverse-chronological list of entries | 1 |
| `src/app/journal/new/page.tsx` | Entry composer — freeform, check-in, dream, gratitude modes | 1 |
| `src/app/journal/[entryId]/page.tsx` | Entry detail view | 2 |
| `src/app/journal/[entryId]/edit/page.tsx` | Entry editor (reuses composer in edit mode) | 2 |
| `src/app/journal/calendar/page.tsx` | Calendar view — month grid with mood-colored dots and moon phase icons | 3 |
| `src/app/journal/search/page.tsx` | Search view — full-text search with filter sidebar | 5 |
| `src/app/journal/stats/page.tsx` | Stats & charts — mood trends, emotion heatmap, entry frequency | 5 |
| `src/app/journal/settings/page.tsx` | Journal settings — Oracle consent toggle + granularity controls | 4 |
| `src/app/admin/journal/page.tsx` | Admin overview — stats summary + link to settings | 6 |
| `src/app/admin/journal/settings/page.tsx` | Admin settings — tabbed page mirroring `/admin/oracle/settings` | 6 |

### Frontend — Components

| File | Purpose | Phase |
|---|---|---|
| **Composer** | | |
| `src/components/journal/composer/entry-composer.tsx` | Main composer — mode switcher, save logic, astro context strip | 1 |
| `src/components/journal/composer/freeform-editor.tsx` | Textarea with title + content fields | 1 |
| `src/components/journal/composer/mood-pad.tsx` | 2D valence×arousal draggable pad with mood zone labels | 1 |
| `src/components/journal/composer/emotion-selector.tsx` | Clustered emotion chips with intensity (1-2-3 dot selector) | 1 |
| `src/components/journal/composer/tag-input.tsx` | Tag input with inline chips | 1 |
| `src/components/journal/composer/astro-context-strip.tsx` | Collapsible strip showing moon phase + retrogrades | 1 |
| `src/components/journal/composer/checkin-widget.tsx` | Quick check-in: mood pad + optional emotion tags + single-line note | 1 |
| `src/components/journal/composer/dream-editor.tsx` | Dream entry: content + lucidity toggle + recurring toggle + dream signs + emotional tone | 1 |
| `src/components/journal/composer/gratitude-editor.tsx` | Gratitude entry: 3-5 item list + optional note | 1 |
| `src/components/journal/composer/energy-level-picker.tsx` | 1-5 physical energy selector | 1 |
| `src/components/journal/composer/time-of-day-picker.tsx` | Morning/midday/evening/night selector | 1 |
| `src/components/journal/composer/location-input.tsx` | Optional location — browser geolocation + city display / manual override | 2 |
| `src/components/journal/composer/voice-input-button.tsx` | Mic button + Web Speech API transcript injection | 2 |
| `src/components/journal/composer/photo-uploader.tsx` | Single photo upload to Convex `_storage` | 2 |
| **Timeline** | | |
| `src/components/journal/timeline/timeline-view.tsx` | Scrollable entry list with date separators | 1 |
| `src/components/journal/timeline/entry-card.tsx` | Entry preview card (mood zone color, title/preview, astro badge, tags) | 1 |
| `src/components/journal/timeline/date-separator.tsx` | "Today", "Yesterday", "April 16, 2026" headers | 1 |
| **Detail** | | |
| `src/components/journal/detail/entry-detail.tsx` | Full entry view with astro context, mood pad snapshot, emotions, tags, photo, location | 2 |
| `src/components/journal/detail/astro-context-card.tsx` | Expandable celestial context display | 2 |
| `src/components/journal/detail/mood-snapshot.tsx` | Read-only 2D mood position visualization + zone label | 2 |
| `src/components/journal/detail/emotion-badges.tsx` | Emotion chips with intensity dots (read-only) | 2 |
| **Calendar** | | |
| `src/components/journal/calendar/calendar-view.tsx` | Calendar grid with mood-colored dots and moon phases | 3 |
| `src/components/journal/calendar/day-cell.tsx` | Individual day cell — dot(s) colored by mood zone, moon phase icon | 3 |
| `src/components/journal/calendar/moon-phase-indicator.tsx` | Moon phase icon (emoji or SVG glyph) | 3 |
| **Search** | | |
| `src/components/journal/search/search-bar.tsx` | Search input with filter toggles | 5 |
| `src/components/journal/search/search-filters.tsx` | Filter panel: mood zone, entry type, tags, date range, moon phase | 5 |
| `src/components/journal/search/search-results.tsx` | Filtered search results with highlighted matches | 5 |
| **Stats** | | |
| `src/components/journal/stats/mood-trend-chart.tsx` | Valence and arousal over time (line chart) | 5 |
| `src/components/journal/stats/emotion-heatmap.tsx` | Cluster × frequency heatmap (which emotions spike when) | 5 |
| `src/components/journal/stats/entry-frequency-chart.tsx` | Entries per day/week/month bar chart | 5 |
| `src/components/journal/stats/astro-correlation.tsx` | "You journal most during New Moons" / "Your anxiety spikes during Mercury retrogrades" | 5 |
| `src/components/journal/stats/streak-display.tsx` | Current streak + longest streak display | 1 |
| **Consent** | | |
| `src/components/journal/consent/consent-modal.tsx` | Oracle consent flow modal | 4 |
| `src/components/journal/consent/consent-settings.tsx` | Consent management panel for settings page | 4 |
| **Admin** | | |
| `src/components/journal-admin/journal-settings-page.tsx` | Tabbed admin panel (Limits, Features, Prompt Bank, Oracle Integration) | 6 |
| `src/components/journal-admin/prompt-bank-editor.tsx` | CRUD for `journal_prompt_bank` — add/edit/toggle prompts | 6 |
| **Prompt** | | |
| `src/components/journal/prompt/daily-prompt-card.tsx` | Daily prompt display card on timeline — "Today's reflection: ..." | 5 |

### Frontend — State & Utilities

| File | Purpose | Phase |
|---|---|---|
| `src/store/use-journal-store.ts` | Zustand store for composer state, active view, UI state | 1 |
| `src/lib/journal/constants.ts` | Mood model, emotions, limits, defaults (see Section 3) | 1 |
| `src/lib/journal/voiceInput.ts` | Web Speech API wrapper | 2 |
| `src/lib/journal/location.ts` | Browser geolocation wrapper + reverse geocoding | 2 |

### Oracle Integration (Modifications to Existing Files)

| File | Change | Phase |
|---|---|---|
| `convex/oracle/llm.ts` | Add journal context assembly step between feature injection and prompt construction | 4 |
| `src/lib/oracle/promptBuilder.ts` | Add `journalContext` parameter; insert `[JOURNAL CONTEXT]` block after feature injection | 4 |
| `src/lib/oracle/features.ts` | Add `journal_recall` feature definition with `requiresJournalConsent: true` | 4 |
| `convex/oracle/sessions.ts` | Parse `JOURNAL_PROMPT:` suggestion from Oracle responses | 4 |
| `src/components/oracle/input/oracle-input.tsx` | Show "Journal about this" button when `JOURNAL_PROMPT:` is detected | 4 |
| `src/app/oracle/chat/[sessionId]/page.tsx` | Handle Oracle-to-Journal navigation | 4 |

---

## 5. Implementation Phases

### Phase 1: Core Entry System + Timeline

**Goal:** A user can create journal entries (freeform, check-in, dream, gratitude), capture their emotional state on the 2D mood pad with clustered emotions, see entries on a timeline, and have astro context automatically attached.

#### Step 1.1 — Schema
1. Add `journal_entries`, `journal_streaks`, `journal_prompt_bank`, and `journal_settings` table definitions to `convex/schema.ts`.
2. Run `npx convex dev` to validate schema push.

#### Step 1.2 — Constants
1. Create `src/lib/journal/constants.ts` with all constants from Section 3 (mood model, emotions, limits, defaults).

#### Step 1.3 — Astro Context Builder
1. Create `convex/journal/astroContext.ts`.
2. Implement `buildAstroContext(ctx, userId)`:
   - Query `cosmicWeather` for today's date (`"YYYY-MM-DD"` format).
   - Extract `moonPhase.name` → `astroContext.moonPhase`.
   - Find moon's sign from `planetPositions` where `planet === "Moon"` → `astroContext.moonSign`.
   - Find sun's sign from `planetPositions` where `planet === "Sun"` → `astroContext.sunSign`.
   - Filter `planetPositions` for `isRetrograde === true` → `astroContext.retrogradePlanets`.
   - If user has `birthData.chart`, compute which transiting planets aspect natal planets (simple conjunction/opposition/square/trine check by sign) → `astroContext.activeTransits`. Keep it simple: compare transiting sign to natal sign, flag the aspect type. No precise degree calculation needed.
   - Return the assembled `astroContext` object.

#### Step 1.4 — Entry CRUD
1. Create `convex/journal/entries.ts`.
2. Implement mutations/queries:

   **`createEntry`** (mutation):
   - Validate auth (`getAuthUserId`).
   - Validate input per entry type:
     - `freeform`: `content` required, `content.length <= MAX_CONTENT_LENGTH`.
     - `checkin`: `content` can be empty string, mood required.
     - `dream`: `content` required, optional `dreamData`.
     - `gratitude`: `gratitudeItems` required (1-5 items), content optional.
   - Validate shared fields: `tags.length <= MAX_TAGS_PER_ENTRY`, `emotions.length <= MAX_EMOTIONS_PER_ENTRY`.
   - If `mood` is provided, derive `moodZone` from `valence`/`arousal` using `deriveMoodZone()`.
   - Check `MAX_ENTRIES_PER_DAY` — count entries for this user on `entryDate`.
   - Call `buildAstroContext(ctx, userId)` → attach result.
   - Compute `wordCount` from content.
   - Insert `journal_entries` row.
   - Call `updateStreak(ctx, userId, entryDate)`.
   - Return entry ID.

   **`getUserEntries`** (query):
   - Paginated query using `by_user_created` index, descending.
   - Return entries with pagination cursor. Default page size: 20.

   **`getUserEntriesByDate`** (query):
   - Query using `by_user_date` index for a specific date or date range.
   - Used by calendar view.

   **`getEntry`** (query):
   - Fetch single entry by ID, verify `userId` matches authenticated user.

   **`updateEntry`** (mutation):
   - Verify ownership.
   - Update `content`, `title`, `mood`, `moodZone`, `emotions`, `energyLevel`, `timeOfDay`, `tags`, `isPinned`, `dreamData`, `gratitudeItems`, `location`, `photoId`, `photoCaption`.
   - Recompute `moodZone` if `mood` changed.
   - Update `wordCount`, `updatedAt`.

   **`deleteEntry`** (mutation):
   - Verify ownership. Delete entry. If photo exists, delete from `_storage`.

#### Step 1.5 — Streak Tracking
1. Create `convex/journal/streaks.ts`.
2. Implement:

   **`updateStreak`** (internal mutation, called by `createEntry`):
   - Fetch or create `journal_streaks` for user.
   - Logic:
     ```
     if lastEntryDate === today → no change (already counted)
     if lastEntryDate === yesterday → currentStreak += 1
     if lastEntryDate < yesterday → currentStreak = 1 (streak broken)
     longestStreak = max(longestStreak, currentStreak)
     totalEntries += 1
     lastEntryDate = today
     ```

   **`getStreak`** (query):
   - Return streak data for authenticated user. If no record exists, return defaults (all zeros).

#### Step 1.6 — Zustand Store
1. Create `src/store/use-journal-store.ts`:
   ```typescript
   interface JournalStore {
       entryType: EntryType;
       setEntryType: (type: EntryType) => void;

       // Composer transient state
       isComposing: boolean;
       setIsComposing: (v: boolean) => void;

       // Active view
       activeView: "timeline" | "calendar" | "search" | "stats";
       setActiveView: (view: string) => void;

       // Voice
       isRecording: boolean;
       interimTranscript: string;
       finalTranscript: string;
       setRecording: (v: boolean) => void;
       setInterimTranscript: (text: string) => void;
       setFinalTranscript: (text: string) => void;

       // Search
       searchQuery: string;
       setSearchQuery: (q: string) => void;
       searchFilters: {
           moodZone?: MoodZone;
           entryType?: EntryType;
           tags?: string[];
           dateRange?: { start: string; end: string };
           moonPhase?: string;
       };
       setSearchFilters: (filters: Partial<typeof searchFilters>) => void;
   }
   ```

#### Step 1.7 — Journal Layout
1. Create `src/app/journal/layout.tsx`:
   - Wrap journal pages with a layout that includes:
     - Sidebar with: streak display, nav links (Timeline, Calendar, Search, Stats, Settings), quick-create buttons for each entry type.
     - Top bar with "Journal" title.
     - A "New Entry" floating action button (FAB) or top-right button → navigates to `/journal/new`.
   - Use the same design language as the Oracle layout (dark theme, consistent typography).

#### Step 1.8 — Composer Page (`/journal/new`)
1. Create `src/app/journal/new/page.tsx` and `src/components/journal/composer/entry-composer.tsx`.
2. **Entry type selector** at the top: `Freeform | Check-in | Dream | Gratitude`.
3. **Astro context strip** (collapsible):
   - Shows current moon phase (icon + name), moon sign, any retrograde planets.
   - Fetched from today's `cosmicWeather` on the client side (Convex query).
   - Collapsed by default, expandable.
4. **Freeform mode:**
   - Optional title input (placeholder: "Give this entry a title...").
   - Textarea for content (placeholder: "What's on your mind?", autofocus).
   - Below textarea toolbar: mood pad, emotion selector, energy level, time-of-day, tag input, voice, photo, location.
   - Save button in top-right.
5. **Check-in mode:**
   - Mood pad (2D draggable area, compact size).
   - Emotion selector (clustered chips with intensity).
   - Optional one-line note input (placeholder: "Anything else? (optional)").
   - Save button.
6. **Dream mode:**
   - Textarea for dream description.
   - Toggle: "Was this lucid?"
   - Toggle: "Is this recurring?"
   - Dream signs input (tag-style chips — recurring symbols).
   - Emotional tone selector (text input or select: "eerie", "joyful", "confusing", etc.).
   - Mood pad + emotion selector (how the dream made you feel).
   - Save button.
7. **Gratitude mode:**
   - 3-5 text inputs for gratitude items (placeholder: "I'm grateful for...").
   - "Add another" button (max 5).
   - Optional note field.
   - Save button. Fast and low-friction.
8. On save → call `createEntry` mutation → navigate to `/journal` (timeline).

#### Step 1.9 — Timeline Page (`/journal`)
1. Create `src/app/journal/page.tsx` and timeline components.
2. **Timeline view:**
   - Reverse-chronological list of entry cards.
   - Sticky date headers: "Today", "Yesterday", "April 16, 2026".
   - Each entry card shows:
     - Mood zone color accent (left border or dot colored by mood zone).
     - Entry type badge (freeform/check-in/dream/gratitude icon).
     - Title or first ~80 chars of content (truncated).
     - Astro badge: moon phase icon + moon sign (small, subtle).
     - Emotion chips (top 2 with intensity dots).
     - Tags (first 2, "+N more" if more).
     - Time created.
     - Voice badge (🎙️) if `voiceTranscript` exists.
     - Location (city name if set).
     - Pin indicator (📌) if `isPinned`.
   - Tap card → navigate to `/journal/[entryId]`.
   - Empty state: "Your story starts here. Tap + to begin." + cosmic illustration.
3. Use Convex paginated query with infinite scroll or "Load more" button.

#### Step 1.10 — Mood Pad & Emotion Selector Components
1. `mood-pad.tsx`: A 2D draggable interactive surface (square or rounded rectangle). X-axis = valence (left negative, right positive). Y-axis = arousal (bottom calm, top activated). The user drags a point to mark their state. The current mood zone label + emoji appears dynamically as the point moves between quadrants. Initial position is center (neutral). Output: `{ valence: number, arousal: number }`.
2. `emotion-selector.tsx`: Emotions displayed in groups by cluster (connection, energy, safety, clarity). Each cluster has a subtle header. Tapping an emotion toggles it on — a small 3-dot intensity selector appears inline (●○○ mild / ●●○ moderate / ●●● strong). Default intensity on first tap: 2 (moderate). Max `MAX_EMOTIONS_PER_ENTRY` selected.
3. `energy-level-picker.tsx`: 1-5 horizontal segments. Visual: battery-style or 5 bars with labels (Depleted → Charged).
4. `time-of-day-picker.tsx`: 4 buttons with icons (🌅🌇☀️🌙). Auto-selects based on current time, user can override.
5. `tag-input.tsx`: Text input that creates tag chips on Enter/comma. Each chip has an × to remove. Validates against `MAX_TAGS_PER_ENTRY` and `MAX_TAG_LENGTH`.

---

### Phase 2: Entry Detail + Voice + Photo + Location

**Goal:** Users can view, edit, and delete entries. Voice input, single-photo attachment, and location tagging work.

#### Step 2.1 — Entry Detail Page
1. Create `src/app/journal/[entryId]/page.tsx` and `entry-detail.tsx`.
2. Display:
   - Title (h1) — or "Untitled Entry" + date if no title.
   - Entry type badge.
   - Mood snapshot: small read-only 2D visualization showing where the point landed, with mood zone label + emoji.
   - Emotion badges: chips with intensity dots (●●○ = moderate) — read-only.
   - Energy level indicator.
   - Astro context card (expandable) — moon phase, moon sign, retrograde planets, active transits rendered as readable text.
   - Full entry content (rendered with basic markdown: paragraphs, bold, italic, links).
   - Dream data card (if dream entry): lucidity, recurring, dream signs, emotional tone.
   - Gratitude items list (if gratitude entry).
   - Photo (if attached) — displayed inline, tappable to view full-size.
   - Location badge (city, country).
   - Tags list.
   - Voice badge + raw transcript toggle (if voice entry).
   - Created/updated timestamps.
   - Action buttons: Edit, Delete (with confirm), Pin/Unpin.
   - "Ask Oracle about this" button → navigates to `/oracle/new?journalEntryId=xxx`.

#### Step 2.2 — Entry Edit Page
1. Create `src/app/journal/[entryId]/edit/page.tsx`.
2. Reuse `entry-composer.tsx` in "edit mode":
   - Pre-fill all fields from existing entry data.
   - Save calls `updateEntry` mutation instead of `createEntry`.
   - Navigate back to entry detail on save.

#### Step 2.3 — Voice Input
1. Create `src/lib/journal/voiceInput.ts`:
   ```typescript
   export function isVoiceInputSupported(): boolean
   export function createVoiceRecognition(
       onInterim: (text: string) => void,
       onFinal: (text: string) => void,
       onError: (error: string) => void,
       lang?: string
   ): { start: () => void; stop: () => void } | null
   ```
   - Browser-native `SpeechRecognition` / `webkitSpeechRecognition`.
   - `continuous: true`, `interimResults: true`.
   - On Safari: attempt `processLocally = true`.

2. Create `src/components/journal/composer/voice-input-button.tsx`:
   - Microphone icon button.
   - On tap: check `isVoiceInputSupported()`. If not supported, show tooltip.
   - If supported: start recognition, show pulsing recording indicator.
   - Interim text streams into the content textarea in real-time.
   - On stop: final transcript appended to content. Also saved in `voiceTranscript` field on the entry.
   - User can edit the transcript before saving.

3. Add the voice button to the composer's toolbar.

#### Step 2.4 — Photo Upload
1. Create `src/components/journal/composer/photo-uploader.tsx`:
   - Camera/image icon button in composer toolbar.
   - On tap: file input (accept: `image/*`).
   - Validate file size (`MAX_PHOTO_SIZE_BYTES`).
   - Upload to Convex `_storage` via `generateUploadUrl` + `fetch`.
   - Store returned `storageId` as `photoId` on the entry.
   - Show thumbnail preview in composer after upload.
   - Allow removal (× button on thumbnail).

2. In entry detail: display photo using Convex `_storage` URL. Simple inline image with optional caption below.

#### Step 2.5 — Location Tagging
1. Create `src/lib/journal/location.ts`:
   ```typescript
   export function isGeolocationSupported(): boolean
   export async function getCurrentLocation(): Promise<{ lat: number; long: number } | null>
   export function formatLocationDisplay(location: { city?: string; country?: string }): string
   ```
   - Uses browser `navigator.geolocation.getCurrentPosition()`.
   - For reverse geocoding (lat/long → city name): use the Nominatim OpenStreetMap API (free, no API key needed, rate-limited). Make a simple fetch to `https://nominatim.openstreetmap.org/reverse?lat=X&lon=Y&format=json` → extract `address.city` and `address.country`.
   - Cache the last-used location in localStorage so repeat entries from the same place don't need re-geocoding.

2. Create `src/components/journal/composer/location-input.tsx`:
   - Location pin icon button in composer toolbar.
   - On tap: request geolocation permission. If granted, fetch position + reverse geocode → show "Prague, CZ" badge.
   - User can tap the badge to edit the display name manually.
   - × button to remove location.

---

### Phase 3: Calendar View

**Goal:** A visual month grid for pattern recognition at a glance.

#### Step 3.1 — Calendar Page
1. Create `src/app/journal/calendar/page.tsx` and calendar components.
2. **Calendar grid:**
   - Standard month grid (Mon–Sun columns, 4-6 rows).
   - Month/year header with left/right arrows to navigate months.
   - Each day cell shows:
     - Date number.
     - Mood-colored dot(s) — one dot per entry, colored by `moodZone` (excited=green, content=green, tense=orange, low=red).
     - Moon phase icon (small, in corner of cell) — fetched from `cosmicWeather` for that date.
     - Retrograde indicator (small glyph if any planet was retrograde that day).
   - Tap a day → show a dropdown/panel listing entries for that day → tap an entry → navigate to detail.
   - Today is highlighted.

3. **Data fetching:**
   - Query `getUserEntriesByDate` with the current month's date range.
   - Query `cosmicWeather` for the month to get moon phases and retrogrades.

---

### Phase 4: Oracle Integration

**Goal:** Oracle can read journal entries (with consent), deliver readings referencing the user's emotional state, suggest journal prompts, and support Cosmic Recall.

#### Step 4.1 — Consent Schema + CRUD
1. Add `journal_consent` table to `convex/schema.ts` (schema from Section 2).
2. Create `convex/journal/consent.ts`:

   **`getConsent`** (query):
   - Return consent record for authenticated user. If none exists, return `null`.

   **`grantConsent`** (mutation):
   - Upsert `journal_consent` row with defaults:
     ```
     oracleCanReadJournal: true
     consentGivenAt: Date.now()
     consentVersion: CONSENT_VERSION
     includeEntryContent: true
     includeMoodData: true
     includeDreamData: true
     lookbackDays: 90
     ```

   **`revokeConsent`** (mutation):
   - Set `oracleCanReadJournal: false`, `consentRevokedAt: Date.now()`.

   **`updateConsentGranularity`** (mutation):
   - Update `includeEntryContent`, `includeMoodData`, `includeDreamData`, `lookbackDays`.
   - Only allowed when `oracleCanReadJournal === true`.

#### Step 4.2 — Consent UI
1. Create `src/components/journal/consent/consent-modal.tsx`:
   - Copy:
     > "Would you like Oracle to read your journal entries to give you more personalized readings?"
     > "Oracle will only see entries from the time range you choose. You can change this or revoke access at any time."
   - Controls:
     - Toggle: Include full entry text (on/off).
     - Toggle: Include mood & emotion data (on/off).
     - Toggle: Include dream entries (on/off).
     - Select: Time range (30 days / 90 days / 1 year / All time).
   - Buttons: [Allow] [Not now].

2. Create `src/components/journal/consent/consent-settings.tsx`:
   - Persistent settings panel for `/journal/settings`.
   - If consented: shows granularity controls + "Revoke Access" button (with confirmation).
   - If not consented: shows "Enable Oracle Access" button → opens consent modal.

3. Create `src/app/journal/settings/page.tsx`.

#### Step 4.3 — Journal Context Assembly for Oracle
1. Create `convex/journal/context.ts`:

   **`assembleJournalContext`** (internal query):
   - Input: `userId`.
   - Flow:
     1. Fetch `journal_consent` for user.
     2. If `oracleCanReadJournal !== true` → return `null`.
     3. Query `journal_entries` for user within `lookbackDays`, ordered by `createdAt` desc, limit `MAX_ENTRIES_IN_CONTEXT`.
     4. For each entry, build a compact summary respecting consent granularity:
        - Always include: `entryDate`, `entryType`.
        - If `includeEntryContent`: include truncated `content` (up to `MAX_ENTRY_CHARS`).
        - If `includeMoodData`: include `moodZone`, emotion keys with intensity labels (e.g. "strongly anxious, mildly grateful"), `energyLevel`.
        - If `includeDreamData` and entry is a dream: include `dreamData`.
        - Always include `astroContext.moonPhase`.
     5. Format as the `[JOURNAL CONTEXT]` block:
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

        ---ENTRY 2026-04-15 (zone: content, dream)---
        Moon Phase: New Moon
        Dream: recurring, not lucid
        Signs: water, old house
        Emotional tone: eerie
        ---END ENTRY---

        [END JOURNAL CONTEXT]
        Use this context to give more personalized, empathetic, and informed readings.
        Reference their experiences naturally when relevant. Do not quote their journal
        verbatim unless they ask you to reference it.
        The mood data uses a 2D model: "zone" reflects the valence×arousal quadrant.
        Emotion intensity ranges from mild (1) to strong (3) — weight your interpretation accordingly.
        ```
     6. Enforce `BUDGET_CHARS` limit — truncate entries from the oldest if total exceeds budget.
     7. Return the formatted string or `null`.

#### Step 4.4 — Oracle Pipeline Integration
1. **Modify `convex/oracle/llm.ts`** (`invokeOracle`):
   - After feature injection + natal context assembly and before prompt construction:
   - Add journal context assembly step:
     ```typescript
     // Journal context
     let journalContext: string | null = null;
     try {
         journalContext = await ctx.runQuery(
             internal.journal.context.assembleJournalContext,
             { userId }
         );
     } catch (e) {
         console.error("Journal context assembly failed (non-blocking):", e);
     }
     ```
   - Pass `journalContext` to `buildPrompt()`.

2. **Modify `src/lib/oracle/promptBuilder.ts`**:
   - Update `buildSystemPrompt()` to accept optional `journalContext` parameter.
   - Insert `journalContext` as Block 3.5 (after feature injection, before title directive):
     ```
     [Block 1: ORACLE_SAFETY_RULES]
     [Block 2: soulDoc]
     [Block 3: featureInjection]
     [Block 3.5: journalContext]          ← NEW
     [Block 4: ORACLE_TITLE_DIRECTIVE]
     ```
   - Only included when `journalContext` is non-null.

3. **Update `buildPrompt()` signature**:
   ```typescript
   export function buildPrompt(
       soulDoc: string,
       featureInjection: string | null,
       natalContext: string,
       userQuestion: string,
       journalContext?: string | null
   ): { systemPrompt: string; userMessage: string }
   ```

#### Step 4.5 — Oracle-Suggested Journal Prompts
1. **Modify the Oracle title directive** to also include a journal prompt instruction:
   ```
   After your complete response, you MUST output:
   1. A session title: TITLE: <4-6 word title>
   2. If your response touched on emotional themes the user might want to journal about,
      output: JOURNAL_PROMPT: <a reflective question for journaling>
   ```

2. **Modify `parseTitleFromResponse()`** (or add a sibling function `parseJournalPromptFromResponse()`) to also extract the `JOURNAL_PROMPT:` line from the response.

3. **Modify the Oracle chat UI** (`src/app/oracle/chat/[sessionId]/page.tsx` and/or `src/components/oracle/input/oracle-input.tsx`):
   - After an Oracle response that contains a journal prompt suggestion, show a contextual CTA card beneath the response:
     > "Your reading touched on [theme]. Want to journal about this?"
     > [Journal about this →]
   - Tapping it navigates to `/journal/new?oracleSessionId=xxx&presetPrompt=...&type=freeform`.
   - The composer pre-fills the prompt as a contextual header and sets `oracleInspired: true`, `oracleSessionId`.

#### Step 4.6 — Cosmic Recall Feature
1. **Add `journal_recall` to `src/lib/oracle/features.ts`**:
   ```typescript
   {
       key: "journal_recall",
       label: "Cosmic Recall",
       shortLabel: "Recall",
       description: "Search your journal entries for patterns tied to astrological events",
       defaultPrompt: "Look through my journal and help me find patterns",
       fallbackInjectionText: "[COSMIC RECALL MODE]\nThe user has asked you to search their journal for patterns and correlations with astrological events.\nUse the journal context below to identify recurring emotional themes, astrological correlations, and growth patterns.\nCite specific entries by date and relate them to the astrological weather at the time.\n",
       requiresBirthData: false,
       requiresJournalConsent: true,
       menuGroup: "primary",
       implemented: true,
   }
   ```

2. **Add `requiresJournalConsent` field** to the `OracleFeatureDefinition` interface. When this is `true` and the user has NOT consented, the feature is shown as disabled in the menu with a "Requires journal access" tooltip.

3. **Modify `invokeOracle`** to handle `journal_recall`:
   - When `session.featureKey === "journal_recall"`, expand the journal context budget (e.g. double it to 8000 chars) and increase `MAX_ENTRIES_IN_CONTEXT` to cover more history.
   - The `fallbackInjectionText` for this feature becomes the feature injection block (Block 3).

4. **Add feature injection entry** in `oracle_feature_injections` table for `journal_recall`:
   ```
   [COSMIC RECALL MODE]
   The user wants you to analyze their journal for patterns.
   Search through the journal entries provided in [JOURNAL CONTEXT].
   Identify: recurring emotions, intensity trends, astrological correlations.
   Format your analysis as a synthesized narrative, citing specific dates.
   Connect emotional patterns to moon phases, retrogrades, and transits.
   ```

#### Step 4.7 — Oracle Sidebar "Journals" Link
1. In the Oracle sidebar, ensure a "Journals" navigation link routes to `/journal`.

---

### Phase 5: Search, Stats, and Prompt Bank

**Goal:** Users can search their journal, see emotional analytics, and receive daily writing prompts.

#### Step 5.1 — Search
1. Create `convex/journal/search.ts`:

   **`searchEntries`** (query):
   - Uses Convex `searchIndex` on `journal_entries` for full-text search on `content` field.
   - Filter by: `userId` (required), `entryType`, `moodZone`, `entryDate` range.
   - Secondary in-memory filtering: by tags (array intersection), moon phase (from `astroContext.moonPhase`).
   - Sort by: relevance (default from search) or `createdAt` desc.
   - Return paginated results.

2. Create `src/app/journal/search/page.tsx` and search components:
   - Search bar with live-typing query.
   - Filter panel (sidebar or collapsible): mood zone checkboxes, entry type checkboxes, tag multi-select, date range picker, moon phase picker.
   - Results list — reuses `entry-card.tsx` with highlighted matching text snippets.
   - Empty state: "No entries match your search."

#### Step 5.2 — Stats & Charts
1. Create `convex/journal/stats.ts`:

   **`getStats`** (query):
   - Input: `userId`, `dateRange` (optional, defaults to last 90 days).
   - Returns:
     - `moodTrend`: Array of `{ date, avgValence, avgArousal, dominantZone }` per day — for the line chart.
     - `emotionClusterFrequency`: Object `{ connection: { total, avgIntensity }, energy: {...}, ... }` — for the heatmap.
     - `topEmotions`: Top 10 emotions by frequency with average intensity.
     - `entryFrequency`: `{ daily: number[], weekly: number[], monthly: number[] }` — for the bar chart.
     - `entryTypeDistribution`: `{ freeform: N, checkin: N, dream: N, gratitude: N }`.
     - `astroCorrelations`: Array of `{ insight: string, data: any }` — e.g. "You journal 2.3x more during New Moons", "Your anxiety peaks during Mercury retrogrades".
     - `streakData`: from `journal_streaks`.

2. Create `src/app/journal/stats/page.tsx` and stats components:
   - **Mood Trend Chart** (`mood-trend-chart.tsx`): Two overlaid line charts — valence (green/red gradient) and arousal (blue gradient) over time. X-axis: dates. Shows the 2D emotional trajectory.
   - **Emotion Heatmap** (`emotion-heatmap.tsx`): Grid of cluster (rows) × time period (columns). Cell color = frequency × intensity. Reveals seasonal emotional patterns.
   - **Entry Frequency** (`entry-frequency-chart.tsx`): Simple bar chart — entries per week/month.
   - **Astro Correlations** (`astro-correlation.tsx`): Insight cards like "You journal most during New Moons (2.3x average)" or "Your safety-cluster emotions spike during Mercury retrograde". Computed by correlating entry mood data with `astroContext` fields.
   - **Streak Display** (`streak-display.tsx`): Current streak 🔥 + longest streak record.
   - Charts can use a lightweight chart library (e.g. `recharts` or `chart.js`) or CSS-only for simpler variants.

#### Step 5.3 — Prompt Bank
1. **Seed `journal_prompt_bank`** with initial prompts. Create a seed script or internal mutation `seedPromptBank`:
   
   Example prompts:
   | Category | Moon Phase | Text | Astrology Level |
   |---|---|---|---|
   | daily | — | "What was the dominant feeling today, and where did you feel it in your body?" | none |
   | daily | — | "What's one thing that happened today that you want to remember?" | none |
   | moon | New Moon | "What do you want to plant seeds for this lunar cycle?" | light |
   | moon | Full Moon | "What has come to light since the last full moon? What are you ready to release?" | light |
   | retrograde | — | "What themes have been coming up for review? What past situations are resurfacing?" | medium |
   | gratitude | — | "Name 3 things you're grateful for that you usually take for granted." | none |
   | dream | — | "Describe the most vivid image from last night's dream. What does it remind you of?" | none |
   | relationship | — | "How are your close relationships feeling right now? Is there something unspoken?" | none |
   | career | — | "What feels most meaningful in your work right now? What feels stuck?" | none |

2. Create `convex/journal/prompts.ts`:

   **`getDailyPrompt`** (query):
   - Input: `userId`.
   - Algorithm (zero LLM cost):
     1. Fetch today's `cosmicWeather` → get `moonPhase.name`, check for retrogrades.
     2. Filter `journal_prompt_bank` by `isActive: true`.
     3. If retrograde active → prioritize `category: "retrograde"` prompts.
     4. If specific moon phase (New Moon, Full Moon) → prioritize `category: "moon"` with matching `moonPhase`.
     5. Otherwise → select from `category: "daily"` pool.
     6. Use a deterministic daily rotation: `hash(userId + entryDate) % eligiblePrompts.length` to select the prompt. Same user sees same prompt all day, different users see different prompts.
   - Return: `{ text: string, category: string, moonPhase?: string }`.

3. Create `src/components/journal/prompt/daily-prompt-card.tsx`:
   - Displayed at the top of the timeline view.
   - Shows today's prompt in a subtle card with an arrow to "Write about this →".
   - Tapping → navigates to `/journal/new?presetPrompt=...`.
   - Can be dismissed (stores dismissal in localStorage for today).

---

### Phase 6: Admin Panel

**Goal:** Admin can manage journal limits, feature toggles, prompt bank, and Oracle integration settings through a tabbed UI at `/admin/journal/settings`, mirroring the existing `/admin/oracle/settings` pattern.

#### Step 6.1 — Admin Settings Backend
1. Create `convex/journal/settings.ts` (mirrors `convex/oracle/settings.ts`):

   **`listAllSettings`** (query):
   - Requires admin auth (`requireAdmin()`).
   - Return all rows from `journal_settings`.

   **`getSetting`** (query):
   - Fetch by key.

   **`upsertSetting`** (mutation):
   - Requires admin auth.
   - Upsert by key. Set `updatedAt`, `updatedBy`.

#### Step 6.2 — Admin Overview Page
1. Create `src/app/admin/journal/page.tsx`:
   - Overview card showing:
     - Total journal entries across all users.
     - Total active journalers (users with ≥1 entry).
     - Average entries per user.
     - Aggregate consent stats (how many users have Oracle journal access enabled — count only, no individual user data).
     - Global streak stats (average streak, highest streak).
   - Link to "Journal Settings →".

#### Step 6.3 — Admin Settings Page
1. Create `src/app/admin/journal/settings/page.tsx` and `src/components/journal-admin/journal-settings-page.tsx`.
2. **Tabbed interface** (same pattern as Oracle: `Tabs`, `TabsList`, `TabsTrigger`, `TabsContent`):

   **Tab 1: Limits**
   - `max_entries_per_day` — number input (1-50, default 10)
   - `max_content_length` — number input (1000-100000, default 50000)
   - `max_photo_size_bytes` — number input (default 5242880)
   - Save button → calls `upsertSetting` for each.

   **Tab 2: Features**
   - `journal_context_enabled` — toggle (Journal-Oracle integration master switch)
   - `voice_input_enabled` — toggle
   - Each toggle → immediate `upsertSetting` call.

   **Tab 3: Prompt Bank**
   - List of all prompts from `journal_prompt_bank`.
   - Each row: text (truncated), category badge, moon phase (if set), astrology level badge, active toggle.
   - "Add Prompt" button → inline form (text, category select, moon phase select, astrology level select).
   - Edit button per prompt → inline edit.
   - Toggling active → immediate mutation.
   - Component: `src/components/journal-admin/prompt-bank-editor.tsx`.

   **Tab 4: Oracle Integration**
   - `journal_context_budget_chars` — number input (1000-10000, default 4000)
   - `max_entry_context_chars` — number input (100-2000, default 500)
   - `max_context_journal_entries` — number input (1-50, default 10)
   - `default_lookback_days` — number input (7-9999, default 90)
   - Save button.

   **Tab 5: Consent Stats** (read-only)
   - Total users with consent enabled.
   - Breakdown: how many include entry content, mood data, dream data.
   - Average lookback days.
   - This is aggregate data only — never shows individual user consent settings.

---

### Phase 7: Polish & Edge Cases

**Goal:** Smooth out the experience, handle edge cases, ensure mobile responsiveness.

#### Step 7.1 — Empty States
- Timeline: "Your story starts here" + cosmic illustration.
- Calendar: No entries for this month — gentle prompt.
- Search: "No entries match your search."
- Stats: "Journal for a few days to unlock your first insights."
- Streak at 0: "Start your first entry to begin your streak."

#### Step 7.2 — Entry Validation & Error Handling
- Content too long → inline error with character count.
- Too many entries today → toast: "You've reached your daily limit. Come back tomorrow."
- Photo upload failed → toast with retry option.
- Voice input not supported → tooltip explaining browser requirements.
- Geolocation denied → graceful fallback, remove location badge.

#### Step 7.3 — Mobile Responsiveness
- Composer: Full-screen on mobile. Mood pad scales to touch. Emotion selector uses a bottom sheet.
- Timeline: Cards full-width, adequate touch targets.
- Calendar: Scrollable month grid, compact day cells.
- Entry detail: Photo renders responsively, mood snapshot adapts.
- Astro context strip: Compact on mobile.

#### Step 7.4 — Loading & Transition States
- Skeleton loaders for timeline entries, calendar cells, stats charts.
- Optimistic UI: entry appears in timeline immediately after save.
- Smooth page transitions between timeline → composer → detail.

#### Step 7.5 — Pin Entry
- Toggle pin from entry detail or long-press on timeline card.
- Pinned entries appear at the top of the timeline with a visual indicator.

#### Step 7.6 — Delete Confirmation
- Confirm dialog: "Are you sure you want to delete this entry? This action can't be undone."
- If entry has a photo, delete the stored file from `_storage`.

#### Step 7.7 — Keyboard Shortcuts
- `Cmd+Enter` / `Ctrl+Enter` in composer → Save.
- `Escape` in composer → Back to timeline (with unsaved changes warning if dirty).

---

## 6. Oracle × Journal Context — How It Makes Oracle Better

This section explains the expected behavior so the implementing agent understands the *why*.

### What Oracle Sees (Example)

A user has been journaling for 2 weeks with Oracle consent enabled. They ask Oracle: *"Why have my relationships felt so tense lately?"*

**Without journal context**, Oracle gives a generic transit reading about Venus/Mars/7th house.

**With journal context**, Oracle's system prompt includes:

```
[JOURNAL CONTEXT]
---ENTRY 2026-04-20 (zone: tense, arousal: 1.5, valence: -1.2)---
Moon Phase: Full Moon
Emotions: strongly frustrated (safety), moderately lonely (connection)
Energy: 2/5
"Had another argument with Sarah about the same thing. 
I feel like I can't communicate what I need without it turning into a fight."
---END ENTRY---

---ENTRY 2026-04-18 (zone: tense, arousal: 1.8, valence: -0.5)---
Moon Phase: Waxing Gibbous
Emotions: moderately anxious (safety), mildly restless (energy)
Energy: 3/5
"Work meeting went badly. Snapped at a coworker. Not like me."
---END ENTRY---

---ENTRY 2026-04-15 (zone: low, checkin)---
Moon Phase: First Quarter
Emotions: mildly confused (clarity)
---END ENTRY---
[END JOURNAL CONTEXT]
```

Now Oracle can say: *"With Mars squaring your natal Venus this week, the tension you've been experiencing — particularly the recurring arguments with Sarah and the snapping at work — lines up with how Mars activates your 7th house of partnerships. Your journal shows this has been building since mid-April, and the intensity of your frustration has been escalating (strongly frustrated vs. mildly confused a week earlier)..."*

The 2D mood data lets Oracle distinguish between a user who is "low and exhausted" vs "tense and agitated" — leading to fundamentally different astrological interpretations and advice.

**This is the product. This is why journal exists.**

---

## 7. Design Direction

The Journal should feel like a **private, reflective space** — distinctly different from Oracle's conversational energy.

- **Color palette:** Deep indigo/navy backgrounds, soft moonlight accents (silver, pale blue, muted gold).
- **Typography:** Same font stack as the rest of the app, but favor lighter weights and more generous line height for readability.
- **Mood zone colors:** Use the mood zone colors as subtle accents — left-border highlights on cards, small dots on calendar, background tints on mood pad quadrants. Not overwhelming fills.
- **Mood pad:** A beautiful 2D interaction surface with gradient quadrant backgrounds (green top-right for excited, soft green bottom-right for content, orange top-left for tense, red bottom-left for low). The draggable point has a glow effect.
- **Emotion chips:** Grouped by cluster with subtle cluster headers. Selected chips have their polarity color (green positive, red negative, gray neutral). Intensity dots are small and elegant (●●○).
- **Astro context:** Rendered as a quiet, elegant strip — not flashy. Moon phase glyph + sign name in a muted pill/badge.
- **Animations:** Subtle. Entry cards fade in on scroll. Mood pad point has smooth drag physics. Streak counter animates on change. Calendar dots pulse gently on the current day.
- **Voice recording:** Pulsing concentric circles around the mic icon during recording.
- **Empty state:** A gentle cosmic illustration (moon, stars) with inviting copy.
- **Stats charts:** Clean, minimal chart style. No 3D effects. Consistent color palette from mood zones.

> **Important:** Follow the existing design system used by Oracle. The journal should feel like it belongs to the same product. Reference `/admin/oracle/settings` for admin panel styling patterns — same Card, Tabs, and form component usage.

---

## 8. What Comes After This Version

These are explicitly **not in scope** but documented for future planning:

1. **Books/collections** — Organize entries into separate journals.
2. **Guided entry type with template engine** — System templates with prompt types, astro token injection. More complex than the prompt bank.
3. **User-created templates** — Let users build their own guided journaling flows.
4. **Streak notifications** — Browser/push notifications for streak maintenance.
5. **Audio recording storage** — Save voice memo blob alongside transcript.
6. **Entry sharing/export** — Export as markdown/PDF.
7. **Map view** — Plotted entries on a world map by location.
8. **Therapist-mode export** — Anonymized emotional data export for mental health professionals.

---

*This plan describes Journal MVP v1 for stars.guide. It is designed to be implemented by an AI agent following the phases sequentially. Each phase is self-contained and testable. The schema, file map, and step-by-step instructions are intentionally concrete to minimize ambiguity.*
