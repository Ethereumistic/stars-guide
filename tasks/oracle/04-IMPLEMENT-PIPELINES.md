# Task 04: Implement Individual Pipelines

> **Type:** Additive (new files, nothing uses them yet)
> **Files created:**
> - `src/lib/oracle/pipelines/genericChat.ts`
> - `src/lib/oracle/pipelines/birthChart.ts`
> - `src/lib/oracle/pipelines/journalRecall.ts`
> - `src/lib/oracle/pipelines/binauralBeats.ts`
> **No behavior change.** These modules exist but aren't wired in until Task 05.

---

## What You're Doing

Creating four self-contained pipeline modules. Each implements the `OraclePipeline` interface from Task 03. Each pipeline knows exactly what data it needs and how to turn that data into prompt blocks.

These pipelines are **pure functions** — they take a `PipelineContext` and return prompt blocks. No database access, no side effects (except `afterResponse` hooks).

---

## Pipeline 1: Generic Chat

**File:** `src/lib/oracle/pipelines/genericChat.ts`

This is the default pipeline when NO feature intent is detected. It intentionally does NOT inject birth data.

```typescript
import type {
  OraclePipeline,
  PipelineContext,
  SystemPromptBlock,
  UserMessageBlock,
} from "../pipelineTypes";

export const genericChatPipeline: OraclePipeline = {
  key: "generic_chat",

  dataRequirements: {
    needsBirthData: false,        // ← THIS IS THE FIX FOR THE LOBOTOMIZATION
    needsJournalContext: true,    // Journal is additive, not directive
    expandedJournalBudget: false,
    needsTimespace: true,
  },

  modelHint: "fast",

  buildPromptBlocks(ctx: PipelineContext): {
    systemBlocks: SystemPromptBlock[];
    userBlocks: UserMessageBlock[];
  } {
    const systemBlocks: SystemPromptBlock[] = [];

    // Soul document (priority 90 — after safety, before features)
    systemBlocks.push({
      content: ctx.soulDoc,
      priority: 90,
      label: "soul_document",
    });

    // Timespace context (priority 50)
    if (ctx.timespaceContext) {
      systemBlocks.push({
        content: ctx.timespaceContext,
        priority: 50,
        label: "timespace",
      });
    }

    // Journal context (priority 40 — additive emotional context)
    if (ctx.journalContext) {
      systemBlocks.push({
        content: ctx.journalContext,
        priority: 40,
        label: "journal_context",
      });
    }

    return { systemBlocks, userBlocks: [] };
  },
};
```

**Key point:** `needsBirthData: false` means generic chat does NOT get the chart. The AI can have a normal conversation. If the user asks about their chart, the intent router will pick `birth_chart` pipeline instead.

**Why journal is still included:** Journal provides emotional context ("the user has been feeling anxious lately") without forcing the AI to talk about a specific topic. It's additive, not directive. This matches existing design decision #8.

---

## Pipeline 2: Birth Chart

**File:** `src/lib/oracle/pipelines/birthChart.ts`

```typescript
import type {
  OraclePipeline,
  PipelineContext,
  SystemPromptBlock,
  UserMessageBlock,
} from "../pipelineTypes";
import { getBirthChartDepthInstructions } from "../featureContext";

export const birthChartPipeline: OraclePipeline = {
  key: "birth_chart",

  dataRequirements: {
    needsBirthData: true,         // ← This pipeline injects the chart
    needsJournalContext: true,    // Journal adds emotional depth to readings
    expandedJournalBudget: false,
    needsTimespace: true,
  },

  modelHint: "smart",  // Chart readings benefit from smarter models

  buildPromptBlocks(ctx: PipelineContext): {
    systemBlocks: SystemPromptBlock[];
    userBlocks: UserMessageBlock[];
  } {
    const systemBlocks: SystemPromptBlock[] = [];

    // Soul document
    systemBlocks.push({
      content: ctx.soulDoc,
      priority: 90,
      label: "soul_document",
    });

    // Depth-specific instructions (system prompt — "what to focus on")
    const depth = ctx.birthChartDepth ?? "core";
    const depthInstructions = ctx.featureInjection
      ?? getBirthChartDepthInstructions(depth);
    systemBlocks.push({
      content: depthInstructions,
      priority: 80,
      label: `birth_chart_depth_${depth}`,
    });

    // Timespace
    if (ctx.timespaceContext) {
      systemBlocks.push({
        content: ctx.timespaceContext,
        priority: 50,
        label: "timespace",
      });
    }

    // Journal context
    if (ctx.journalContext) {
      systemBlocks.push({
        content: ctx.journalContext,
        priority: 40,
        label: "journal_context",
      });
    }

    // Birth chart data goes in USER MESSAGE (not system prompt)
    const userBlocks: UserMessageBlock[] = [];
    if (ctx.birthData) {
      userBlocks.push({
        content: `[BIRTH CHART DATA]\n${ctx.birthData}`,
        label: "birth_chart_data",
      });
    }

    return { systemBlocks, userBlocks };
  },
};
```

