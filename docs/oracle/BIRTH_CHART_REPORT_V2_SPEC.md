# Birth Chart Report v2 Spec

_Last updated: 2026-06-16_

## 1. Product thesis

Birth Chart Report v2 turns the current durable Markdown report into a **structured, visual, interactive birth chart experience**.

The current system is good at producing a coherent long-form reading. v2 keeps that strength, but changes the artifact from:

> one generated Markdown document

into:

> a validated structured chart interpretation that can render as cards, tabs, visuals, Markdown, PDF/export, Oracle follow-up prompts, and future deep dives.

The report should still feel emotionally memorable and evidence-first, but the main UX should no longer be only a long scroll of text.

## 2. Goals

### User goals

- Understand the chart quickly without reading a wall of text.
- See the most important chart patterns first.
- Trust the reading because claims are tied to visible chart evidence.
- Explore by life area: self, emotions, love, work, growth, practices.
- Ask Oracle follow-up questions directly from any section.
- Save prompts/practices into the journal later.
- Feel that the report is visually personalized using their actual signs, planets, elements, and chart signatures.

### Product goals

- Preserve the current high-quality Markdown report.
- Add a structured report source of truth for interactive rendering.
- Reuse existing visual assets/configs:
  - `src/config/elements-ui.ts`
  - `src/config/planet-ui.ts`
  - `src/config/zodiac-ui.ts`
- Reuse or adapt existing card components where practical:
  - `src/components/horoscopes/compact-sign-card.tsx`
  - `src/components/horoscopes/compact-planet-card.tsx`
  - `src/components/onboarding/reveal-sign-card.tsx`
  - `src/components/onboarding/reveal-compact-sign-card.tsx`
- Make the report a durable Oracle memory artifact.
- Support future deep-dive generation without regenerating the whole report.

## 3. Non-goals

- Do not ask the LLM to output raw HTML as the source of truth.
- Do not replace the current Oracle report flow/questionnaire in v2 phase 1.
- Do not create a second confusing full product called “Birth Chart Analysis” yet.
- Do not make unsupported predictions, compatibility verdicts, medical claims, financial claims, or deterministic fate statements.
- Do not invent chart data, MC, houses, aspects, or rulers absent from canonical chart data.

## 4. Recommended naming

Keep the primary artifact named:

- **Birth Chart Report**

Add follow-up modes later:

- **Deep Dive** — focused expansion of one report section/signature.
- **Advanced Chart Analysis** — technical mode for astrology-literate users.
- **Oracle Analysis** — conversational interpretation of the report.

Avoid creating another generic full artifact named “Birth Chart Analysis” because it overlaps with the report.

## 5. Core architectural change

### Current v1 artifact

```ts
users.birthChartReport = {
  status,
  markdown,
  profilingAnswers,
  onboardingStep,
  oracleSessionId,
  generatedAt,
  errorMessage,
  version,
}
```

### v2 artifact

Add a structured report object while keeping Markdown:

```ts
users.birthChartReport = {
  status: "pending" | "generating" | "completed" | "failed",
  version: 4,
  markdown: string,
  structured: BirthChartReportV2,
  profilingAnswers,
  onboardingStep,
  oracleSessionId,
  generatedAt,
  errorMessage,
}
```

Markdown becomes a render/export/chat fallback. `structured` becomes the source of truth for the interactive UI.

## 6. Structured report schema

Recommended TypeScript shape:

```ts
export interface BirthChartReportV2 {
  meta: {
    version: 2;
    reportTitle: string;
    preferredName: string;
    generatedAt: number;
    houseSystem?: string;
    birthDataSummary: string;
  };

  visualIdentity: {
    sunSignId?: string;
    moonSignId?: string;
    risingSignId?: string;
    dominantElement?: "Fire" | "Earth" | "Air" | "Water";
    dominantPlanetIds: string[];
    dominantSignIds: string[];
    accentPlanetId?: string;
    accentSignId?: string;
  };

  overview: {
    motto: string;
    chartAtGlance: string;
    oneSentence: string;
    coreMyth: string;
    topThemes: Array<{
      title: string;
      summary: string;
      evidence: EvidenceRef[];
    }>;
    howToUseThisReport: string[];
  };

  signatures: SignatureCard[];

  lifeAreas: {
    innerWorld: LifeAreaSection;
    outerSelf: LifeAreaSection;
    mindVoice: LifeAreaSection;
    loveAttachment: LifeAreaSection;
    workCalling: LifeAreaSection;
    growthPath: LifeAreaSection;
  };

  integration: {
    gifts: InsightBullet[];
    growthEdges: InsightBullet[];
    practices: PracticeItem[];
    reflectionPrompts: ReflectionPrompt[];
    sevenDayPlan?: PracticeItem[];
  };

  oracleFollowUps: Array<{
    label: string;
    prompt: string;
    relatedSignatureId?: string;
    relatedLifeArea?: keyof BirthChartReportV2["lifeAreas"];
  }>;

  technicalAppendix: {
    placements: PlacementEvidence[];
    aspects: AspectEvidence[];
    chartRuler?: EvidenceRef;
    concentrations: EvidenceRef[];
    nodalAxis?: EvidenceRef;
  };
}
```

