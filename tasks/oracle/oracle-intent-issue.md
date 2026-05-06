 What I Found: The Current "Activation" Flow

 Here's how it actually works today:

 ```
   User sends message
          │
          ▼
   invokeOracle()
          │
          ├── 1. Kill switch, crisis, input validation
          ├── 2. Load session, settings, user
          ├── 3. ALWAYS build birth data (if user has it) → user message block
          ├── 4. Check if session already has a featureKey
          │       │
          │       ├── YES → skip classification, use that feature
          │       └── NO  → run classifyOracleToolIntent() (regex matching)
          │                   │
          │                   ├── Journal patterns + consent → journal_recall
          │                   ├── Chart intent patterns + birth data → birth_chart
          │                   │      └── depth signal patterns → full vs core
          │                   ├── Binaural patterns → binaural_beats
          │                   └── No match → null (generic chat)
          │
          ├── 5. Build feature injection (system prompt instructions)
          ├── 6. Build journal context (if consented, ALWAYS)
          ├── 7. Build timespace context (ALWAYS)
          ├── 8. Assemble full prompt → iterate model chain → stream
          └── 9. Done
 ```

 The Problem You're Sensing Is Real

 You're right to be uncomfortable. There are three structural issues:

 ### Issue 1: The "Lobotomized Chart Talk" Problem

 Birth data is injected unconditionally (v2 design decision #6). Plus, the soul document defines Oracle as a chart-reader. So even a generic "hey how's it going" gets the full chart data in the user message, and the AI sees:

 │ "I am not a fortune teller. I show patterns in motion... Always cite at least one placement..."

 ...followed by 14 placements + 8 aspects + 12 house signatures. The AI is basically forced to talk about the chart. It's not lobotomized — it's over-constrained. The v2 "universal birth context" was a good idea for cross-context mixing (Cosmic Recall seeing Venus),
 but the side effect is that generic conversations can't breathe.

 ### Issue 2: Regex Intent Classification Doesn't Scale

 Your current classifier is ~200 lines of regex patterns. It works for 3 features (birth_chart, journal_recall, binaural_beats). But look at what's coming:

 - Synastry — completely different data pipeline (needs TWO charts), different prompt structure, different output format
 - Cosmic Weather — needs current planetary positions, different data source entirely
 - Sign card image — needs image generation, not just text
 - "Love reading through chart" — same birth chart data but entirely different analytical lens

 The regex approach creates a priority ladder where only ONE feature wins. You can't compose. A question like "Look through my journal and tell me how my chart affects my relationship with Sarah" should activate BOTH journal_recall AND synastry. Your current
 architecture picks one.

 ### Issue 3: The Monolithic Pipeline

 invokeOracle is one function doing 27 steps. As features diverge:
 - Synastry needs a data collection phase (ask for partner's birth data) that birth_chart doesn't
 - Binaural beats needs a tool call (audio generation) after the LLM responds
 - Cosmic weather needs ephemeris data that birth chart doesn't
 - Each feature might prefer different models (synastry might want a smarter model; quick chat might want a faster/cheaper one)

 This all gets crammed into one growing if/switch block.

 ────────────────────────────────────────────────────────────────────────────────

 What I Propose: Intent-as-Routing Architecture

 The fundamental shift is: stop thinking of features as "prompt injections" and start thinking of them as "pipelines."

 ```
   ┌─────────────────────────────────────────────────────────────────┐
   │                     INTENT ROUTER (Layer 1)                      │
   │                                                                  │
   │  Input: user message + session context + user capabilities       │
   │  Output: ordered list of intents with confidence scores          │
   │                                                                  │
   │  "Look through my journal and tell me about my love life"        │
   │    → [journal_recall: 0.9, synastry_love: 0.7, birth_chart: 0.3]│
   │                                                                  │
   │  "Hey what's up"                                                 │
   │    → [generic_chat: 0.95]                                        │
   │                                                                  │
   │  "Compare my chart with my partner's"                            │
   │    → [synastry: 0.95]                                            │
   │                                                                  │
   │  Method: Could still start as regex/pattern, but architected    │
   │  as a SCORER not a CLASSIFIER. Returns ALL matches, not ONE.     │
   │  Future: lightweight LLM call for ambiguous cases.               │
   └──────────┬──────────────────────────────────────────────────────┘
              │
              ▼
   ┌─────────────────────────────────────────────────────────────────┐
   │                FEATURE PIPELINES (Layer 2 — Plugins)             │
   │                                                                  │
   │  Each pipeline is a self-contained module with:                  │
   │  • dataRequirements() → what data it needs                       │
   │  • collectData(ctx) → gathers that data (birth, journal, sky)    │
   │  • buildPrompt(ctx, data) → assembles its prompt blocks          │
   │  • modelPreference() → which model/provider works best           │
   │  • parseOutput(raw) → extract structured data from LLM response  │
   │  • sideEffects(output) → trigger tool calls, generate audio, etc │
   │                                                                  │
   │  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐       │
   │  │ GenericChat   │  │ BirthChart   │  │ Synastry         │       │
   │  │ - soul only   │  │ - birth data │  │ - TWO birth data │       │
   │  │ - timespace   │  │ - depth instr│  │ - comparison inst│       │
   │  │ - NO chart    │  │ - core/full  │  │ - love/general   │       │
   │  │   unless asked│  │              │  │ - aspect overlay │       │
   │  └──────────────┘  └──────────────┘  └──────────────────┘       │
   │                                                                  │
   │  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐       │
   │  │ JournalRecall │  │ BinauralBeat │  │ CosmicWeather    │       │
   │  │ - journal ctx │  │ - freq select│  │ - ephemeris data │       │
   │  │ - patterns    │  │ - audio gen  │  │ - current sky    │       │
   │  │ - expanded $  │  │ - LLM msg    │  │ - transit interp │       │
   │  └──────────────┘  └──────────────┘  └──────────────────┘       │
   │                                                                  │
   │  Pipelines are COMPOSABLE:                                       │
   │  Synastry + Journal = "Compare our charts using my journal       │
   │                        patterns to show what keeps coming up"    │
   └──────────┬──────────────────────────────────────────────────────┘
              │
              ▼
   ┌─────────────────────────────────────────────────────────────────┐
   │              PROVIDER ROUTER (Layer 3 — Separate Concern)        │
   │                                                                  │
   │  Input: assembled prompt + pipeline's model preference           │
   │  Output: streaming LLM response                                  │
   │                                                                  │
   │  ┌─────────────────────────────────────────────────┐             │
   │  │ Provider Pool:                                    │             │
   │  │  • Ollama Cloud  ─── 3 concurrent slots           │             │
   │  │  • z.ai GLM      ─── 1 concurrent slot            │             │
   │  │  • Cloudflare    ─── free daily quota              │             │
   │  │  • OpenRouter    ─── backup/paid                   │             │
   │  │                                                    │             │
   │  │  Router logic:                                     │             │
   │  │  1. Pipeline says "prefer smart model"             │             │
   │  │  2. Check available slots → pick best fit          │             │
   │  │  3. Queue if all full (FIFO, 4 concurrent max)     │             │
   │  │  4. Fallback chain on failure                      │             │
   │  └─────────────────────────────────────────────────────┘            │
   └─────────────────────────────────────────────────────────────────┘
 ```

 ### The Key Insight: Generic Chat Should NOT Get Chart Data

 Right now every message gets the full chart. Instead:

 - GenericChat pipeline: soul + safety + timespace + journal (if consented) — NO birth data
 - BirthChart pipeline: everything GenericChat has, PLUS birth data + depth instructions
 - Synastry pipeline: everything GenericChat has, PLUS user birth data + partner birth data + comparison instructions

 This solves the lobotomization problem. When someone says "hey what's up", the AI is just a warm astrology-aware entity. When they say "analyze my chart", the data floods in.

 ### Composability: The Real Power

 ```typescript
   // Conceptual interface
   interface OraclePipeline {
     key: string
     dataSources: (ctx: PipelineContext) => Promise<PipelineData[]>
     promptBlocks: (data: PipelineData[]) => PromptBlock[]
     modelHint?: "fast" | "smart" | "creative"
     parseOutput?: (raw: string) => ParsedOutput
     afterResponse?: (output: ParsedOutput) => Promise<void>
   }

   // Composed session — journal_recall + birth_chart = Cosmic Recall with chart awareness
   // The router can activate BOTH:
   //   journal_recall pipeline → provides journal data blocks
   //   birth_chart pipeline    → provides birth data blocks
   // Both get injected, both instruction blocks present
 ```

 This means synastry + journal is trivially composable: the Synastry pipeline provides the two-chart comparison frame, and the Journal pipeline injects relationship patterns the user journaled about. The AI sees both, naturally synthesizes.

 ────────────────────────────────────────────────────────────────────────────────

 On the Infrastructure Question: Cloudflare Worker vs Convex

 Keep Convex as the orchestrator. Don't add a Cloudflare Worker in between. Here's why:

 ```
   Current (correct):    Frontend → Convex → LLM Providers
   Proposed (worse):     Frontend → CF Worker → Convex → LLM Providers
                         Frontend → CF Worker → LLM Providers (bypasses Convex)
 ```

 Adding a Worker between Frontend and Convex:
 - Adds latency (extra hop)
 - Creates auth delegation complexity (Worker needs to verify the user)
 - Doesn't solve anything Convex can't already do
 - Breaks your reactive streaming (Convex mutations trigger UI updates — Worker can't do that)

 What you should do instead is move the provider routing logic into its own module within Convex:

 ```
   convex/oracle/
     ├── invokeOracle.ts       ← thin orchestrator, delegates to pipeline
     ├── pipelines/
     │   ├── genericChat.ts    ← no chart data, just soul + timespace
     │   ├── birthChart.ts     ← birth data + depth instructions
     │   ├── synastry.ts       ← two charts + comparison
     │   ├── journalRecall.ts  ← journal context + patterns
     │   ├── binauralBeats.ts  ← frequency selection + audio gen trigger
     │   └── cosmicWeather.ts  ← ephemeris + current sky
     ├── router/
     │   ├── intentRouter.ts   ← scores intents, returns ordered list
     │   └── providerRouter.ts ← concurrency-aware provider selection
     └── ...
 ```

 The Frontend → Convex → LLM Provider flow is correct. Convex is your VPS-hosted backend with reactive queries, streaming mutations, and server-authoritative state. That's exactly the right layer to own the orchestration.

 ────────────────────────────────────────────────────────────────────────────────

 On the Provider Load Balancing

 Your 4 concurrent slots (Ollama: 3, z.ai: 1) with queuing is a good model. Here's how I'd structure it:

 ```typescript
   // Provider Router — lives in Convex, tracks concurrency per provider
   interface ProviderSlot {
     providerId: string
     maxConcurrent: number
     currentLoad: number
     queue: QueuedRequest[]
   }

   // On each invokeOracle:
   // 1. Pipeline provides modelHint ("smart" for synastry, "fast" for chat, "creative" for binaural)
   // 2. ProviderRouter picks: available slot matching hint? → use it
   //    No slot? → queue the request
   //    All providers failed? → fallback chain
   // 3. Track slot occupancy via in-memory state (Convex action runs on Node runtime)
   //    or via a small oracle_provider_slots table for durability
 ```

 This is plug-and-play exactly as you described: add a new provider → register it with its concurrency limit → the router automatically distributes load.

 ────────────────────────────────────────────────────────────────────────────────

 Summary of My Recommendation

 ┌────────────────────────────────────────────────────────┬───────────────────────────────────────────────────────────────────────────────────┐
 │ Current                                                │ Proposed                                                                          │
 ├────────────────────────────────────────────────────────┼───────────────────────────────────────────────────────────────────────────────────┤
 │ Regex classifier picks ONE feature                     │ Intent router scores ALL features, activates multiple                             │
 ├────────────────────────────────────────────────────────┼───────────────────────────────────────────────────────────────────────────────────┤
 │ Birth data always injected (causes lobotomization)     │ Data injection per-pipeline (generic chat = no chart)                             │
 ├────────────────────────────────────────────────────────┼───────────────────────────────────────────────────────────────────────────────────┤
 │ Monolithic invokeOracle with growing switch statements │ Thin orchestrator + feature pipeline plugins                                      │
 ├────────────────────────────────────────────────────────┼───────────────────────────────────────────────────────────────────────────────────┤
 │ Static model fallback chain                            │ Concurrency-aware provider router with queuing                                    │
 ├────────────────────────────────────────────────────────┼───────────────────────────────────────────────────────────────────────────────────┤
 │ Features = "prompt text injections"                    │ Features = "self-contained pipelines" with data + prompt + parsing + side-effects │
 ├────────────────────────────────────────────────────────┼───────────────────────────────────────────────────────────────────────────────────┤
 │ One size fits all prompts                              │ Per-pipeline model hints (fast/smart/creative)                                    │
 └────────────────────────────────────────────────────────┴───────────────────────────────────────────────────────────────────────────────────┘

 The v2 architecture got several things right (data/instruction separation, cross-context mixing, universal journal when consented). The mistake was making birth data universal too — it should be pipeline-gated, while journal context stays universal (it's additive
 without being directive).

 Want me to start implementing this? I'd suggest we start with:
 1. Extracting the provider router into its own module with concurrency tracking
 2. Restructuring invokeOracle to delegate to pipelines
 3. Making birth data conditional on pipeline selection (fixing the lobotomization)
 4. Building the intent router that returns multiple matches