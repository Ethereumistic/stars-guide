# Oracle AI System — Journal Context Injection

> Source: ORACLE_EXPLAINED.md §12

The Journal system provides a consent-gated `[JOURNAL CONTEXT]` block that is injected into Oracle's system prompt when the user has granted access. This is Oracle's single biggest differentiator — it can reference the user's actual emotional patterns, correlate them with astrological transits, and give dramatically more personalized readings.

See `tasks/JOURNAL_EXPLAINED.md` for the complete Journal system documentation. Below is the Oracle-specific integration.

---

## How Journal Context Enters the Oracle Pipeline (v2)

In `invokeOracle` (`convex/oracle/llm.ts`):

1. Journal consent is checked BEFORE intent classification, so the classifier can gate `journal_recall` activation:
   ```typescript
   let hasJournalConsent = false;
   if (user?._id) {
       try {
           const consent = await ctx.runQuery(api.journal.consent.getConsent, {});
           hasJournalConsent = consent?.oracleCanReadJournal === true;
       } catch (e) {
           // Non-blocking
       }
   }
   ```

2. After feature injection and birth context assembly, journal context is ALWAYS assembled when consent is granted — **not just in Cosmic Recall sessions**:
   ```typescript
   const isCosmicRecall = activeFeature?.key === "journal_recall";
   try {
       if (user?._id && hasJournalConsent) {
           journalContext = await ctx.runQuery(
               internal.journal.context.assembleJournalContext,
               { userId: user._id, expandedBudget: isCosmicRecall },
           );
       }
   } catch (e) {
       journalContext = null;
   }
   ```

3. `journalContext` is passed to `buildPrompt()` and inserted into the system prompt.

4. When journal context is present, the `JOURNAL_PROMPT_DIRECTIVE` is also included, instructing Oracle that it may suggest a journal prompt.

---

## Consent Enforcement

The `assembleJournalContext` function (`convex/journal/context.ts`) queries `journal_consent` for the user. If `oracleCanReadJournal !== true`, it immediately returns `null`. This is enforced **server-side** — the client cannot bypass it.

---

## Granular Data Inclusion

The context builder respects four consent flags:

| Flag | Effect on Journal Context |
|------|------------------------|
| `includeEntryContent` | If false, entry text is omitted from summaries |
| `includeMoodData` | If false, emotions and energy level are omitted |
| `includeDreamData` | If false, dream-specific data is omitted |
| `lookbackDays` | Controls how many days of entries Oracle can see (30/90/365/9999) |

---

## Budget Constraints

| Context Type | Budget | Max Entry Chars | Max Entries |
|-------------|--------|-----------------|------------|
| Normal (any feature with consent) | 4,000 | 500 | 10 |
| Cosmic Recall (expanded) | 8,000 | 1,000 | 20 |

---

## Journal Prompt Parsing

After Oracle generates a response, `parseJournalPromptFromResponse()` (`lib/oracle/promptBuilder.ts`) checks for a `JOURNAL_PROMPT: <text>` line. If found:
1. The prompt text is extracted and stripped of quotes
2. The `JOURNAL_PROMPT:` line is removed from the displayed content
3. The prompt is stored on the `oracle_messages` row as `journalPrompt`
4. The UI shows a "✦ Journal about this" button that navigates to the composer with the prompt pre-filled

---

## Cosmic Recall Feature

`journal_recall` is an Oracle feature (`menuGroup: "primary"`, `implemented: true`, `requiresJournalConsent: true`) that gives Oracle deep access to the user's journal for pattern analysis.

**What's different from normal journal context:**
- `expandedBudget: true` → all limits doubled
- Feature injection text: `[COSMIC RECALL MODE]` block instructs Oracle to search journal entries, cite specific dates, and connect emotional patterns to astro events
- The Oracle input menu checks `requiresJournalConsent` and queries consent status; if not granted, the feature is disabled with "Requires journal access" tooltip

**What's the same (v2 change):**
- Journal context is now always present in the system prompt when consent is granted, even in non-Cosmic-Recall sessions. The difference is only the budget and the feature instructions.

---

## Wiring — Journal Context Flow

```
invokeOracle
       │
       ├── Step: Check journal consent (BEFORE intent classification)
       │       │
       │       ├── ctx.runQuery(journal.consent.getConsent)
       │       │       │
       │       │       └── Reads: journal_consent.oracleCanReadJournal
       │       │           │
       │       │           TRUE:  hasJournalConsent = true
       │       │           FALSE: hasJournalConsent = false
       │       │
       │       └── hasJournalConsent gates intent classification for journal_recall
       │           (see 13-intent-classification.md)
       │
       ├── Step: Assemble journal context (AFTER feature injection, ALWAYS if consented)
       │       │
       │       ├── isCosmicRecall = (featureKey === "journal_recall")
       │       │
       │       ├── ctx.runQuery(journal.context.assembleJournalContext, {
       │       │       userId, expandedBudget: isCosmicRecall
       │       │   })
       │       │       │
       │       │       ├── Checks: journal_consent.oracleCanReadJournal === true (server-enforced)
       │       │       ├── Reads: journal entries (respecting lookbackDays, includeEntryContent, etc.)
       │       │       └── Returns: [JOURNAL CONTEXT] block or null
       │       │
       │       └── On failure: journalContext = null (non-blocking)
       │
       ├── Step: buildPrompt()
       │       │
       │       ├── If journalContext is present:
       │       │   └── Inject into system prompt (Block 4)
       │       │
       │       └── If journalContext is present AND isFirstResponse:
       │           └── Also inject JOURNAL_PROMPT_DIRECTIVE (Block 6)
       │
       └── Step: After LLM response, parse JOURNAL_PROMPT: line
               │
               ├── parseJournalPromptFromResponse(content)
               │       └── Strips JOURNAL_PROMPT: line from content
               │       └── Returns { cleanedContent, journalPrompt }
               │
               └── Store journalPrompt on oracle_messages row
                   └── UI renders "✦ Journal about this" button

Key design decisions:
  - Journal context is non-blocking: try/catch wraps it; failures don't stop Oracle
  - Consent is server-enforced: client cannot bypass
  - Budget doubles for Cosmic Recall but data is always present when consented
```