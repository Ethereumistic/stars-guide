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

## 🗄️ Database Architecture

### Single-Table Strategy (Atomic User)

We use a **unified `users` table** to store all core user data in one place:

```typescript
// convex/schema.ts
users: defineTable({
  // Auth (managed by Convex Auth)
  name, email, image, emailVerificationTime, phone, etc.
  
  // Subscription & Access Control unified
  tier: "free" | "popular" | "premium"
  subscriptionStatus: "active" | "canceled" | "past_due" | "trialing" | "none",
  subStartedAt, subEndsAt,
  
  // Access Control
  role: "user" | "admin" | "moderator",
  
  // User Preferences
  preferences: {
    dailySparkTime: "07:00",
    notifications: true,
    theme: "dark"
  },
  
  // Birth Data (The Core)
{
  chart: {
    ascendant: { longitude: 133.17, signId: "leo" },
    aspects: [
      {
        angle: 1.66,
        orb: 1.66,
        planet1: "sun",
        planet2: "venus",
        type: "conjunction",
      },
      {
        angle: 7.5,
        orb: 7.5,
        planet1: "sun",
        planet2: "mars",
        type: "conjunction",
      },
      {
        angle: 114.16,
        orb: 5.84,
        planet1: "sun",
        planet2: "uranus",
        type: "trine",
      },
      {
        angle: 176.51,
        orb: 3.49,
        planet1: "sun",
        planet2: "pluto",
        type: "opposition",
      },
      {
        angle: 59.72,
        orb: 0.28,
        planet1: "moon",
        planet2: "jupiter",
        type: "sextile",
      },
      {
        angle: 60.53,
        orb: 0.53,
        planet1: "moon",
        planet2: "saturn",
        type: "sextile",
      },
      {
        angle: 112.5,
        orb: 7.5,
        planet1: "venus",
        planet2: "uranus",
        type: "trine",
      },
      {
        angle: 126.9,
        orb: 6.9,
        planet1: "venus",
        planet2: "neptune",
        type: "trine",
      },
      {
        angle: 178.17,
        orb: 1.83,
        planet1: "venus",
        planet2: "pluto",
        type: "opposition",
      },
      {
        angle: 121.66,
        orb: 1.66,
        planet1: "mars",
        planet2: "uranus",
        type: "trine",
      },
      {
        angle: 0.81,
        orb: 0.81,
        planet1: "jupiter",
        planet2: "saturn",
        type: "conjunction",
      },
      {
        angle: 93.72,
        orb: 3.72,
        planet1: "jupiter",
        planet2: "uranus",
        type: "square",
      },
      {
        angle: 92.91,
        orb: 2.91,
        planet1: "saturn",
        planet2: "uranus",
        type: "square",
      },
      {
        angle: 54.93,
        orb: 5.07,
        planet1: "neptune",
        planet2: "pluto",
        type: "sextile",
      },
    ],
    houses: [
      { id: 1, longitude: 120, signId: "leo" },
      { id: 2, longitude: 150, signId: "virgo" },
      { id: 3, longitude: 180, signId: "libra" },
      { id: 4, longitude: 210, signId: "scorpio" },
      { id: 5, longitude: 240, signId: "sagittarius" },
      { id: 6, longitude: 270, signId: "capricorn" },
      { id: 7, longitude: 300, signId: "aquarius" },
      { id: 8, longitude: 330, signId: "pisces" },
      { id: 9, longitude: 0, signId: "aries" },
      { id: 10, longitude: 30, signId: "taurus" },
      { id: 11, longitude: 60, signId: "gemini" },
      { id: 12, longitude: 90, signId: "cancer" },
    ],
    planets: [
      {
        dignity: "peregrine",
        houseId: 11,
        id: "sun",
        longitude: 74.93,
        retrograde: false,
        signId: "gemini",
      },
      {
        dignity: "domicile",
        houseId: 12,
        id: "moon",
        longitude: 114.21,
        retrograde: false,
        signId: "cancer",
      },
      {
        dignity: "peregrine",
        houseId: 12,
        id: "mercury",
        longitude: 98.39,
        retrograde: false,
        signId: "cancer",
      },
      {
        dignity: "peregrine",
        houseId: 11,
        id: "venus",
        longitude: 73.27,
        retrograde: false,
        signId: "gemini",
      },
      {
        dignity: "peregrine",
        houseId: 11,
        id: "mars",
        longitude: 82.43,
        retrograde: false,
        signId: "gemini",
      },
      {
        dignity: "peregrine",
        houseId: 10,
        id: "jupiter",
        longitude: 54.49,
        retrograde: false,
        signId: "taurus",
      },
      {
        dignity: "peregrine",
        houseId: 10,
        id: "saturn",
        longitude: 53.68,
        retrograde: false,
        signId: "taurus",
      },
      {
        dignity: "domicile",
        houseId: 7,
        id: "uranus",
        longitude: 320.77,
        retrograde: true,
        signId: "aquarius",
      },
      {
        dignity: "peregrine",
        houseId: 7,
        id: "neptune",
        longitude: 306.37,
        retrograde: true,
        signId: "aquarius",
      },
      {
        dignity: "peregrine",
        houseId: 5,
        id: "pluto",
        longitude: 251.44,
        retrograde: true,
        signId: "sagittarius",
      },
      {
        dignity: null,
        houseId: 12,
        id: "north_node",
        longitude: 115.18,
        retrograde: true,
        signId: "cancer",
      },
      {
        dignity: null,
        houseId: 6,
        id: "south_node",
        longitude: 295.18,
        retrograde: true,
        signId: "capricorn",
      },
      {
        dignity: null,
        houseId: 2,
        id: "part_of_fortune",
        longitude: 172.45,
        retrograde: false,
        signId: "virgo",
      },
      {
        dignity: null,
        houseId: 5,
        id: "chiron",
        longitude: 254.1,
        retrograde: true,
        signId: "sagittarius",
      },
    ],
  },
  date: "2000-06-05",
  houseSystem: "whole_sign",
  location: {
    city: "Gabrovo",
    country: "Bulgaria",
    countryCode: "bg",
    lat: 42.9638895,
    long: 25.2119538,
  },
  placements: [
    { body: "Ascendant", house: 1, sign: "Leo" },
    { body: "Sun", house: 11, sign: "Gemini" },
    { body: "Moon", house: 12, sign: "Cancer" },
    { body: "Mercury", house: 12, sign: "Cancer" },
    { body: "Venus", house: 11, sign: "Gemini" },
    { body: "Mars", house: 11, sign: "Gemini" },
    { body: "Jupiter", house: 10, sign: "Taurus" },
    { body: "Saturn", house: 10, sign: "Taurus" },
    { body: "Uranus", house: 7, sign: "Aquarius" },
    { body: "Neptune", house: 7, sign: "Aquarius" },
    { body: "Pluto", house: 5, sign: "Sagittarius" },
    { body: "North Node", house: 12, sign: "Cancer" },
    { body: "South Node", house: 6, sign: "Capricorn" },
    { body: "Part Of Fortune", house: 2, sign: "Virgo" },
    { body: "Chiron", house: 5, sign: "Sagittarius" },
  ],
  time: "10:20",
  timezone: "Europe/Sofia",
  utcTimestamp: "2000-06-05T07:20:00.000Z",
}
})
```

