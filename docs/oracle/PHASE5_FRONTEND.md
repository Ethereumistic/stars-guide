# PHASE 5 — Frontend Architecture
## Oracle User Interface · Routing · Conversation Flow · Component Design

---

## Overview

This document covers the full frontend implementation of the Oracle product: routing, conversation flow state machine, component hierarchy, streaming UI, quota enforcement, and UX behavior rules.

---

## 1. Routing

```
/oracle                              ← Server component: immediately redirects to /oracle/new
/oracle/new                          ← Oracle home (IDLE state): badges, input, welcome
/oracle/chat/[sessionId]             ← Active conversation view
```

### /oracle/new page behavior
- Shows the welcome screen (as in the screenshot): personalized greeting, category badges, Oracle input bar
- When a new conversation is submitted and a session is created in Convex, the client **immediately navigates** to `/oracle/chat/{newSessionId}`
- The page does NOT wait for the Oracle response before navigating — the session is created first, then the stream begins at the destination route

### /oracle/chat/[sessionId] page behavior
- On mount: fetches the full session (messages + follow-up answers) from Convex
- If session is `collecting_context`: resumes follow-up flow at the correct question index
- If session is `active` or `completed`: renders full message history
- If sessionId is invalid or belongs to a different user: redirect to `/oracle/new`

---

## 2. State Machine

Managed via **Zustand** store. States:

```
IDLE
  │  user selects category badge
  ▼
TEMPLATE_SELECTION
  │  user clicks template → question populates input
  │  user submits
  ▼
[CHECK: template.requiresThirdParty?]
  NO  ──────────────────────────────────────────────────────┐
  YES                                                        │
  ▼                                                          │
FOLLOW_UP_COLLECTION (Q1 → Q2 → Q3)                        │
  │                                                          │
  └──────────────────────── both paths converge ────────────┘
                            │
                            ▼
ORACLE_RESPONDING (streaming — "Consulting the stars...")
  │
  ▼
CONVERSATION_ACTIVE
  │  subsequent messages: no quota check per message (quota already consumed),
  │  no follow-ups, direct LLM call with full message history
  ▼
(user clicks "New Divination" → navigate to /oracle/new → IDLE)
```

### Zustand Store Shape

```typescript
interface OracleStore {
  // Routing / Session
  sessionId: string | null;
  state: OracleState;

  // Category + Template
  selectedCategorySlug: string | null;
  selectedTemplateId: string | null;
  selectedTemplateRequiresThirdParty: boolean;
  pendingQuestion: string;

  // Follow-up flow (third-party context collection)
  followUps: FollowUp[];
  currentFollowUpIndex: number;
  followUpAnswers: Record<string, string>; // followUpId → answer

  // Messages (optimistic local state)
  messages: OracleMessage[];
  streamingContent: string;
  isStreaming: boolean;

  // Quota state (read from Convex, not calculated client-side)
  quotaRemaining: number | null;
  quotaResetAt: number | null;
  quotaExhausted: boolean;

  // Actions
  selectCategory: (slug: string) => void;
  selectTemplate: (template: OracleTemplate) => void;
  setPendingQuestion: (text: string) => void;
  submitQuestion: () => void;
  answerFollowUp: (followUpId: string, answer: string) => void;
  skipFollowUp: (followUpId: string) => void;
  sendFollowUpMessage: (content: string) => void;
  startNewSession: () => void;
  loadSession: (sessionId: string) => void;
  resetToIdle: () => void;
}
```

---

## 3. Component Hierarchy

```
/oracle/new/page.tsx (IDLE + TEMPLATE_SELECTION state)
├── OracleSidebar
│   ├── NewDivinationButton
│   └── PastWhispersList
│       └── PastWhisperItem (per session)
│
└── OracleMain
    ├── OracleWelcome
    │   ├── StarIcon (animated)
    │   ├── WelcomeHeading ("Welcome, {firstName}" / "BADJAROV" in purple)
    │   └── WelcomeSubheading ("What truth do you seek from the stars today?")
    ├── CategoryBadges (shown in IDLE + TEMPLATE_SELECTION)
    │   └── CategoryBadge (×6) — with icon + label, active state
    ├── TemplateQuestions (shown after category selected, animate in)
    │   └── TemplateQuestionCard (×2 per category)
    └── OracleInputBar (always visible)
        ├── AttachmentButton
        ├── TextInput
        ├── ToolsMenu
        └── SendButton

/oracle/chat/[sessionId]/page.tsx (FOLLOW_UP + RESPONDING + ACTIVE state)
├── OracleSidebar (same as above)
└── OracleConversation
    ├── MessageList (scrollable)
    │   ├── UserMessage
    │   ├── FollowUpPromptMessage (Oracle asks about third party — distinct style)
    │   ├── FollowUpAnswerWidget (interactive, becomes read-only after answer)
    │   └── OracleResponseMessage (streaming-capable, shows Cosmic Invitation styled)
    └── OracleInputBar (disabled during follow-up collection + streaming)
        └── QuotaIndicator (shows remaining questions in current period)
```

