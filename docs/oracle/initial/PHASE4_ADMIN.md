# PHASE 4 — Admin Panel Architecture
## /admin/oracle/* — Full Oracle CMS

---

## Overview

The admin panel is the **single source of truth** for all Oracle content and configuration. It provides full CRUD over every layer of the Oracle system — content, prompts, model settings, and quota limits — without requiring code changes or redeployments.

All admin routes are under `/admin/oracle/` and are protected by role check (`users.role === 'admin'`) enforced at both the Next.js middleware layer and in every Convex mutation.

---

## Route Map

```
/admin/oracle/                        ← Overview dashboard
/admin/oracle/categories              ← Manage the 6 domain badges
/admin/oracle/templates               ← Manage template questions
/admin/oracle/follow-ups              ← Manage follow-up questions + options
/admin/oracle/context-injection       ← Manage category contexts + scenario injections
/admin/oracle/settings                ← Soul prompt, model config, quotas, kill switches
```

---

## /admin/oracle/ — Overview Dashboard

**Purpose**: At-a-glance health of the Oracle system.

**Displays:**
- Oracle ON/OFF status badge (large, prominent — green/red)
- Current primary model (A), with fallback B and C shown
- Active categories count / Active templates count / Active follow-ups count
- Sessions created: today / last 7 days / last 30 days
- Top 5 most-used template questions (by session count)
- Last soul prompt update: timestamp + who saved it
- Current quota limits per role (read-only summary table — click to edit → /settings)
- Quick links: "Edit Soul Prompt" → /settings, "View Model Config" → /settings

---

## /admin/oracle/categories

**Purpose**: Manage the 6 category domain badges.

**Features:**
- Table of all categories sorted by `displayOrder`
- Drag-to-reorder rows (updates `displayOrder` via batch patch)
- Per-row: toggle active/inactive (switch), edit button, session count badge
- Edit modal (Radix Dialog):
  - Name (text)
  - Slug (text, validated: lowercase, no spaces, unique)
  - Icon (Lucide icon picker or emoji text input)
  - Color (hex color picker)
  - Description (textarea, for admin reference only)
- Deactivating a category with active sessions in the last 24h shows a warning: "X sessions opened in this category today. Deactivating will hide it from users immediately."
- No hard delete — soft deactivation only

---

## /admin/oracle/templates

**Purpose**: Manage template questions per category.

**Features:**
- Category tab bar at top (All + one tab per category)
- Per-category: list of templates with drag-to-reorder
- Per-template row: question text (truncated), `requiresThirdParty` badge (shows "3rd Party" if true), active toggle, follow-up count, session count, edit button
- Create template button: opens modal
  - Select category
  - Question text (full question as shown to user)
  - Short label (admin display)
  - `requiresThirdParty` toggle — **with tooltip**: "Turn on if Oracle needs to ask about another person involved. Turn off if the question is purely about the user (Oracle will use their natal chart directly)."
  - Display order (auto-set to last, draggable after creation)
- Edit template: same fields as create
- **Warn on edit if sessions > 0**: "X existing conversations use this template. Changes apply to new sessions only."
- Soft deactivation only

---

## /admin/oracle/follow-ups

**Purpose**: Manage follow-up questions and their answer options per template.

**Features:**
- Template selector (searchable dropdown — shows template text + category)
- Once selected, shows:
  - `requiresThirdParty` status badge — if `false`, shows a notice: "This template skips follow-ups. Follow-ups defined here will not be shown to users unless requiresThirdParty is enabled on the template."
  - List of up to 3 active follow-up questions for the template
  - "Add Follow-up" button (disabled when count = 3, tooltip: "Maximum 3 follow-ups per template")
- Per follow-up question card:
  - Drag handle (reorder 0–1–2)
  - Question text (editable inline)
  - Question type selector: `single_select | multi_select | free_text | date | sign_picker | conditional`
  - Context label (editable inline) — how it appears in the assembled prompt context
  - `isRequired` toggle
  - For `single_select` / `multi_select`: inline options editor
    - Add option, edit label + value, drag-to-reorder, delete
  - For `conditional`: additional fields — "Show when follow-up #X answer equals [value]"
  - Active toggle, delete button (soft delete)
