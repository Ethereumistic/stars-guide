# Stars.Guide: Next.js + Convex Admin Orchestration Plan

## 1. Tech Stack Requirements
* **Framework:** Next.js 16 (App Router).
* **Database & Backend:** Convex (ALREADY INSTALLED) (`pnpm i convex`).
* **Styling & UI:** Tailwind CSS, Shadcn UI Components (ALREADY INSTALLED) (`Sidebar`, `DataTable`, `Form`, `Textarea`, `DatePicker`, `Select`, `Progress`). The pnpm add @tanstack/react-table is also installed specifically for DataTable.
* **AI Gateway:** OpenRouter API (using `fetch` inside Convex Node actions).

## 2. Convex Schema Definition (`convex/schema.ts`)
Create the following tables with strict type definitions:

```typescript
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  systemSettings: defineTable({
    key: v.string(), // e.g., "master_context"
    content: v.string(), // Raw markdown of the master prompt
  }).index("by_key", ["key"]),

  zeitgeists: defineTable({
    title: v.string(),
    isManual: v.boolean(),
    archetypes: v.optional(v.array(v.string())), // Only if isManual is false
    summary: v.string(),
    createdAt: v.number(),
  }),

  horoscopes: defineTable({
    zeitgeistId: v.id("zeitgeists"),
    sign: v.string(),
    targetDate: v.string(), // ISO format "YYYY-MM-DD"
    content: v.string(),
    status: v.union(v.literal("draft"), v.literal("published")),
  }).index("by_sign_and_date", ["sign", "targetDate"]), // Crucial for the Upsert Override
});
```

## 3. Convex Actions & Resilience (`convex/ai.ts`)
Convex actions using `"use node"` must be engineered to handle LLM unreliability.

1.  **`synthesizeZeitgeist`**: 
    * Takes an array of archetypes. Calls OpenRouter. Returns a 3-sentence psychological summary.
2.  **`generateHoroscopesBatch`**:
    * Takes `zeitgeistSummary`, `targetSigns` (Array), `dates` (Array), and `modelId`.
    * **Resilience Measure:** Do NOT run all 12 signs in a single massive `Promise.all()`. OpenRouter BYOK limits or model load times will cause timeouts. Instead, the action processes the `targetSigns` array in batches of 3, awaiting each batch before starting the next.
3.  **The JSON Sanitizer (Crucial Utility)**:
    * Even instructed otherwise, LLMs sometimes return ```json { ... } ``` instead of raw JSON. 
    * Before parsing the OpenRouter response, run a regex utility to strip markdown wrappers: 
      `const cleanJson = responseText.replace(/```json\n?|```/g, '').trim();`
      `return JSON.parse(cleanJson);`

## 4. Admin UI Routes (`/src/app/(admin)/admin`)

### A. Layout (`/admin/layout.tsx`)
* Implement Shadcn `<SidebarProvider>` and `<AppSidebar>`.
* Navigation items: Dashboard, Context Editor, Zeitgeist Engine, Generation Desk, Review & Publish.

### B. Context Editor (`/admin/context/page.tsx`)
* Fetch `master_context` from `systemSettings`.
* Render a large `<Textarea>` for the admin to directly edit the rules.
* "Save Changes" button updates the database row.

### C. Zeitgeist Engine (`/admin/zeitgeist/page.tsx`)
* **Toggle Switch:** "Manual Override" vs "AI Synthesis".
* **Manual Mode:** Shows a `<Textarea>` for the admin to directly write the emergency summary (e.g., "Aliens invaded.").
* **AI Mode:** Shows dynamic input fields for world events.
* "Save Zeitgeist" commits the record to `zeitgeists`.

### D. Generation Desk (`/admin/generator/page.tsx`)
* **Controls:** Zeitgeist Dropdown, Model Select Dropdown (Grok, Claude, Gemini), Date Range Picker, 12 Sign Checkboxes.
* **UX/UI:** When "Generate" is clicked, show a Shadcn `<Progress>` bar. Because LLM generation takes time, polling the Convex database or returning a stream ensures the admin knows the system hasn't frozen.
* **Execution:** Calls `generateHoroscopesBatch`. Upon return, calls the `upsertHoroscopes` mutation.

### E. The Upsert Mutation (`convex/mutations.ts`)
* Takes the cleaned JSON array.
* Loops through the data. Queries `.withIndex("by_sign_and_date")`. 
* If a record exists, `.patch()` it (overwriting old context). If not, `.insert()` it. 

### F. Review & Publish (`/admin/review/page.tsx`)
* Implement Shadcn `<DataTable>`.
* Columns: Status, Date, Sign, Content, Character Count.
* **Validation UI:** The "Character Count" cell text turns red if `< 330` or `> 460`.
* Checkbox selection to bulk update `status` from "draft" to "published".

---

## 5. Underwater Stones (Invisible Risks & Mitigations)

### Risk 1: Serverless Function Timeouts (The 60-Second Trap)
* **The Problem:** If you select 7 days of horoscopes for 12 signs using a heavy model (like Claude 3.5 Sonnet or Llama 70b), the generation will take longer than 60 seconds. Vercel/Next.js edge functions or standard serverless routes will violently time out and kill the process.
* **The Mitigation:** Because we are using Convex, we bypass Next.js API timeout limits. Convex background actions can run for up to 5 minutes. We will orchestrate the OpenRouter calls *entirely* within Convex actions, keeping Next.js strictly as a UI layer.

### Risk 2: BYOK Rate Limiting (HTTP 429)
* **The Problem:** Firing 12 concurrent requests to OpenRouter might hit your specific API key's concurrency limits (e.g., Anthropic strictly limits concurrent calls on lower tiers).
* **The Mitigation:** In the `generateHoroscopesBatch` action, implement a simple sleep function (`await new Promise(r => setTimeout(r, 2000))`) between batches of 3. It extends generation time by a few seconds but guarantees 100% success rate.

### Risk 3: Context Window Creep (Dilution of Prompt)
* **The Problem:** Over the months, you might keep adding new rules to the `master-astrology-context.md` file without deleting old ones. Eventually, the prompt gets so large that the LLM suffers from "Lost in the Middle" syndrome (ignoring your JSON formatting rules because they are buried).
* **The Mitigation:** In the `/admin/context/page.tsx` UI, add a live token-count estimator (using a simple `text.length / 4` math function). If the context exceeds 6,000 tokens, display a warning badge: "Prompt is becoming too dense. Consider compressing."