Supporting types:

```ts
export interface SignatureCard {
  id: string;
  title: string;
  emoji?: string;
  shortSummary: string;
  evidence: EvidenceRef[];
  evidenceStrength: "strong" | "moderate" | "light";
  livedExperience: string;
  gift: string;
  watchFor: string;
  practice: string;
  relatedPlanetIds: string[];
  relatedSignIds: string[];
  relatedHouseIds: number[];
  relatedAspectIds: string[];
  oraclePrompt: string;
}

export interface LifeAreaSection {
  title: string;
  summary: string;
  keyInsights: InsightBullet[];
  practices: PracticeItem[];
  evidence: EvidenceRef[];
  oraclePrompts: string[];
}

export interface InsightBullet {
  title: string;
  body: string;
  evidence: EvidenceRef[];
}

export interface PracticeItem {
  title: string;
  instruction: string;
  evidence: EvidenceRef[];
  cadence?: "once" | "daily" | "weekly" | "as_needed";
}

export interface ReflectionPrompt {
  prompt: string;
  evidence: EvidenceRef[];
  journalTag?: string;
}

export type EvidenceRef =
  | { type: "placement"; bodyId: string; signId: string; houseId?: number; label: string }
  | { type: "aspect"; planet1: string; planet2: string; aspectType: string; orb: number; label: string }
  | { type: "dignity"; bodyId: string; dignity: string; label: string }
  | { type: "cluster"; bodyIds: string[]; signId?: string; houseId?: number; label: string }
  | { type: "chart_ruler"; risingSignId: string; rulerBodyId: string; rulerSignId?: string; rulerHouseId?: number; label: string }
  | { type: "nodal_axis"; northSignId: string; northHouseId?: number; southSignId: string; southHouseId?: number; label: string }
  | { type: "house_cusp"; houseId: number; signId: string; label: string };
```

## 7. Generation pipeline

### Recommended v2 pipeline

```txt
Canonical birth data
→ deterministic chart summary/evidence inventory
→ LLM structured JSON report
→ strict JSON validation
→ evidence validation against canonical chart data
→ render Markdown from structured report
→ save structured + Markdown
→ render interactive React UI from structured
```

### Why not raw HTML?

HTML export is viable, but raw LLM-generated HTML should not be the durable source.

Use:

- structured JSON as source of truth
- React components as renderer
- Markdown as fallback/export/chat context
- optional HTML/PDF export generated from React/Markdown

This avoids:

- XSS risk
- inconsistent markup
- hallucinated classes/components
- difficult redesigns
- weak validation

## 8. Prompt changes

The v2 system prompt should ask for structured JSON first, not Markdown first.

High-level contract:

- Output valid JSON only.
- Every major claim must include `evidence`.
- Every `EvidenceRef` must refer only to supplied canonical evidence IDs.
- Use profile answers only for emphasis.
- Include 3–5 dominant signatures.
- Include top 3 repeated chart themes.
- Include 5–8 Oracle follow-up prompts.
- Include 5–8 practices and 5–8 reflection prompts.
- Avoid deterministic, medical, legal, financial, or fatalistic claims.

After JSON validation, server code renders Markdown deterministically from the structured object.

## 9. Deterministic preprocessing improvements

The current `buildUniversalBirthContext` is good. v2 should add a more explicit evidence inventory with stable IDs.

Example:

```txt
[EVIDENCE INVENTORY]
placement:sun = Sun in Gemini, House 11, direct
placement:moon = Moon in Cancer, House 12, dignity domicile
aspect:venus_opposition_pluto = Venus opposition Pluto, orb 1.83°
cluster:gemini_house_11 = Sun, Venus, Mars in Gemini, House 11
chart_ruler:leo_sun = Leo rising → Sun rules chart; Sun in Gemini, House 11
nodal_axis:cancer_capricorn = North Node in Cancer, House 12 / South Node in Capricorn, House 6
[END EVIDENCE INVENTORY]
```

The model should reference these IDs or reproduce equivalent structured refs. Validation should reject evidence not present in the inventory.

## 10. Interactive report UX

### Route

Keep:

- `src/app/(app)/oracle/birth-chart-report/page.tsx`

Upgrade the page to render structured v2 when available and fall back to Markdown renderer for old reports.

### Page layout

Recommended structure:

1. Hero
2. Big three visual cards
3. Top 3 themes
4. Dominant signature cards
5. Life-area tabs
6. Practices / journal prompts
7. Ask Oracle next
8. Technical appendix
9. Full Markdown / Print view

### Hero

Use `visualIdentity`:

- Sun sign
- Moon sign
- Rising sign
- dominant element
- accent planet/sign

Potential components:

- adapt `RevealCompactSignCard` for Sun/Moon/Rising cards
- use `zodiacUIConfig` for icons/constellation URLs
- use `elementUIConfig` for glow/gradient/frame styling

Hero should visually say:

```txt
Satoshi's Birth Chart Report
Gemini Sun · Cancer Moon · Leo Rising
A social mind with a private emotional ocean.
```

### Big three cards

Use compact reveal cards for:

- Sun sign
- Moon sign
- Rising sign

These can reuse or adapt:

- `RevealCompactSignCard`
- `RevealSignCard` if a larger cinematic first-view is wanted

Need a small adapter from stored chart sign IDs to `SignData` + `zodiacUIConfig`.

### Dominant signature cards

Create a new component rather than forcing existing sign/planet cards:

```tsx
<BirthChartSignatureCard signature={signature} />
```

It should use:

- `planetUIConfig` for related planets and planet watermarks
- `zodiacUIConfig` for related signs and constellation accents
- `elementUIConfig` through sign element when a sign is primary

Card content:

- title
- short summary
- evidence chips
- gift
- watch for
- practice
- evidence strength
- “Ask Oracle about this” button

### Evidence chips

Create:

```tsx
<ChartEvidenceChip evidence={evidenceRef} />
```

Visual behavior:

- planet icon/glyph when evidence contains planet/body
- sign icon when evidence contains sign
- house badge when evidence contains house
- orb label for aspects
- tooltip/popover explaining the evidence

This is the most important trust-building UI element.

### Life-area tabs

Use tabs/segmented nav:

- Overview
- Inner World
- Love
- Work
- Growth
- Practices
- Technical

Each tab renders `LifeAreaSection` with:

- short summary
- 2–4 key insights
- practices
- evidence chips
- ask-Oracle buttons

### Ask Oracle buttons

Each generated prompt becomes a button/chip that opens/continues the origin report session or starts a new Oracle message.

Examples:

```txt
Explain this signature more deeply
Give me a 7-day practice for this pattern
How does this show up in relationships?
Help me journal on this
```

### Practices and journal integration

Phase 1 can show practices only.

Future phase:

- “Save to Journal”
- “Start reflection”
- “Add practice reminder”

Reflection prompts should be structured so they can be sent directly into journal creation.

## 11. Reusing existing components

### Existing configs

Use directly:

- `planetUIConfig[id].imageUrl`
- `planetUIConfig[id].themeColor`
- `planetUIConfig[id].rulerSymbol`
- `zodiacUIConfig[signId].icon`
- `zodiacUIConfig[signId].constellationUrl`
- `elementUIConfig[element].styles.gradient`
- `elementUIConfig[element].frameUrl`

### Existing cards

#### `CompactSignCard`

Good for generic sign grids and technical appendix links. It is currently link-oriented and horoscope-oriented, so use carefully.

Potential use:

- related signs section
- sign education links
- “Learn about your Gemini Sun” card

May need optional `disableLink` or `asButton` support if reused inside report.

#### `CompactPlanetCard`

Good for related planet cards and technical appendix.

Potential use:

- dominant planets row
- “Planets emphasized in your chart” section

May need `disableLink` or custom `href` to keep users inside Oracle if desired.

#### `RevealSignCard` / `RevealCompactSignCard`

Best reuse candidate for the report hero / big three cards.

Potential use:

- Sun Sign
- Moon Sign
- Rising Sign

Recommended adaptation:

```tsx
<RevealCompactSignCard label="☉ Sun Sign" data={sunSignData} ui={zodiacUIConfig[sunSignId]} />
<RevealCompactSignCard label="☾ Moon Sign" data={moonSignData} ui={zodiacUIConfig[moonSignId]} />
<RevealCompactSignCard label="↑ Rising Sign" data={risingSignData} ui={zodiacUIConfig[risingSignId]} />
```

### New components needed

- `BirthChartReportV2Renderer`
- `BirthChartHero`
- `BirthChartBigThree`
- `BirthChartSignatureCard`
- `ChartEvidenceChip`
- `BirthChartLifeAreaTabs`
- `BirthChartPracticeList`
- `BirthChartOraclePromptChips`
- `BirthChartTechnicalAppendix`
- `BirthChartMarkdownFallback`

