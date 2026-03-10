# stars.guide: Technical Introduction
## The Agentic Astrology Platform

---

## 🌟 What is stars.guide?

**stars.guide** is a next-generation astrology platform that transforms traditional "static horoscope delivery" into an **agentic, personalized spiritual operating system**. Unlike competitors (Co-Star, The Pattern, Sanctuary), we combine:

1. **Precision Astronomy** (`astronomy-engine`) for real-time planetary calculations
2. **AI Memory** (RAG via Convex Vector Search) to remember user context (journal entries, life events)
3. **Generative Art** (Flux.1 via OpenRouter) for unique daily "Astral Cards"
4. **Empowering Guidance** (LLM synthesis) that coaches users on how to *work with* transits, not just predict fate

**Core Philosophy:** We don't tell users what *will* happen. We help them navigate what *is* happening.

---

## 🏗️ Technical Architecture

### Stack Overview

```
┌─────────────────────────────────────────────────────────────┐
│                      FRONTEND LAYER                          │
├─────────────────────────────────────────────────────────────┤
│ Next.js 16 (App Router) + TypeScript                        │
│ • React 19.2.4                                               │
│ • Tailwind CSS v4 (PostCSS, no JIT config needed)          │
│ • shadcn-ui (Radix UI primitives)                           │
│ • Motion (Framer Motion successor) for animations           │
│ • Zustand for client state management                       │
└─────────────────────────────────────────────────────────────┘
                              ↕
┌─────────────────────────────────────────────────────────────┐
│                      BACKEND LAYER                           │
├─────────────────────────────────────────────────────────────┤
│ Convex (All-in-One Backend)                                 │
│ • Database (Real-time, serverless)                          │
│ • Authentication (@convex-dev/auth)                         │
│ • Vector Search (for RAG / AI memory)                       │
│ • Cron Jobs (Daily horoscope generation)                    │
│ • HTTP Actions (webhooks, APIs)                             │
└─────────────────────────────────────────────────────────────┘
                              ↕
┌─────────────────────────────────────────────────────────────┐
│                    EXTERNAL SERVICES                         │
├─────────────────────────────────────────────────────────────┤
│ • astronomy-engine (MIT): Precise planetary calculations    │
│ • OpenRouter API: LLM inference (Claude, GPT-4o, Llama)    │
│ • OpenRouter API: Image generation (Flux.1 Schnell)        │
│ • Google Places API: Geocoding for birth locations         │
│ • Lemon Squeezy: Payment processing (future)           │
└─────────────────────────────────────────────────────────────┘
                              ↕
┌─────────────────────────────────────────────────────────────┐
│                     DEPLOYMENT                               │
├─────────────────────────────────────────────────────────────┤
│ Cloudflare Workers (via OpenNext + Wrangler)               │
│ • Edge-optimized Next.js deployment                         │
│ • Global CDN                                                 │
│ • Auto-scaling                                               │
│ • Cost-effective (pay-per-request)                          │
└─────────────────────────────────────────────────────────────┘
```

---

## 📦 Core Dependencies

### Frontend
```json
{
  "next": "16.1.6",              // App Router, React Server Components
  "react": "19.2.4",
  "typescript": "5.9.3",
  "tailwindcss": "4.1.18",       // v4: PostCSS-based, no config needed
  "@radix-ui/*": "latest",       // Accessible UI primitives (shadcn-ui)
  "motion": "^12.29.2",          // Animations (Framer Motion successor)
  "zustand": "^5.0.10",          // Client state (user, onboarding)
  "lucide-react": "^0.563.0",    // Icon library
  "react-icons": "^5.5.0",       // Additional icons (zodiac symbols)
  "next-themes": "^0.4.6",       // Dark/light mode
  "sonner": "^2.0.7"             // Toast notifications
}
```

### Backend (Convex)
```json
{
  "convex": "^1.31.7",           // Convex SDK
  "@convex-dev/auth": "^0.0.90", // Authentication (free)
  "@auth/core": "^0.37.0"        // Auth.js core (OAuth providers)
}
```

### Deployment
```json
{
  "@opennextjs/cloudflare": "1.16.1", // Next.js → Workers adapter
  "wrangler": "4.61.1"                 // Cloudflare CLI
}
```

---

## 🔐 Authentication Flow

### Providers
- **Email/Password** (via `@convex-dev/auth/providers/Password`)
- **OAuth**: Google, Facebook, X (via `@auth/core`)

### Flow
1. User signs up/signs in → Convex Auth creates user in `users` table
2. `createOrUpdateUser` hook initializes defaults (tier: "free", role: "user")
3. Frontend syncs user to Zustand store via `UserSync` component
4. Middleware protects routes (public: `/`, `/sign-in`; protected: everything else)

### State Management
```typescript
// Frontend: src/store/use-user-store.ts
interface UserStore {
  user: User | null;
  isLoading: boolean;
  
  // Computed helpers
  isAuthenticated: () => boolean;
  needsOnboarding: () => boolean;  // Check if birthData exists
  isPremium: () => boolean;        // Check if tier !== "free"
}
```

---

## 🎨 Design System

### Brand Identity: "Celestial Art Nouveau"
- **Palette**: Deep Midnight Blue + Warm Gold/Brass + Cream/Parchment
- **Typography**: 
  - Headers: Cinzel (sharp serif, historical)
  - Body: Inter (geometric sans-serif, modern)