**Key point:** Birth data is in `userBlocks` (user message), not `systemBlocks` (system prompt). This preserves existing design decision #5: "The model treats chart data as user-provided facts, not system instructions."

**The DB override path:** `ctx.featureInjection` comes from the `oracle_feature_injections` table (admin-editable). If it exists, it overrides the hardcoded instructions. This matches the existing behavior where the admin can customize the prompt per depth.

---

## Pipeline 3: Journal Recall (Cosmic Recall)

**File:** `src/lib/oracle/pipelines/journalRecall.ts`

```typescript
import type {
  OraclePipeline,
  PipelineContext,
  SystemPromptBlock,
  UserMessageBlock,
} from "../pipelineTypes";

const COSMIC_RECALL_INJECTION = [
  "[COSMIC RECALL MODE]",
  "The user has asked you to search their journal for patterns and correlations with astrological events.",
  "Use the journal context below to identify recurring emotional themes, astrological correlations, and growth patterns.",
  "Cite specific entries by date and relate them to the astrological weather at the time.",
  "[END COSMIC RECALL MODE]",
].join("\n");

export const journalRecallPipeline: OraclePipeline = {
  key: "journal_recall",

  dataRequirements: {
    needsBirthData: false,        // Journal recall doesn't need chart data by default
    needsJournalContext: true,    // Obviously needs journal
    expandedJournalBudget: true,  // Doubled budget for Cosmic Recall
    needsTimespace: true,
  },

  modelHint: "smart",  // Pattern analysis benefits from smarter models

  buildPromptBlocks(ctx: PipelineContext): {
    systemBlocks: SystemPromptBlock[];
    userBlocks: UserMessageBlock[];
  } {
    const systemBlocks: SystemPromptBlock[] = [];

    // Soul document
    systemBlocks.push({
      content: ctx.soulDoc,
      priority: 90,
      label: "soul_document",
    });

    // Cosmic Recall mode instructions (override DB injection if present)
    const recallInstructions = ctx.featureInjection ?? COSMIC_RECALL_INJECTION;
    systemBlocks.push({
      content: recallInstructions,
      priority: 80,
      label: "cosmic_recall_mode",
    });

    // Timespace
    if (ctx.timespaceContext) {
      systemBlocks.push({
        content: ctx.timespaceContext,
        priority: 50,
        label: "timespace",
      });
    }

    // Journal context (expanded budget — orchestrator handles this)
    if (ctx.journalContext) {
      systemBlocks.push({
        content: ctx.journalContext,
        priority: 40,
        label: "journal_context",
      });
    }

    return { systemBlocks, userBlocks: [] };
  },
};
```

**Key point:** `needsBirthData: false` by default. Journal Recall doesn't inject the chart. BUT if the intent router detects BOTH journal_recall AND birth_chart, both pipelines activate, and the birth_chart pipeline's `userBlocks` will include the chart data. This is the composability win.

---

## Pipeline 4: Binaural Beats

**File:** `src/lib/oracle/pipelines/binauralBeats.ts`