## 12. Markdown rendering in v2

Markdown should be generated from structured data with a deterministic renderer, not directly written by the LLM.

Required Markdown sections can remain close to v1:

1. `# Birth Chart Report for {name}`
2. blockquote motto
3. `## How to Use This Report`
4. `## Chart at a Glance`
5. `## Your Chart in One Sentence`
6. `## The Three Things Your Chart Keeps Repeating`
7. `## The Core Myth of Your Chart`
8. `## Your Dominant Signatures`
9. `## Inner World & Emotional Care`
10. `## Outer Self & Life Approach`
11. `## Mind, Voice & Learning Style`
12. `## Love, Desire & Attachment Patterns`
13. `## Work, Calling & Public Direction`
14. `## North Node Growth Path`
15. `## Gifts You Can Trust`
16. `## Growth Edges / Shadow Patterns`
17. `## Practices for Integration`
18. `## Reflection Prompts`
19. `## Questions You Can Ask Oracle Next`
20. `## Personal Motto`

## 13. Validation rules

Before saving v2:

- JSON parses successfully.
- Schema validates.
- 3–5 signatures exist.
- Every signature has evidence, gift, watch-for, practice, related IDs, and Oracle prompt.
- Every evidence ref maps to canonical chart data.
- No section is empty.
- No invented signs, planets, houses, chart ruler, MC, aspects, dignities, or nodes.
- No raw user custom context is treated as evidence.
- No raw HTML/script is accepted.
- No deterministic/fatalistic/medical/legal/financial language.
- Markdown can be rendered from structured object.

Useful banned/flagged phrases:

- biological necessity
- guaranteed
- destined
- fated to
- you will definitely
- medical diagnosis language
- legal/financial instruction language
- chosen one / old soul / psychic healer unless explicitly softened and evidence-bound

## 14. Backward compatibility

Existing completed v1 reports only have Markdown.

Renderer behavior:

```ts
if (birthChartReport.structured) {
  return <BirthChartReportV2Renderer report={structured} markdown={markdown} />;
}

return <BirthChartReportRenderer markdown={markdown} />;
```

No migration is required immediately.

Optional later migration:

- regenerate v2 for users when they open the report
- or offer “Upgrade my report” button

## 15. Oracle chat reuse

For chat context, do not inject the full structured JSON by default. Inject a compact report summary generated from structured data:

```txt
[BIRTH CHART REPORT SUMMARY]
One sentence: ...
Top themes: ...
Dominant signatures:
- The Social Architect: evidence..., gift..., watch-for..., practice...
Life area summaries: ...
[END]
```

Keep raw chart data as reference only.

For deep-dive asks, include only the relevant signature/life area plus raw evidence.

## 16. Phased implementation plan

### Phase 1 — Structured generation foundation

- Add `structured` field to schema.
- Define `BirthChartReportV2` TypeScript types.
- Update prompt to generate JSON.
- Add schema/evidence validation.
- Render Markdown from structured report.
- Save both `structured` and `markdown`.
- Keep existing page mostly unchanged except fallback awareness.

### Phase 2 — Interactive renderer

- Build `BirthChartReportV2Renderer`.
- Add hero and Big Three cards using `RevealCompactSignCard`.
- Add signature cards with planet/sign visuals.
- Add evidence chips.
- Add life-area tabs.
- Add Oracle follow-up prompt chips.

### Phase 3 — Journal and deep dives

- Add “Save prompt to journal.”
- Add “Start reflection.”
- Add “Generate deep dive” per signature/life area.
- Store deep dives separately, keyed by report version and section/signature ID.

### Phase 4 — Export and advanced analysis

- Add polished print/PDF mode from structured renderer.
- Add technical appendix UI.
- Add optional Advanced Chart Analysis for users who want more astrological detail.

## 17. Open product decisions

1. Should Big Three cards appear before or after the core myth?
2. Should Oracle follow-up chips create a new chat or continue the report origin session?
3. Should old reports get an “Upgrade to interactive report” button?
4. Should the v2 report be gated by tier, or available to all users with birth data?
5. Should deep dives consume Oracle quota or have separate report/deep-dive quota?

## 18. Success criteria

v2 is successful if:

- Users can understand their top chart themes in under 60 seconds.
- The full report still feels premium and emotionally resonant.
- Every major claim remains evidence-backed.
- The report page feels personalized with actual sign/planet/element visuals.
- Users click Oracle follow-up prompts from the report.
- The structured report can power future deep dives without regeneration.
- Old Markdown reports still render correctly.