- **Live Preview Panel** (right side): renders a mock of the Oracle follow-up flow as it would appear to a user, updating in real-time as you edit. Shows all 3 questions in sequence with the correct input type rendered.

---

## /admin/oracle/context-injection

**Purpose**: Edit the prompt injection layers — the highest-leverage content editing page in the admin.

**Two sections with tabs:**

### Tab A: Category Contexts
- One card per category
- Each card shows:
  - Category name + icon
  - Textarea with the current `contextText`
  - Version number + last saved timestamp + who saved
  - "Save" button → saves new version, updates active record
  - "View History" button → opens version history drawer
    - List: version number, timestamp, saved by, optional label
    - "Preview" per version (expands to show full content)
    - "Restore" button with confirmation dialog
- **Assembled Prompt Preview**: button above the textarea — "Preview in context" — opens a modal showing the full assembled system prompt (soul + this category context + a placeholder scenario injection) as it would be sent to the LLM

### Tab B: Scenario Injections
- Template selector (searchable)
- For selected template, form with:
  - **Mode toggle**: "Structured fields" vs "Raw override text"
  - Structured mode fields:
    - Tone Modifier (text input)
    - Psychological Frame (text input)
    - Avoid (textarea)
    - Emphasize (textarea)
    - Opening Acknowledgment Guide (textarea)
  - Raw override mode:
    - Single large textarea for full freeform injection text
    - Note: "This overrides all structured fields above"
  - Version number + last saved + "View History" (same as category contexts)
  - "Save" → creates version, updates active
- **Full Prompt Preview button**: shows soul + category context + this injection assembled together. This is the most important UX feature of this page — admin sees exactly what Oracle will receive.

---

## /admin/oracle/settings

**Purpose**: Control soul prompt, model config, quota limits, and operational switches.

**Sections (tabs or accordion):**

---

### Section 1: Soul Prompt

- Full-width monospace textarea (large — minimum 400px height)
- Syntax reference sidebar (collapsible):
  - Explains `[SECTION_NAME]` format
  - Lists available variables: `{userName}`, `{sunSign}`, `{domain}`
  - Links to Phase 2 documentation
- Current version number + last saved + who saved
- "Save Soul Prompt" → creates version, updates active
- "View Version History" → drawer with list + diff view + restore
- **"Preview Full System Prompt"** button: renders the complete assembled system prompt for a sample user (using dummy natal data) to show exactly what Oracle receives

---

### Section 2: Model Configuration

**Primary Model (A):**
- Dropdown using `MODEL_OPTIONS` list:
  ```
  Grok 4.1 Fast       (xAI)
  Grok 4.1            (xAI)
  Gemini 2.5 Flash Lite (Google)
  Gemini 2.5 Flash    (Google)  ← recommended default
  Claude Sonnet 4     (Anthropic)
  GPT-4.1 Mini        (OpenAI)
  Trinity Large Preview (Arcee AI) [free]
  ```
- OR free text input for any valid OpenRouter model string
- Provider badge shown next to selected model

**Fallback Model B:**
- Same dropdown as above (independent selection)
- Label: "Used if Model A fails"

**Fallback Model C:**
- Same dropdown
- Label: "Used if Models A and B fail"

**Fallback Response D:**
- Textarea
- Label: "Shown to user if all models fail — no LLM call"
- Note: "This is always hardcoded in the app as a last resort. Changes here update what users see."

**Temperature:**
- Slider: 0.0 → 1.0, step 0.05
- Left label: "🎯 Precise" | Right label: "🌀 Creative"
- Current value displayed numerically
- **Recommended: 0.82** — shown as a green dot on the slider track
- Below slider: contextual guidance: "For Oracle: 0.75–0.85 recommended. Below 0.7 responses feel clinical. Above 0.9 risks hallucinating chart details."