---

## 4. Key Component Specs

### CategoryBadge
- Clicking sets `selectedCategorySlug` in Zustand
- Triggers `useQuery(api.oracle.templates.listTemplatesByCategory, { categoryId })` 
- Re-clicking same badge deselects and collapses template list
- Active state: filled badge with slightly different background
- Inactive/unselected: semi-transparent pill

### TemplateQuestionCard
- Rendered in a staggered list below the badges (motion stagger: 80ms per card)
- Clicking the card populates `pendingQuestion` in Zustand (does NOT auto-submit)
- User must press send — they can edit the question first
- Shows full question text, not truncated

### FollowUpPromptMessage
- Appears in the conversation as if Oracle is asking the question
- Styled differently from Oracle's final responses — lighter, more minimal
- Shows progress: "Question 1 of 3" in small text above
- Has a 400ms entrance delay after the previous answer is registered (feels considered)

### FollowUpAnswerWidget
Renders inline in the conversation, directly below the follow-up question:

```typescript
// single_select / multi_select → horizontal scrolling pill group
// free_text → inline text input with Submit button
// date → react-day-picker calendar (already in stack)
// sign_picker → 3×4 zodiac grid (custom, 12 signs as clickable tiles)
// conditional → renders based on previous answer value
```

After answer is submitted:
1. Widget transitions to "answered" read-only state (shows the selected answer as a soft badge)
2. Answer saved to `oracle_follow_up_answers` in Convex
3. 400ms delay → next follow-up question animates in
4. After final follow-up: "Consulting the stars..." loading state begins

### OracleResponseMessage
- Receives `streamingContent` from Zustand while `isStreaming = true`
- Text appears progressively (no character-by-character animation — just append as chunks arrive for performance)
- Has a subtle "pulse" glow animation on the Oracle icon while streaming
- After stream complete: "✦ Cosmic Invitation:" section rendered with distinct italic styling and a left border accent
- Actions on complete: Copy button (clipboard), "Ask a follow-up" prompt text below
- Star icon avatar on every Oracle message (the purple ✦ from the UI)

### OracleInputBar
State-aware behavior:

| State | Input | Send Button | Placeholder |
|-------|-------|------------|-------------|
| IDLE | Enabled | Enabled | "Ask the stars anything..." |
| TEMPLATE_SELECTION | Enabled (pre-filled) | Enabled | — |
| FOLLOW_UP_COLLECTION | **Disabled** | Disabled | "Answer above to continue..." |
| ORACLE_RESPONDING | **Disabled** | Disabled | "Oracle is speaking..." |
| CONVERSATION_ACTIVE | Enabled | Enabled | "Ask a follow-up..." |

### QuotaIndicator
Shown subtly inside the input bar area (right side, small):
- `user` role: "3 of 5 questions remaining (lifetime)"
- Paid roles: "7 of 10 questions today · resets in 14h"
- When 1 remaining: turns amber with a ⚠ icon
- When exhausted: `quotaExhausted` banner replaces input entirely (see below)

### QuotaExhaustedBanner
Replaces the input bar when quota is exhausted:
- Free tier: "You've used all 5 free Oracle sessions. Upgrade to continue — or purchase more with StarDust." + CTA buttons
- Paid daily cap: "You've reached today's limit. Oracle returns in {X hours and Y minutes}." + countdown timer (live updating)

---

## 5. Quota Check Flow (Frontend)

```typescript
// In OracleStore.submitQuestion():
// 1. Call checkQuota via Convex query (already reactive — cached in Zustand)
// 2. If !allowed:
//    - If reason === 'lifetime_cap': show upgrade prompt
//    - If reason === 'daily_cap': show daily reset countdown
//    - Return early — do not create session
// 3. If allowed: create session, navigate to /oracle/chat/{sessionId}, begin stream
// NOTE: Server-side quota enforcement is authoritative.
// Client-side check is UX only — prevents an extra round-trip for the blocked case.
```

---

## 6. "Consulting the Stars" Loading State

After the last follow-up answer (or immediately after submit for `requiresThirdParty: false` templates):

1. A full-width loading state replaces the input area
2. Animated: pulsing Oracle icon with a slow rotating star ring (CSS animation, no JS)
3. Text: "Consulting the stars..." with a subtle dot-dot-dot shimmer
4. This state lasts at minimum **1.5 seconds** — even if the LLM responds faster, we hold it
5. Reasoning: this is a product-level UX decision. The mystical feeling of Oracle "thinking" is part of the value. Never remove this delay.
6. After 1.5s: stream begins and text flows in