```typescript
import type {
  OraclePipeline,
  PipelineContext,
  SystemPromptBlock,
  UserMessageBlock,
  PostResponseAction,
} from "../pipelineTypes";
import { getBinauralBeatContext } from "../featureContext";
import { generateBinauralBeat } from "../../binaural-presets";

export const binauralBeatsPipeline: OraclePipeline = {
  key: "binaural_beats",

  dataRequirements: {
    needsBirthData: false,
    needsJournalContext: false,
    expandedJournalBudget: false,
    needsTimespace: true,
  },

  modelHint: "creative",

  // Store the generated beat params so the orchestrator can persist them
  privateData: {
    lastBeatParams: null as any,
  },

  buildPromptBlocks(ctx: PipelineContext): {
    systemBlocks: SystemPromptBlock[];
    userBlocks: UserMessageBlock[];
  } {
    const systemBlocks: SystemPromptBlock[] = [];

    // Soul document
    systemBlocks.push({
      content: ctx.soulDoc,
      priority: 90,
      label: "soul_document",
    });

    // Deterministic beat generation + context injection
    const beat = generateBinauralBeat(ctx.userQuestion, ctx.birthData ? { birthData: null } : undefined);
    this.privateData.lastBeatParams = beat; // Store for afterResponse

    const binauralContext = ctx.featureInjection ?? getBinauralBeatContext(beat);
    systemBlocks.push({
      content: binauralContext,
      priority: 80,
      label: "binaural_beat_context",
    });

    // Timespace
    if (ctx.timespaceContext) {
      systemBlocks.push({
        content: ctx.timespaceContext,
        priority: 50,
        label: "timespace",
      });
    }

    return { systemBlocks, userBlocks: [] };
  },

  afterResponse(_response: string, _ctx: PipelineContext): PostResponseAction[] {
    if (this.privateData?.lastBeatParams) {
      return [{
        type: "store_binaural_params",
        payload: this.privateData.lastBeatParams,
      }];
    }
    return [];
  },
};
```

**Note on the binaural beats pipeline:** The current code calls `generateBinauralBeat(args.userQuestion, user?.birthData)`. The pipeline should match this signature exactly. Review `src/lib/binaural-presets.ts` to understand what `generateBinauralBeat` returns and ensure the pipeline passes the correct arguments.

**Important:** The `privateData` pattern here is a simplification. A cleaner approach is to have `buildPromptBlocks` return the beat params alongside the blocks, or store them in a closure. The implementor should choose whichever is cleanest — the key requirement is that `afterResponse` can access the generated params to return them as a `PostResponseAction`.

---

## Pipeline Registry (Optional Helper)

Create `src/lib/oracle/pipelines/index.ts`:

```typescript
import type { PipelineKey, OraclePipeline } from "../pipelineTypes";
import { genericChatPipeline } from "./genericChat";
import { birthChartPipeline } from "./birthChart";
import { journalRecallPipeline } from "./journalRecall";
import { binauralBeatsPipeline } from "./binauralBeats";

const pipelineRegistry = new Map<PipelineKey, OraclePipeline>();

function registerPipeline(pipeline: OraclePipeline): void {
  pipelineRegistry.set(pipeline.key, pipeline);
}

registerPipeline(genericChatPipeline);
registerPipeline(birthChartPipeline);
registerPipeline(journalRecallPipeline);
registerPipeline(binauralBeatsPipeline);

export function getPipeline(key: PipelineKey): OraclePipeline | undefined {
  return pipelineRegistry.get(key);
}

export function getAllPipelines(): OraclePipeline[] {
  return Array.from(pipelineRegistry.values());
}
```

This makes it easy for the orchestrator to look up pipelines by key.

---

## Verification

After creating all pipeline files:
1. Run `npx tsc --noEmit` — all types should compile
2. Each pipeline should implement the full `OraclePipeline` interface without errors
3. Verify `genericChatPipeline.dataRequirements.needsBirthData === false`
4. Verify `birthChartPipeline.dataRequirements.needsBirthData === true`
5. Verify `journalRecallPipeline.dataRequirements.expandedJournalBudget === true`
6. No existing code should be affected — these files aren't imported anywhere yet

---

## What NOT to Do

- Do NOT wire these into `invokeOracle` yet (Task 05)
- Do NOT modify `lib/oracle/features.ts` — the existing `ORACLE_FEATURES` array stays as-is for UI purposes
- Do NOT remove `classifyOracleToolIntent` — it's deprecated but still used until Task 05 replaces it
- Do NOT change the `featureContext.ts` functions — pipelines import and use them as-is
- Do NOT create any new database tables or schema changes
