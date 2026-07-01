# Birth Chart Report Flow

_Last updated: 2026-06-15_

This document explains the current Birth Chart Report flow from entering Oracle to report generation and later reuse in chat.

## Purpose

The Birth Chart Report is a durable, generated Markdown report stored on the user document. Once completed, Oracle treats it as the user's birth-chart foundation and prefers it over re-deriving the whole reading from raw birth data in every chat.

The UX goal is: keep users inside the normal Oracle chat, automatically start the report flow when a user with birth data tries to chat without a completed report, collect a few personalization answers above the input, generate the report asynchronously, then continue chat with the finished report available.

The report is not a separate always-pinned sidebar object. It is tied to the specific Oracle session that triggered or submitted the Birth Chart Report flow.

## Main data model

### `users.birthChartReport`

Defined in `convex/schema.ts`.

Important fields:

- `status`: `pending | generating | completed | failed`
- `markdown`: completed report Markdown
- `profilingAnswers`: structured personalization answers
  - `currentSeason?: string[]`
  - `reportFocus?: string[]`
  - `growthPattern?: string[]`
  - `tonePreference?: string`
  - `preferredName?: string`
  - `pronouns?: string`
  - `customContext?: string`
  - legacy v1 fields are still accepted
- `onboardingStep`: currently uses `questionnaire` or `queued` for the v2 chat questionnaire flow
- `oracleSessionId`: the Oracle session that owns/triggered the Birth Chart Report flow
- `generatedAt`, `errorMessage`, `version`

### `birth_chart_report_jobs`

Async queue table. One active queued/processing job per user is enforced by `getActiveJobForUser` before creating jobs.

## Sidebar behavior

File:

- `src/components/oracle/sidebar/past-whispers-section.tsx`

The Past Whispers sidebar **does not** render an always-present `Birth Chart Report` button anymore.

Current behavior:

1. Past Whispers renders only real Oracle sessions from `api.oracle.sessions.getUserSessions`.
2. The birth report session appears naturally in that list only after such a session exists.
3. The session whose id equals `currentUser.birthChartReport.oracleSessionId` gets the birth chart glyph (`GiMazeCornea`) via `SessionListItem`.
4. Other `featureKey: "birth_chart"` sessions do **not** get that glyph just because they used birth chart context.

Relevant files:

- `src/components/oracle/sidebar/past-whispers-section.tsx`
- `src/components/oracle/sidebar/session-list-item.tsx`
- `src/components/oracle/sidebar/use-oracle-sessions.ts`
- `src/components/oracle/sidebar/utils.ts`

Important implementation detail: `SessionItem` carries `featureKey`, but the report icon is controlled by an explicit `isBirthChartReportSession` prop, computed from `currentUser.birthChartReport.oracleSessionId === session._id`. This prevents every birth-chart-related chat from looking like the durable report session.

### Legacy helper mutation

`convex/oracle/sessions.ts` still contains `createBirthChartReportSession`. It can create/reuse a dedicated report session, but the sidebar no longer calls it as an always-visible pinned entry. The primary path is the normal `/oracle/new` chat flow described below.

## New Oracle session / first user message flow

Normal sessions are created from `/oracle/new` via:

- `api.oracle.sessions.createSession`

When a user sends a message in `/oracle/chat/[sessionId]`, the page calls:

- `api.oracle.llm.invokeOracle`

File:

- `convex/oracle/llm.ts`

Early in `invokeOracle`, after loading the current user, there is a Birth Chart Report gate:

```ts
const missingBirthChartReport = Boolean(
  user?.birthData && user.birthChartReport?.status !== "completed",
);
```

If the user has birth data but no completed report, normal LLM routing is skipped. Oracle starts or continues the Birth Chart Report onboarding instead.

### First missing-report response

If `users.birthChartReport` is missing or has no `onboardingStep`:

1. `internal.birthChartReport.queue.startChatOnboarding` is called with the current `sessionId`.
2. That mutation sets:
   - `status: "pending"`
   - `onboardingStep: "questionnaire"`
   - `oracleSessionId: sessionId` if none exists
3. `invokeOracle` adds one hardcoded assistant message with:
   - `modelUsed: "birth_chart_report_onboarding"`
   - `fallbackTierUsed: "D"`
4. The action returns without calling an LLM provider.

The hardcoded assistant copy explains that Oracle needs to create the Birth Chart Report before proceeding.

## Client-side fake streaming

Hardcoded onboarding messages are stored complete in Convex, but the chat UI animates fresh ones locally.

File:

- `src/app/(app)/oracle/chat/[sessionId]/page.tsx`

Relevant component:

- `FakeStreamingOnboardingMessage`

A message fake-streams when:

- `msg.modelUsed === "birth_chart_report_onboarding"`
- it is the latest assistant message
- it is fresh enough

