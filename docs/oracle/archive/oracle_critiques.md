 1. The Prompt Assembly Pipeline Is a Monolith That Won't Scale

 Current state: buildPrompt() takes 7 parameters and concatenates blocks in a hardcoded order. System prompt blocks are positional (safety → soul → feature → timespace → journal → title directive → journal prompt directive). User message blocks are positional too
 (birth data → sanitized question).

 The problem: You already have 6 system blocks and 2 user blocks. When you add synastry, you'll need a second birth chart data block (partner data). When you add composite charts, a third. When you add predictive features, you'll need transit tables, progression data,
 solar return data. The 7-parameter function will become a 12-parameter function. The ordering logic will become conditional spaghetti.

 What happens next: Someone will accidentally put the synastry data before the user's own chart data, and the model will interpret the partner's Sun as the user's Sun. Or the title directive will drift from "always last" because a new block needs to be last for some
 model-specific reason.

 Recommendation: Move to a tagged block architecture. Treat the prompt as an ordered list of typed blocks, not a string concatenation:

 ```
   Block { type: "safety", priority: 100, content: "..." }
   Block { type: "soul", priority: 90, content: "..." }
   Block { type: "birth_data", priority: 50, content: "...", scope: "user" }
   Block { type: "journal_context", priority: 60, content: "...", gate: "consent" }
 ```

 A PromptComposer sorts by priority, applies gates (consent, feature flags), deduplicates by type, and renders to the final [SYSTEM] / [USER] split. This makes the prompt declarative rather than imperative. You can visualize it in the debug panel. You can unit-test the
 composition without calling an LLM.

 ────────────────────────────────────────────────────────────────────────────────

 2. The Intent Router Adds Unnecessary Latency to First Messages

 Current state: On the first message of a session with no active feature, you call scoreIntentsWithLLM() — a fast LLM call (~200 tokens, 200-500ms) — before the actual LLM call that generates the user-facing response.

 The problem: A new user types "Analyze my birth chart" and waits 500ms for intent classification, then waits another 800ms for the streaming response to start. Their perceived latency is ~1.3s before they see a single token. For a consumer product, that first-message
 latency is critical.

 The deeper problem: You already have regex fallbacks. The regex patterns are actually quite good for exact/clear intent. The LLM router exists for typos ("analize my bierht chart") and creative phrasing. But you can handle typos with fuzzy string matching or a
 lightweight embedding classifier, not a full LLM roundtrip.

 Recommendation: Replace the LLM intent router with a local embedding classifier. Embed the user's message and your feature definitions into the same vector space. A dot product against 7 feature vectors takes <5ms locally. It handles typos and creative phrasing better
 than regex, and it's 100x faster than an LLM call. If you still want an LLM fallback for truly ambiguous cases, make it async — classify with embeddings first, start the main LLM call with the most likely feature, and if the LLM fallback disagrees, you only waste one
 message (which you can transparently reclassify). The user gets their first token in 800ms instead of 1300ms.

 ────────────────────────────────────────────────────────────────────────────────

 3. You Re-Inject the Full Birth Chart on Every Follow-Up

 Current state: Universal birth context means ~450 tokens of chart data (14 placements, houses, aspects) are injected into the user message on every message in the session, including follow-ups.

 The problem: It's not just cost (~0.03¢ per message, as you note). It's context window pressure and model confusion. On the 10th follow-up message, the model has seen the full chart 10 times. The conversation history already contains references to specific placements.
 Re-injecting the full canonical data every turn trains the model to ignore the conversation history and treat the latest injection as ground truth — which it is, but it's redundant ground truth.

 The deeper problem: The model has no memory that it already knows this chart. You're not leveraging the conversation state.

 Recommendation: Use differential birth context. On the first message, inject the full chart with "Treat this as canonical truth." On follow-ups, inject only a reference block:

 ```
   [BIRTH CHART REFERENCE]
   Your stored chart remains canonical. Previously discussed: Sun in Aries H10, Moon in Pisces H9.
   If your answer requires a placement not listed above, cite it from the canonical chart.
   [END BIRTH CHART REFERENCE]
 ```

 This drops follow-up birth context from ~450 tokens to ~50 tokens. You keep a running list of "placements already discussed in this session" (extracted from the conversation history or tracked explicitly), and only re-inject the full chart if the user asks something
 clearly outside those placements (e.g., "What about my Part of Fortune?" when you haven't discussed it yet). The model still has the full chart in earlier turns if it needs to refer back, and you save ~30-40% of your context window on long sessions.

 ────────────────────────────────────────────────────────────────────────────────

 4. The Model Chain Fallback Lives in a Single Action with a Timeout Bomb

 Current state: invokeOracle iterates through the model chain synchronously inside one Convex action. If Tier A times out after 15 seconds, it tries Tier B. If Tier B times out after 15 seconds, it tries Tier C. Convex actions have a hard timeout (typically 30s,
 sometimes 60s depending on plan).

 The problem: If your provider is having a bad day and multiple tiers are slow-not-failing (hanging on connect), you could burn the entire action timeout before reaching Tier C. The user gets nothing — not even the hardcoded fallback, because the action was killed by
 Convex before reaching the end of the loop.

 Recommendation: Split the LLM invocation into a resilient async job. Convex supports runAction with internal scheduling, or you can use a lightweight queue pattern:

 1. invokeOracle writes an "oracle job" document with the assembled prompt, model chain, and timeout per tier.
 2. A scheduled function or internal action picks up the job, tries Tier A with a sub-action that has its own timeout (e.g., 8s).
 3. If the sub-action fails or times out, the scheduler tries Tier B.
 4. The client subscribes to the job document via reactive query and sees status updates ("Contacting the stars...", "Trying alternative path...").
 5. If all tiers fail, the scheduler writes the hardcoded fallback.

 This decouples the user-facing action from provider flakiness. It also lets you add preemptive health checks — ping each provider's API before the first tier to avoid trying a dead endpoint.

 ────────────────────────────────────────────────────────────────────────────────

 5. Free-Text Parsing (TITLE:, JOURNAL_PROMPT:) Is Brittle

 Current state: You rely on the model outputting TITLE: <text> and JOURNAL_PROMPT: <text> on specific lines, then regex-parsing them out. You already have a fallback (deriveTitleFromContent) because models don't reliably follow this instruction.

 The problem: This will get worse as you add more "append directives." If you add SYNASTRY_FOCUS:, TRANSIT_DATE:, HOROSCOPE_SCOPE:, the model will start confusing them or outputting them in the wrong order. The regex parsing becomes a maintenance burden. Worse, if a
 model outputs TITLE: in the middle of a sentence explaining something (e.g., "The TITLE: of your chapter is..."), your parser extracts garbage.

 Recommendation: Move to structured output for metadata. Instead of asking the model to append a title line to its prose, use the LLM's JSON mode / structured output capability (OpenAI's response_format, Anthropic's tool use, Gemini's responseSchema).

 Split the generation into two calls or a single structured call:
 - content: The actual prose response.
 - metadata.title: The 4-6 word title.
 - metadata.journalPrompt: The optional reflective question.
 - metadata.citedPlacements: Array of placements actually referenced (useful for differential context and evaluation).

 If you don't want two LLM calls, use a single call with a delimiter protocol the model is better at following than inline directives — or use the provider's native structured output. This eliminates regex fragility entirely.

 ────────────────────────────────────────────────────────────────────────────────

 6. No Evaluation or Regression Testing Framework

 Current state: You have excellent observability (timing, tokens, tiers, debug panel). You have zero evaluation. The admin can edit the oracle_soul document, change the model chain, or tweak safety rules, and there's no systematic way to know if responses got better or
 worse.

 The problem: You are flying blind on prompt quality. When you tweak the soul document, you might accidentally make the model more verbose (increasing costs), less accurate on house interpretations, or more prone to generic Sun-sign advice. You only find out when users
 complain.

 Recommendation: Build a regression test suite that runs nightly or on every deploy:

 1. Golden dataset: 50-100 representative queries covering your feature matrix (birth chart core, birth chart full, cosmic recall, generic chat, edge cases like "What about my Venus?" in a core session, crisis keywords, prompt injection attempts).
 2. Evaluators:
     - Structured checks: Does the response cite at least one placement? (parse the metadata.citedPlacements from structured output). Does it avoid banned phrases? (string search).
     - LLM-as-judge: A stronger model (e.g., Claude Opus) scores responses on dimensions: accuracy, warmth, conciseness, practical utility, safety adherence.
     - Snapshot tests: The exact output of the prompt composer for each golden query is hashed and compared against expected. If the system prompt changes, you see exactly how the injected blocks shifted.
 3. A/B framework: When the admin saves a new oracle_soul, don't deploy globally. Shadow-test it on 10% of sessions, compare eval scores against the old version, and auto-rollback if scores drop.

 This turns prompt engineering from art into engineering.

 ────────────────────────────────────────────────────────────────────────────────

 7. Safety Is a Single Wall of Text, Not Layered Defense

 Current state: Safety rules are a hardcoded text block at position 1 of the system prompt covering medical safety, crisis protocol, relationship with data, content boundaries, identity protection, manipulation resistance, mid-response safety. Crisis detection is a 22-regex-pattern scan before the LLM call. That's it.

 The problem: You're relying entirely on the model's willingness to follow instructions. Models are getting better at jailbreaks and instruction override attacks. Your prompt injection defense only strips bracket tags — it doesn't catch base64-encoded prompts, Unicode
 homoglyphs, or indirect injection via pasted URLs.

 The deeper problem: There's no output-side safety. You scan the input for crisis keywords, but you don't scan the output for safety violations (e.g., the model accidentally giving medical advice because the user framed it cleverly).

 Recommendation: Add a three-layer safety architecture:

 1. Input layer (what you have, but hardened):
     - Keep the keyword scan for crisis detection (it's fast and correct).
     - Add an embedding-based jailbreak detector. Embed the user's message; if it's near known jailbreak embeddings in vector space, flag for review or reject.
     - Expand sanitizeUserQuestion to detect indirect injection patterns (roleplay framing, "ignore previous instructions", base64 blocks).
 2. Prompt layer (what you have):
     - Keep the hardcoded safety block, but break it into structured safety policies rather than prose. Research shows models follow enumerated rules better than paragraph instructions.
 3. Output layer (missing entirely):
     - After the LLM generates a response, run a lightweight output classifier (local embedding or small classifier model) that scores the response for safety violations: medical advice, financial advice, self-harm encouragement, prompt leakage.
     - If the classifier flags it, don't show the user the raw response. Instead, show a fallback message and log the incident for admin review.
     - This is especially important as you allow the model access to journal data — you must ensure it never outputs journal content back to the user inappropriately or to another user.

 ────────────────────────────────────────────────────────────────────────────────

 8. No Semantic Caching or Prompt Memoization

 Current state: Every invokeOracle call rebuilds the entire prompt from scratch: fetches settings from DB, assembles birth context, assembles journal context, assembles timespace, builds history, sanitizes input.

 The problem: For a follow-up message in an active session, the soul document hasn't changed. The birth data hasn't changed. The journal context may have changed (new entry), but probably hasn't in the last 5 minutes. Yet you pay the full assembly cost every time.

 Recommendation: Add memoized context blocks with TTL:

 - Soul document: Cache in memory (or Convex's action-local state) for 60 seconds. It rarely changes.
 - Birth context: Cache per-user for the duration of the session. Birth data is immutable during a chat.
 - Journal context: Cache for 30 seconds with a lastJournalEntryId invalidation key. Only re-assemble if the user has written a new journal entry since cache.
 - Timespace context: Cache for 1 minute. Planetary positions don't change meaningfully in 60 seconds.

 This drops your timingPromptBuildMs from potentially 100-300ms to <10ms on follow-ups. It also reduces load on the journal and user tables.

 ────────────────────────────────────────────────────────────────────────────────

 9. The Soul Document Is a Single Blob — You Need Persona Modules

 Current state: One 62-line oracle_soul document defines identity, voice, capabilities, behavior, special question handling, and response format all in one textarea.

 The problem: Editing the "voice" section risks accidentally breaking the "special question handling" section. There's no separation of concerns. As the persona grows (and it will — you'll want seasonal personas, trial personas for A/B tests, "gentle mode" for
 crisis-adjacent queries), the single blob becomes unmanageable.

 Recommendation: Decompose the soul into persona modules that compose:

 - persona/voice.md — Tone, sentence length, banned phrases.
 - persona/identity.md — Who the Oracle is, what it believes.
 - persona/format.md — Response structure, paragraph rules, citation rules.
 - persona/special-handling.md — Horoscope, retrograde, compatibility, prediction rules.
 - persona/seasonal.md — Optional overlay (e.g., solstice tone shifts).

 The admin UI shows these as collapsible sections, not one giant textarea. The database stores them as separate rows (e.g., oracle_soul_voice, oracle_soul_identity) or as a single JSON blob with named keys. The prompt composer pulls the modules it needs based on the
 feature — a generic chat might skip special-handling, a crisis-adjacent query might inject persona/crisis-gentle.md.

 This also makes A/B testing trivial: you can test voice-v2.md against voice-v1.md without touching the rest of the persona.

 ────────────────────────────────────────────────────────────────────────────────

 10. Feature Injections Are Free Text in the DB with No Validation

 Current state: oracle_feature_injections stores contextText as free text. The admin can edit it. There's no validation that the injected text doesn't break the prompt structure (e.g., forgetting [END ...] tags, injecting conflicting instructions).

 The problem: A malformed feature injection could leak into production and cause the model to ignore safety rules, break formatting, or output garbled text. There's no preview or dry-run.

 Recommendation: Add a prompt linting layer:

 1. Syntax validation: Ensure all [BLOCK ...] tags have matching [END BLOCK ...] tags. Ensure no [SAFETY] tags appear in user-editable content.
 2. Semantic validation: Run the feature injection through a lightweight classifier that checks for "instruction override" patterns ("ignore previous", "you are now a...").
 3. Dry-run button: Before saving a feature injection, the admin can click "Test" which runs the assembled prompt against a cheap model (Haiku, Gemini Flash) with a fixed test query. The admin sees the output before deploying.
 4. Versioning: Store feature injections with version numbers. Don't overwrite the active one — create a new version and promote it. This enables instant rollback when a bad injection goes live.

 ────────────────────────────────────────────────────────────────────────────────

 11. Timespace Context Is Text-Only, Not Structured

 Current state: buildTimespaceContext() provides local datetime and, when temporal intent is detected, "cosmic weather data" as prose (planetary positions, moon phase, active transits).

 The problem: The model is doing astronomical math from prose descriptions. If you tell it "Mars is at 15° Leo" and the user asks "Is Mars squaring my natal Mars at 14° Scorpio?", the model has to do degree math in its head. LLMs are bad at this. It will hallucinate
 orbs and sign boundaries.

 Recommendation: Move timespace context to structured data and, eventually, computed ephemeris tools.

 Instead of prose:

 ```
   [Mars: Leo 15.30°]
 ```

 Give structured data:

 ```json
   {"transits": [{"planet": "Mars", "sign": "Leo", "degree": 15.30, "retrograde": false}]}
 ```

 Better yet, don't ask the model to do the math. Add a transit calculation tool (using Swiss Ephemeris or a library like swisseph / astrology-js) that the model can call:

 ```
   User: "Is Mars squaring my natal Mars?"
   → Tool: `calculateTransits({ natalChart: ..., date: ... })`
   → Result: `{"Mars transiting Leo 15°": {"square natal Mars Scorpio 14°": {"orb": 1.3°, "applying": true, "exact": "2026-06-10"}}}`
   → Model: "Mars is currently square your natal Mars with a tight 1.3° orb, exact on June 10th."
 ```

 This eliminates astronomical hallucinations entirely. It also makes your product defensibly accurate — "our transits are computed, not guessed."

 ────────────────────────────────────────────────────────────────────────────────

 12. You Lack a "Conversation Memory" Layer

 Current state: Conversation history is truncated to maxContextMessages (default 20) and MAX_CONTEXT_CHARS (16,000). Older messages are forgotten.

 The problem: If a user has a 30-message session about their birth chart, messages 1-10 are dropped. The model forgets that it already explained the Sun-Venus conjunction. The user says "Wait, you told me earlier that my Venus was in Gemini" — the model might
 contradict itself because the earlier explanation was truncated.

 Recommendation: Add a conversation memory layer via explicit compaction you control:

 1. Every N messages (e.g., 10), generate a running summary of what has been established in the conversation:
     - "User's Sun-Venus conjunction in Gemini H11 has been discussed as the source of their social charm."
     - "User is concerned about their upcoming Saturn return."
     - "User's journal shows anxiety peaking during Mercury retrograde."
 2. Store this summary on the session document.
 3. When context is truncated, inject the summary as a memory block in the system prompt:
    ```
      [CONVERSATION MEMORY]
      Key facts established in this session:
      - Sun conjunct Venus (H11) = social magnetism
      - Saturn return concern (Saturn in Aquarius H8)
      - Journal pattern: anxiety during Mercury retrograde
      [END CONVERSATION MEMORY]
    ```
 4. The model retains continuity even when the raw history is truncated.

 This is different from Pi's automatic compaction because you control the content of the summary (astrology-specific facts, not generic conversation summarization). You can extract it using structured output from a cheap model call, or maintain it incrementally as
 facts are cited.

 ────────────────────────────────────────────────────────────────────────────────

 13. The Debug Panel Is Client-Side Rendered

 Current state: The debug panel is conditionally rendered in React based on user?.role === "admin". The document notes: "There is no server-side gate on the panel itself — the check is client-side only."

 The problem: This is minor because the queries enforce admin auth, but it's still a UI leak. A non-admin user could theoretically inspect the React tree and see the component structure, or a bug could briefly render it. In a product handling sensitive journal data,
 even UI leaks matter.

 Recommendation: Move the visibility check to the server-side layout or a server component. In Next.js App Router, the layout should fetch the user role server-side and only include the debug panel script/component for admins. The client never receives the component
 code unless authorized.

 ────────────────────────────────────────────────────────────────────────────────

 14. No Escalation Path for Model Refusal Edge Cases

 Current state: If all models fail, you return the hardcoded fallback text. If the kill switch is on, you return the fallback. If the user hits a safety edge case the model refuses to answer, there's no defined behavior.

 The problem: As models get more cautious (Claude 4 is more refusal-prone than Claude 3), you will see increasing "I can't answer that" responses for benign astrology questions that happen to trigger safety heuristics (e.g., a user asking about death transits in a
 historical/educational way).

 Recommendation: Add a refusal detection and escalation path:

 1. Detect model refusals in the response parser (pattern matching for "I can't", "I'm not able to", "I apologize").
 2. If a refusal is detected on a Tier A model, retry the exact same prompt on Tier B with a modified system prompt that includes a REFUSAL_RECOVERY block:
    ```
      [REFUSAL RECOVERY]
      The previous model refused this benign astrology question in error.
      You are an astrology educator. The user is asking about symbolic transits,
      not medical or suicide advice. Please answer normally.
      [END REFUSAL RECOVERY]
    ```
 3. Log all refusals with the full prompt hash and user question for admin review. This dataset becomes your "refusal regression test suite" — you can tune the safety block to be more precise.

 ────────────────────────────────────────────────────────────────────────────────

 15. The Quota System Is Primitive for a Tiered Product

 Current state: Per-role daily/lifetime caps. Free=5 lifetime, Popular=5/day, Premium=10/day, Admin=999.

 The problem: This doesn't map to modern SaaS pricing psychology. A user who hits their 5th question at 11pm and sees "Upgrade to premium" with a 10/day cap feels insulted — the difference is too small. The free tier lifetime cap creates anxiety ("should I save my
 questions?") that discourages engagement.

 Recommendation: Consider usage-based pricing with burst allowances:

 - Free: 3/day + 1 "deep reading" per week (birth chart full or cosmic recall count as deep).
 - Popular: 15/day, unlimited generic chat, 3 deep readings/week.
 - Premium: Unlimited generic chat, unlimited deep readings.
 - Moderator/Admin: Same as premium but with debug features.

 Track two counters: genericChatCount and deepReadingCount. This lets you give away the low-cost generic chat (short context, no birth data) generously while gating the expensive deep features. It also aligns your pricing with your costs: generic chat costs you
 ~$0.002, a cosmic recall with expanded journal budget costs ~$0.015.

 ────────────────────────────────────────────────────────────────────────────────

 Summary: Prioritized Roadmap

 If I were advising on the next 3 months, the priority order would be:

 Month 1 — Foundation:
 1. Structured output for title/journal prompt/cited placements. Eliminates regex fragility.
 2. Differential birth context on follow-ups. Immediate context window savings.
 3. Prompt composer refactor (tagged blocks). Unblocks all future features.

 Month 2 — Quality & Safety:
 4. Regression test suite with golden dataset. Makes prompt changes safe.
 5. Output-layer safety classifier. Critical before you scale beyond early adopters.
 6. Conversation memory / summary layer. Fixes the truncation amnesia problem.

 Month 3 — Scale & Depth:
 7. Ephemeris tool integration (Swiss Ephemeris). Moves you from "AI astrology" to "computational astrology with AI interpretation" — a genuine moat.
 8. Embedding-based intent router. Cuts first-message latency in half.
 9. Usage-based quota refactor (generic vs. deep). Better conversion psychology.

 This keeps you building product while fixing the architectural debt that would otherwise trap you at the current feature set.