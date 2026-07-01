# Oracle AI System — Session Title Generation

> Source: ORACLE_EXPLAINED.md §17

---

## Old Approach (removed)

Previously a separate LLM call generated the session title. This was removed during the Oracle rebuild.

---

## Current Approach

The Oracle model itself generates the title as a `TITLE:` line at the end of its first response.

### How it works:

1. The `ORACLE_TITLE_DIRECTIVE` (hardcoded as the last block in every system prompt) instructs the model: "On the very last line of your response, output: TITLE: <4-6 word session summary>"

2. `invokeOracle` calls `parseTitleFromResponse(content)` which:
   - Searches for a `TITLE: <text>` line (case-insensitive regex: `/^\s*TITLE:\s*(.+?)\s*$/im`)
   - If found: extracts title, strips surrounding quotes, truncates to 60 chars, removes the TITLE line from content
   - If not found: returns `title: null`, content unchanged

3. On first response only (`isFirstResponse`), the title is saved via `updateSessionTitle` (sets `titleGenerated: true`)

4. If no `TITLE:` line was found, falls back to `deriveTitleFromContent()` which takes the first sentence, strips astro symbols and arrow suffixes, truncates to 60 chars

5. The cleaned content (without the TITLE line) is what the user actually sees

---

### Why this approach?

The model already has full context of the question + its own answer, so it produces a better title than a cold call to a separate model would. It also eliminates a separate LLM call, saving cost and latency.

---

## Wiring — Title Generation Flow

```
invokeOracle (first response)
       │
       ├── System prompt includes ORACLE_TITLE_DIRECTIVE (Block 5)
       │   (Only on first response)
       │
       ├── LLM generates response ending with:
       │   "...\n\nTITLE: Venus transit and love patterns"
       │
       ├── parseTitleFromResponse(fullContent)
       │       │
       │       ├── Regex match: /TITLE:\s*(.+?)$/im
       │       │       │
       │       │       ├── FOUND: Extract title, strip quotes, truncate 60 chars
       │       │       │         Remove TITLE: line from content
       │       │       │
       │       │       └── NOT FOUND: title = null, content unchanged
       │       │
       │       └── Returns { cleanedContent, title }
       │
       ├── If title found:
       │       └── updateSessionTitle(sessionId, title)
       │           └── Sets oracle_sessions.title + titleGenerated = true
       │
       └── If title not found:
               └── deriveTitleFromContent(content)
                   └── First sentence, stripped, truncated → fallback title
                   └── updateSessionTitle(sessionId, fallbackTitle)
                   └── Sets oracle_sessions.title + titleGenerated = true

Result: oracle_sessions.title is set once on first response,
        titleGenerated prevents re-triggering on follow-ups.
        The user sees cleaned content (no TITLE: line visible).
```