**Why Single-Table?**
- **Zero-latency user context for AI** (no joins)
- **Atomic user creation** (auth + profile in one transaction)
- **Simpler queries** (one `db.get(userId)` returns everything)
- **Audit trail separate** (`subscription_history` table for compliance)

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

---

## 🚀 Deployment Pipeline

### Local Development
```bash
# Terminal 1: Convex backend
npx convex dev

# Terminal 2: Next.js frontend
pnpm dev
```

### Production Deployment
```bash
# Build for Cloudflare Workers
pnpm run deploy

# Under the hood:
# 1. opennextjs-cloudflare build
#    - Converts Next.js App Router to Workers-compatible format
# 2. wrangler deploy
#    - Deploys to Cloudflare edge network
```
---

## 📊 Scalability & Cost

### Convex Free Tier Capacity
- **1GB database** → ~100K user profiles
- **1M function calls/month** → ~50K active users
- **Unlimited bandwidth**
- **Cost:** $0 until you hit limits

### Cloudflare Workers
- **Pay-per-request** model
- **100K requests/day free**, then $0.50/million
- **Edge-optimized** (sub-50ms response times globally)

### OpenRouter Costs
- **LLM (Claude 3.5 Sonnet):** ~$3/million tokens
- **Image (Flux.1 Schnell):** ~$0.003/image
- **Budget:** ~$100/month at 10K active users