**Max Output Tokens:**
- Number input: range 200–1500
- Below input: "Approximate word count: {value / 1.33}" (live calculation)
- **Recommended: 600** — shown as annotation
- Guidance: "~450 words. Oracle responses should feel complete but not overwhelming. 400–500 words is the mystical sweet spot."

**Top-p:**
- Slider: 0.5 → 1.0, step 0.01
- **Recommended: 0.92**
- Guidance: "0.90–0.95 is ideal for Oracle. Lower = more predictable, higher = more surprising."

**Streaming:**
- Toggle on/off
- Warning if off: "Disabling streaming removes the 'Oracle speaking' effect. Not recommended for production."

**"Test Current Config" button:**
- Sends a test prompt (predefined, with dummy natal data) using current model A settings
- Shows raw LLM response in a modal + token counts + which model was used + latency

---

### Section 3: Quota Limits

Table layout — one row per role:

| Role | Limit | Reset | Actions |
|------|-------|-------|---------|
| Free (`user`) | [number input] | Never (lifetime) | Save |
| Popular | [number input] | 24h rolling | Save |
| Premium | [number input] | 24h rolling | Save |
| Moderator | [number input] | 24h rolling | Save |
| Admin | [number input] | 24h rolling | Save |

- Number inputs have minimum value: 1 (cannot set to 0 for any paid tier)
- Free tier minimum: 1, no maximum enforced
- Changes save immediately per row (no global save button — each row saves independently)
- **Confirmation modal** for changes that would reduce any limit: "This will reduce the quota for X users currently in this tier. They will hit the new limit sooner. Confirm?"
- Below table: current usage statistics — "Users who have hit their daily limit today: X" (per tier)

---

### Section 4: Operational Controls

**Oracle Kill Switch:**
- Large, prominent toggle with status indicator
- Green: "✓ Oracle is LIVE — users can access Oracle"
- Red: "✗ Oracle is OFFLINE — all users see the offline message"
- Toggling off requires typing "CONFIRM" in a dialog
- When offline, users see `fallback_response_text` for any attempt to use Oracle

**Crisis Response Text:**
- Textarea — what users see if a crisis keyword is detected
- Must not be empty — validated on save
- Guidance: "This is shown instead of calling the LLM. Be compassionate, provide a resource (e.g. Crisis Text Line: text HOME to 741741)."

---

## Admin Auth & Security

**Next.js Middleware** (`/middleware.ts`):
```typescript
// Intercept all /admin/* requests
// Check Convex Auth session → if no session: redirect to /login?redirect=/admin/oracle
// If session but role !== 'admin': return 403 page
```

**Convex-side guard** (applied to every admin mutation):
```typescript
async function assertAdmin(ctx: MutationCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new ConvexError("Unauthenticated");
  const user = await getUserByIdentity(ctx, identity);
  if (!user || user.role !== 'admin') throw new ConvexError("Unauthorized");
}
```

Frontend route protection is UX only. Convex mutations are the security boundary.

---

## Admin UI Component Patterns

| Pattern | Component | Usage |
|---------|-----------|-------|
| Data tables | `@tanstack/react-table` | Categories, templates, follow-ups |
| Drag reorder | `motion` drag + Convex batch patch | Ordering templates, follow-ups |
| Modals | `@radix-ui/react-dialog` | Create/edit forms |
| Selects | `@radix-ui/react-select` | Category filters, model selectors, type selectors |
| Toasts | `sonner` | Save confirmations, error notifications |
| Tabs | `@radix-ui/react-tabs` | Section navigation within pages |
| Toggles | Custom (Radix Checkbox base) | Active/inactive, kill switch |
| Forms | `react-hook-form` + `zod` | All create/edit forms with validation |
| Sliders | Custom `<input type="range">` with Tailwind | Temperature, top-p |
| Version drawer | Custom slide-over | History + diff + restore |
| Prompt preview modal | Custom full-width Dialog | Assembled prompt preview |