---

## 7. Streaming Implementation

```typescript
// hooks/useOracleStream.ts

export function useOracleStream() {
  const { setStreamingContent, setIsStreaming, addMessage } = useOracleStore();

  const startStream = async (sessionId: string) => {
    setIsStreaming(true);
    setStreamingContent('');

    await new Promise(resolve => setTimeout(resolve, 1500)); // Minimum 1.5s loading state

    const response = await fetch('/api/oracle/stream', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId }),
    });

    if (!response.ok) {
      setIsStreaming(false);
      addMessage({ role: 'assistant', content: fallbackMessage });
      return;
    }

    const reader = response.body!.getReader();
    const decoder = new TextDecoder();
    let fullContent = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      for (const line of chunk.split('\n')) {
        if (!line.startsWith('data: ')) continue;
        const data = line.slice(6).trim();
        if (data === '[DONE]') {
          setIsStreaming(false);
          addMessage({ role: 'assistant', content: fullContent });
          return;
        }
        try {
          const parsed = JSON.parse(data);
          const delta = parsed.choices?.[0]?.delta?.content ?? '';
          fullContent += delta;
          setStreamingContent(fullContent);
        } catch {}
      }
    }
    
    setIsStreaming(false);
  };

  return { startStream };
}
```

---

## 8. Sidebar — Past Whispers

```typescript
// Convex query: api.oracle.sessions.getUserSessions({ userId })
// Ordered by lastMessageAt desc
// Reactive — updates in real-time when new sessions are created

// Each item:
// - Category icon (from category record)
// - Session title (first question, truncated ~35 chars)
// - Relative time: "Just now", "2h ago", "3 days ago"
// - Active session: subtle left border highlight

// Clicking: navigate to /oracle/chat/{sessionId}
// "New Divination" button: navigate to /oracle/new, reset Zustand state
```

---

## 9. Animations (motion / Framer Motion)

All using the `motion` package already in the stack:

| Element | Animation |
|---------|-----------|
| Category badge hover | scale(1.04), 150ms ease |
| Template cards enter | staggered fadeInUp, 80ms stagger between cards |
| Template cards exit (category deselect) | fadeOut + scaleDown, 200ms |
| Follow-up question enter | fadeInUp 300ms after 400ms delay |
| FollowUpAnswerWidget → answered state | height collapse to compact badge, 250ms |
| Oracle message enter | fadeIn 400ms |
| Loading state icon | rotate 360° infinite 3s ease-in-out, pulse opacity |
| Sidebar item enter (on new session) | slideInFromLeft 200ms |
| QuotaIndicator amber state | subtle pulse once on transition |

---

## 10. Data Fetching

```typescript
// /oracle/new page
const categories = useQuery(api.oracle.categories.listActiveCategories);
const sessions = useQuery(api.oracle.sessions.getUserSessions, { userId });
const quota = useQuery(api.oracle.quota.checkQuota, { userId }); // reactive

// On category select
const templates = useQuery(
  api.oracle.templates.listTemplatesByCategory,
  selectedCategorySlug ? { categoryId } : 'skip'
);

// On template select (only for requiresThirdParty: true templates)
const followUps = useQuery(
  api.oracle.followUps.getFollowUpsByTemplate,
  selectedTemplateId ? { templateId: selectedTemplateId } : 'skip'
);

// /oracle/chat/[sessionId]
const session = useQuery(api.oracle.sessions.getSessionWithMessages, { sessionId });
```

---

## 11. Empty States

| State | Display |
|-------|---------|
| No past sessions | "Your whispers from the stars will appear here" — subtle star icon, muted text |
| Oracle offline (kill switch) | "The Oracle rests. Return soon." — no input bar, centered in main area |
| All models failed (D response) | Oracle message renders with the fallback text (no error UI — it looks like a real response) |
| Free tier exhausted | QuotaExhaustedBanner with upgrade CTAs |
| Daily cap hit | QuotaExhaustedBanner with countdown timer |
| Invalid session URL | Redirect to /oracle/new, no error shown (seamless) |

---

## 12. Accessibility

- All interactive elements: `aria-label` on icon-only buttons
- FollowUpAnswerWidget pills: keyboard navigable (arrow keys), `role="radiogroup"` for single_select
- Oracle streaming messages: `aria-live="polite"` region so screen readers announce completion
- Loading state: `aria-label="Oracle is consulting the stars"` on the loading container
- Color choices for category badges and quota indicators: tested for WCAG AA contrast against the dark background
- Focus management: after follow-up answer submitted, focus moves to next question automatically