**Total Monthly Cost (10K Users):**
- Convex: $0 (free tier)
- Cloudflare: ~$5 (above free tier)
- OpenRouter: ~$100 (AI inference)
- **Grand Total: ~$105/month** (vs. $500+ for typical startup stack)

---

## 🔧 Key Files & Structure

```
stars-guide/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── (auth)/            # Auth route group (sign-in, sign-up)
│   │   ├── (dashboard)/       # Protected routes
│   │   ├── onboarding/        # Birth data collection
│   │   ├── layout.tsx         # Root layout (providers)
│   │   └── globals.css        # Tailwind v4 + design tokens
│   │
│   ├── components/
│   │   ├── ui/                # shadcn-ui components
│   │   ├── hero/              # ShootingStars, StarsBackground
│   │   └── providers/         # UserSync, ConvexProvider
│   │
│   └── store/
│       ├── use-user-store.ts       # Global user state
│       └── use-onboarding-store.ts # Onboarding flow state
│
├── convex/
│   ├── schema.ts              # Database schema (users, subscription_history)
│   ├── auth.ts                # Auth config (providers, callbacks)
│   ├── users.ts               # User mutations & queries
│   ├── http.ts                # HTTP routes (webhooks)
│   └── crons.ts               # Scheduled jobs (Daily Spark)
│
├── public/
│   └── fonts/                 # Cinzel, Inter (local fonts)
│
└── config files
    ├── next.config.ts         # Next.js config
    ├── tailwind.config.ts     # (Empty - v4 uses @theme in CSS)
    ├── tsconfig.json          # TypeScript config
    └── wrangler.toml          # Cloudflare Workers config
```

---

## 🛠️ Development Commands