The questionnaire is intentionally delayed while this reveal is happening. The page computes `onboardingWelcomeStillRevealing`, and only shows the questionnaire when the reveal window has passed.

## Questionnaire UI

Component:

- `src/components/oracle/birth-report/BirthReportQuestionnaire.tsx`

It appears above the normal Oracle input, as an expansion of the input area. It does not replace the chat page.

Features:

- one question at a time
- option badges
- custom answer input inside the module
- back / next / skip
- final review
- “Begin report” submit

Current question categories:

1. current life season
2. report focus
3. inner/growth pattern
4. guidance emphasis
5. preferred name
6. pronouns / wording preference
7. optional self-knowledge context

Important implementation detail: the normal Oracle input is disabled while the questionnaire is active, but the questionnaire itself must only receive the busy/quota disabled state, not the normal input disabled state. Otherwise badge selection and Begin Report become disabled.

The questionnaire is scoped to the origin report session only. In `src/app/(app)/oracle/chat/[sessionId]/page.tsx`, `isReportOriginSession` is computed from:

```ts
currentUser.birthChartReport.oracleSessionId === sessionId
```

The questionnaire, generating card, and ready card are only shown when this is true.

## Submitting the questionnaire

On final submit, the chat page calls:

- `api.birthChartReport.queue.submitReportQuestionnaire`

with:

- `answers`
- current `sessionId`
- priority `2`

File:

- `convex/birthChartReport/queue.ts`

The action:

1. Authenticates the user.
2. Calls `saveCompletedQuestionnaire` internal mutation.
3. Enqueues generation idempotently via `enqueueReportGenerationForUser`.
4. Schedules the worker immediately with `ctx.scheduler.runAfter(0, internal.birthChartReport.worker.processNextJobs, { limit: 1 })`.

`saveCompletedQuestionnaire` stores all answers at once and sets:

- `status: "pending"`
- `onboardingStep: "queued"`
- `oracleSessionId: submitted sessionId` if provided

The chat page also inserts one normal user message:

```txt
I answered the Birth Chart Report questions. Please create my report.
```

It does not insert a user message per question.

## Queue and worker pipeline

Files:

- `convex/birthChartReport/queue.ts`
- `convex/birthChartReport/worker.ts`
- `convex/birthChartReport/generate.ts`
- `convex/birthChartReport/prompts.ts`
- `convex/birthChartReport/mutations.ts`

Pipeline:

1. Job is created in `birth_chart_report_jobs` with `status: "queued"`.
2. Worker `processNextJobs({ limit })` pulls queued jobs by status.
3. Worker marks job processing with `markJobProcessing`.
4. `markJobProcessing` also patches the user report status to `generating`.
5. Worker calls `generateAndSaveReport`.
6. `generateAndSaveReport` loads the user via internal query/mutation calls, builds prompts, selects an Oracle provider, calls the LLM endpoint, sanitizes Markdown, validates required sections, and saves it.
7. Completed report is stored at `users.birthChartReport.markdown` with `status: "completed"`, `generatedAt`, and `version`.
8. `saveCompletedReport` also updates the origin session if `users.birthChartReport.oracleSessionId` exists:
   - `title: "Birth Chart Report"`
   - `titleGenerated: true`
   - `featureKey: "birth_chart"`
   - refreshed `updatedAt` and `lastMessageAt`
9. Worker marks the queue job completed.
10. If generation fails, `markJobFailed` retries until `maxAttempts`; terminal failure sets user report `status: "failed"` and `errorMessage`.

Important Convex rule: actions do not use `ctx.db` directly. Generation and worker actions use `ctx.runQuery` / `ctx.runMutation`.

## Report prompt

File:

- `convex/birthChartReport/prompts.ts`

Version:

- `BIRTH_CHART_REPORT_VERSION = 3`

Generation settings in `convex/birthChartReport/generate.ts`:

- `temperature: 0.55`
- `maxTokens: 6000`
- minimum Markdown length: `2200`
- validates that required premium sections are present before saving

The report prompt now follows the birth-chart interpretation standard:

- evidence-first
- chart-faithful
- non-deterministic
- synthesis-led
- emotionally memorable
- beautiful but precise
- practical
- psychologically grounded

Required report section order:

1. `# Birth Chart Report for {name}`
2. short blockquote motto/invocation rooted in chart evidence
3. `## Chart at a Glance`
4. `## Your Chart in One Sentence`
5. `## The Core Myth of Your Chart`
6. `## Your Dominant Signatures`
   - 3–5 signature cards
   - each with **Evidence**, lived experience, **Gift**, **Watch for**, and **Practice**