- **UI Style**: Glassmorphism (frosted cards), fine-line illustrations, subtle noise/grain
- **Tone**: Mentorship (calm, assuring, directional) — NOT roasting (Co-Star) or chatty (Sanctuary)

### Tailwind v4 Setup
```css
/* globals.css */
@import "tailwindcss";

@theme {
  --color-primary: oklch(0.5 0.2 240);     /* Deep midnight blue */
  --color-secondary: oklch(0.8 0.1 60);    /* Warm gold */
  --font-serif: "Cinzel", serif;
  --font-sans: "Inter", sans-serif;
}
```

**Critical Rule:** shadcn-ui components are pre-styled. **Do NOT add custom Tailwind classes** (e.g., `rounded-xl`, `bg-black`) to components—they work out of the box.

---

## ⚙️ Key Features & Implementation

### 1. Onboarding Flow (Phase 4)
**Goal:** Collect birth data (date, location, time) with 80%+ completion rate.

**Challenge:** 70% of users don't know their exact birth time.

**Solution:** "Birth Time Detective" mode
- Step 1-2: Easy wins (date, location)
- Step 3: Fork ("Do you know your birth time?")
  - YES → Time input with confidence meter → Chart reveal
  - NO → Time of day + personality questions → Estimated rising sign → Solar chart

**Store:** `useOnboardingStore` (Zustand with persistence)

### 2. Natal Chart Calculation
**Library:** `astronomy-engine` (MIT licensed, not Swiss Ephemeris)
- Calculates precise planetary positions (RA/Dec)
- Returns Sun/Moon/Rising signs + house placements
- Runs in Convex Actions (server-side for data integrity)

**Mutation:**
```typescript
// convex/users.ts
export const updateBirthData = mutation({
  args: { date, time, location, sunSign, moonSign, risingSign },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    await ctx.db.patch(userId, { birthData: args });
  }
});
```

### 3. Daily Spark (AI-Generated Insights)
**Flow:**
1. Cron job triggers daily (7 AM user's local time)
2. Convex Action calculates current transits (`astronomy-engine`)
3. Convex Vector Search retrieves relevant user journal entries (RAG)
4. Send to OpenRouter (Claude 3.5 Sonnet): "System Prompt + Astro Data + User Context"
5. LLM synthesizes "Daily Spark" (headline + body + micro-ritual)
6. Push notification + UI update

**Example Prompt:**
```
User: Alice (Scorpio Sun, Pisces Moon, Libra Rising)
Transit: Mars square Saturn in 10th house (career)
User Context: "Journaled about work anxiety yesterday"

Task: Synthesize top 2 transits. Connect to user's anxiety.
Suggest one micro-ritual to channel this energy.
```

### 4. The Oracle (AI Chat with Memory)
**Feature:** Conversational astrology assistant that remembers user's story.

**Implementation:**
- User asks: "Is today good for a salary negotiation?"
- Convex Vector Search finds relevant past transits + journal entries
- Send to OpenRouter with full context
- Response references user's history: "Given your Mars-Saturn square last month when you felt stuck at work..."

**Tech:** Convex built-in Vector Search (no separate Pinecone/Weaviate needed)

### 5. Astral Cards (Generative Art)
**Feature:** Daily AI-generated tarot-style card representing cosmic energy.

**Flow:**
1. Identify primary transit (e.g., "Mars enters Aries")
2. Generate prompt: "Tarot card, Mars in Aries, Art Nouveau style, fiery red + gold, ethereal lighting, intricate border, --no text"
3. Send to OpenRouter (Flux.1 Schnell)
4. Store image URL in Convex
5. Display in Daily Spark + allow download/share

### 6. Oracle Quota
Whenever a user requests the Oracle (or we try to augment usage on incrementQuota), Convex checks their designated plan:

```typescript
const plan = (user.role === "admin" || user.role === "moderator") 
    ? user.role 
    : user.tier as string;
```

---

## 🛠️ Development Commands

```bash
# Install dependencies
pnpm install

# Development
pnpm dev                       # Next.js dev server (localhost:3000)
pnpm dlx convex dev                 # Convex backend (watch mode)

# Type checking
pnpm check                     # Build + TypeScript check

# Linting
pnpm lint                      # ESLint

# Production build
pnpm build                     # Next.js build
pnpm run deploy                # Deploy to Cloudflare Workers

# Convex utilities
npx convex dashboard           # Open Convex dashboard
npx convex logs                # View function logs
npx convex data                # Browse database
```

---

## 📚 Key Resources

### Documentation
- **Convex:** https://docs.convex.dev
- **Next.js 16:** https://nextjs.org/docs
- **Tailwind v4:** https://tailwindcss.com/docs
- **shadcn-ui:** https://ui.shadcn.com
- **astronomy-engine:** https://github.com/cosinekitty/astronomy
- **OpenRouter:** https://openrouter.ai/docs

---

**stars.guide is not just an astrology app. It's a new paradigm: Agentic Astrology. We give users agency, not predictions. We remember their story, not just their chart. We are their cosmic companion, not their fortune teller.**

---

*Last Updated: 10th of March 2026*  
*Document Version: 1.0*  
*Maintained by: stars.guide Engineering Team*