```bash
# Install dependencies
pnpm install

# Development
pnpm dev                       # Next.js dev server (localhost:3000)
npx convex dev                 # Convex backend (watch mode)

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

## 🧪 Testing Strategy

### Manual Testing Checklist
- [ ] Sign up with email/password
- [ ] Sign in with Google OAuth
- [ ] Complete onboarding (known birth time)
- [ ] Complete onboarding (unknown birth time)
- [ ] View natal chart on dashboard
- [ ] Receive Daily Spark notification
- [ ] Ask Oracle a question
- [ ] Upgrade to paid tier (future)

### Automated Testing (Future)
- Unit tests: Vitest
- E2E tests: Playwright
- Component tests: React Testing Library

---

## 📚 Key Resources

### Documentation
- **Convex:** https://docs.convex.dev
- **Next.js 16:** https://nextjs.org/docs
- **Tailwind v4:** https://tailwindcss.com/docs
- **shadcn-ui:** https://ui.shadcn.com
- **astronomy-engine:** https://github.com/cosinekitty/astronomy
- **OpenRouter:** https://openrouter.ai/docs

### Community
- Convex Discord: https://convex.dev/community
- Next.js Discord: https://nextjs.org/discord

---

## ⚠️ Critical Decisions & Trade-offs

### Why Convex over Supabase/Firebase?
- **Built-in Vector Search** (RAG for AI memory)
- **Real-time by default** (no webhooks/polling)
- **Generous free tier** (1GB database, 1M calls/month)
- **TypeScript-first** (auto-generated types)
- **No separate auth service** (Convex Auth included)

### Why astronomy-engine over Swiss Ephemeris?
- **MIT License** (Swiss Ephemeris is GPL/commercial)
- **JavaScript native** (no C++ bindings)
- **Sufficient precision** (±0.1° accuracy, fine for consumer astrology)
- **Lightweight** (< 100KB vs. Swiss Ephemeris's large data files)

### Why Cloudflare Workers over Vercel?
- **Cost** (pay-per-request vs. flat monthly)
- **Edge-optimized** (faster global response times)
- **No cold starts** (Workers are instant)
- **Flexibility** (can deploy to any region)

### Why Single-Table Design?
- **Performance** (zero-latency user context)
- **Simplicity** (fewer tables = simpler code)
- **AI-first** (RAG needs full user context instantly)
- **Trade-off:** Normalized subscriptions (audit trail) is in separate `subscription_history` table

---

## 🎓 Onboarding New Developers

### Prerequisites
- Node.js 18+
- pnpm (package manager)
- Git
- Convex account (free at convex.dev)
- Cloudflare account (free Workers tier)

### First-Time Setup
```bash
# 1. Clone repo
git clone https://github.com/yourorg/stars-guide.git
cd stars-guide

# 2. Install dependencies
pnpm install

# 3. Set up Convex
npx convex dev
# (Follow prompts to create deployment)

# 4. Set environment variables
cp .env.example .env.local
# Edit .env.local with your API keys

# 5. Run development servers
pnpm dev             # Terminal 1 (Next.js)
npx convex dev       # Terminal 2 (Convex)
```

### Understanding the Codebase
1. **Read:** `design.md` (design system principles)
2. **Read:** `convex/auth.md` (authentication architecture)
3. **Read:** `onboarding-flow-phase4.md` (onboarding UX strategy)
4. **Explore:** `src/app/` (Next.js routes)
5. **Explore:** `convex/` (backend logic)
6. **Run:** `pnpm dev` and sign up to experience the flow

---

## 🚨 Common Pitfalls & Solutions

### Issue: "Module not found: @/components/ui/..."
**Cause:** TypeScript path alias not recognized.
**Fix:** Ensure `tsconfig.json` has `"@/*": ["./src/*"]` in `paths`.

### Issue: "Convex function failed: Not authenticated"
**Cause:** User session expired or auth middleware misconfigured.
**Fix:** Check `src/middleware.ts` public routes array.

### Issue: "Tailwind classes not working"
**Cause:** Tailwind v4 requires PostCSS setup, not `tailwind.config.js`.
**Fix:** Ensure `@tailwindcss/postcss` is in `devDependencies` and `postcss.config.js` exists.

### Issue: "shadcn-ui component looks unstyled"
**Cause:** Custom Tailwind classes added to component (anti-pattern).
**Fix:** Remove all custom classes. shadcn components are pre-styled.

### Issue: "Deployment to Cloudflare fails"
**Cause:** OpenNext compatibility issue or missing env vars.
**Fix:** Run `pnpm run cf-typegen` to update types, ensure `wrangler.toml` has correct config.

---

## 🎯 North Star Metrics

**Product Success:**
- 10,000 active users by Month 6
- 80%+ onboarding completion rate
- 25%+ Day 7 retention
- 10%+ free-to-paid conversion

**Technical Success:**
- <50ms API response time (p95)
- 99.9% uptime
- <5% error rate
- Zero security incidents

---

**stars.guide is not just an astrology app. It's a new paradigm: Agentic Astrology. We give users agency, not predictions. We remember their story, not just their chart. We are their cosmic companion, not their fortune teller.**

---

*Last Updated: January 2026*  
*Document Version: 1.0*  
*Maintained by: stars.guide Engineering Team*