7. `## Inner World & Emotional Care`
8. `## Outer Self & Life Approach`
9. `## Mind, Voice & Learning Style`
10. `## Love, Desire & Attachment Patterns`
11. `## Work, Calling & Public Direction`
12. `## North Node Growth Path`
13. `## Gifts You Can Trust`
14. `## Growth Edges / Shadow Patterns`
15. `## Practices for Integration`
16. `## Reflection Prompts`
17. `## Personal Motto / Closing Blessing`

Prompt safety/quality rules:

- every major claim must cite nearby chart evidence
- profiling answers are wrapped as untrusted context and may only guide emphasis
- do not invent placements, houses, dignities, aspects, chart ruler, MC, or patterns
- say “10th-house emphasis” rather than MC if MC data is unavailable
- avoid deterministic, medical, legal, financial, fatalistic, or unsupported trauma claims
- avoid inflated labels like “chosen,” “old soul,” “destined,” “guaranteed,” or “psychic healer”

## Birth context and synthesis helpers

File:

- `src/lib/oracle/featureContext.ts`

`buildUniversalBirthContext` now includes deterministic synthesis helpers in addition to raw placements/houses/aspects:

- traditional chart ruler line
- concentrations / clusters by sign and house
- nodal axis
- full aspect list sorted by orb strength
- explicit evidence rule

The chart context tells the model to treat stored chart data as canonical truth and to avoid inventing anything not listed.

## Report renderer/page

Report page:

- `src/app/(app)/oracle/birth-chart-report/page.tsx`

Renderer:

- `src/components/oracle/BirthChartReportRenderer.tsx`

The page is a scrollable transparent page inside the Oracle shell so the star background shows through. It does not start onboarding. It only displays a completed report or a not-ready state.

The renderer provides premium visual hierarchy for:

- hero-style title
- section headers
- signature-card-like `h3` blocks
- blockquotes
- list cards
- tables
- print styles

The Print / PDF button is below the report content. Back navigation lives in the Oracle top bar for this route.

## Completed report reuse in normal Oracle chat

Once `users.birthChartReport.status === "completed"` and `markdown` exists, `convex/oracle/llm.ts` injects the report into the Oracle pipeline context.

Files:

- `src/lib/oracle/pipelineTypes.ts`
- `src/lib/oracle/pipelines/birthChart.ts`
- `src/lib/oracle/featureContext.ts`
- `convex/oracle/llm.ts`

For the `birth_chart` pipeline, the completed report is inserted as:

```txt
[BIRTH CHART REPORT]
...
```

Raw birth data may still be included as:

```txt
[BIRTH CHART RAW DATA — REFERENCE ONLY]
...
```

When a completed report exists, the birth chart pipeline combines:

- mentor-mode instructions that teach from the report first
- depth instructions from `getBirthChartDepthInstructions`
- report context
- raw chart data as reference

The mentor-mode standard is:

- ground answers in the report first
- cite exact evidence when expanding beyond the report
- preserve evidence-first, chart-faithful, emotionally memorable, practical, non-deterministic interpretation
- use named signatures and lived-experience language for broad answers
- for major claims, use: Evidence → lived experience → gift → watch-for → practice

## Chat ready/generating states

In `/oracle/chat/[sessionId]`:

- If this is the report origin session, `status !== "completed"`, and `onboardingStep === "queued"` or `status === "generating"`, a crafting state appears above the input.
- If this is the report origin session and `status === "completed"`, a ready card can appear above the input with:
  - Continue chatting
  - Open report

Important scoping rule: the questionnaire, generating card, and ready card are only displayed in the session whose id equals `users.birthChartReport.oracleSessionId`. New chats should not show the “report ready” card just because the user has a completed report.

Important bug fix: `reportGenerating` must explicitly exclude `status === "completed"`, because old documents can keep `onboardingStep: "queued"` after completion. Otherwise the normal input stays disabled with “Your report is being crafted…” even though the report is complete.

The ready card is dismissible per session via “Continue chatting”; it should not block normal input.

## Common pitfalls

- Do not render an always-visible Birth Chart Report button in Past Whispers.
- Do not put the birth report icon on every `featureKey: "birth_chart"` session. Only the `users.birthChartReport.oracleSessionId` session gets it.
- Do not show questionnaire/generating/ready report cards in unrelated sessions.
- Do not send questionnaire answers as separate normal chat messages.
- Do not show the questionnaire before the hardcoded welcome has finished fake-streaming.
- Do not disable the questionnaire using the same boolean that disables the normal Oracle input.
- Do not treat `onboardingStep: "queued"` alone as generating if `status === "completed"`.
- Do not call external LLM providers from queries/mutations.
- Do not use `ctx.db` inside Convex actions.
- Do not treat questionnaire/profile answers as chart evidence.
- Do not invent MC/chart ruler/aspects/houses when the canonical chart context does not provide them.
