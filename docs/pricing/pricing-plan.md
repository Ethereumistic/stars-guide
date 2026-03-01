You are an expert Next.js and frontend developer building a `/pricing` page for "stars.guide", an agentic astrology platform. 

**Context & Aesthetic:**
* **Vibe:** "The Digital Sanctuary" - a ritualistic space that feels ancient yet futuristic (Celestial Art Nouveau). Emphasize agency, elegance, and calm.
* **Colors:** Deep Midnight Blue (backgrounds), Warm Gold/Brass, Pale Moon Silver, and Cream/Parchment (text/accents).
* **Typography:** Cinzel (Serif) for headings, Inter (Sans-serif) for body text.
* **Stack:** Next.js 16.1.6 (App Router), Tailwind CSS v4, framer-motion, lucide-react, shadcn-ui.

**The Task:**
Create a modern, interactive Pricing page with three tiers: Free, Cosmic Flow, and Astral Architect. 
I have a specific interactive layout in mind based on a previous component that uses `framer-motion` and pointer-tracking CSS variables for a "glare" effect.

**Component Requirements:**
1.  **Layout:** A responsive grid with 3 cards. Each card MUST have exactly 6 feature bullet points to ensure perfect vertical alignment. Use a Check icon for `included: true` and an X icon with strikethrough text for `included: false`.
2.  **Card 1: Free (The Seeker)**
    * Standard card styling (Midnight blue with subtle silver/border).
    * Features: 2 checks, 4 Xs.
3.  **Card 2: Cosmic Flow ($9.99/mo)**
    * Highlighted/Popular card styling.
    * Features: 4 checks, 2 Xs.
    * **Visuals:** Implement a pointer-tracking glare effect (using `onPointerMove` to update `--glare-x` and `--glare-y` CSS variables). The gradient for this card's glare/border should strictly use Warm Gold, Brass, and Starlight Yellow ornaments to evoke a solar, radiant energy. 
4.  **Card 3: Astral Architect ($29.99/mo)**
    * Premium card styling.
    * Features: 6 checks, 0 Xs.
    * **Visuals:** Implement the same pointer-tracking glare effect, but the CSS gradient/ornaments must use a blend of Deep Violet, Amethyst, and Gold to evoke deep mystical, outer-planet alchemy.

**Data Structure to Use:**
```javascript
const plans = [
    {
        name: "Free",
        price: "€0",
        setup: "Always free",
        description: "Your daily connection to the cosmos.",
        bestFor: "Perfect for: The Seeker",
        tier: "base",
        features: [
            { text: "Daily Spark & 1 Transit Analysis", included: true },
            { text: "Accurate Astronomical Charting", included: true },
            { text: "Real-time Oracle Queries", included: false },
            { text: "RAG-Powered Journal Memory", included: false },
            { text: "Generative Astral Cards", included: false },
            { text: "Deep Synastry (Relationship) Analysis", included: false },
        ],
        cta: "Begin Your Journey",
        href: "/auth/register",
    },
    {
        name: "Cosmic Flow",
        price: "€9.99",
        setup: "Billed monthly",
        description: "Align your daily routine with the stars.",
        bestFor: "Perfect for: The Ritualist",
        tier: "popular", // Use this to trigger the Gold/Brass visual logic
        features: [
            { text: "Daily Spark & 1 Transit Analysis", included: true },
            { text: "Accurate Astronomical Charting", included: true },
            { text: "Real-time Oracle Queries", included: true },
            { text: "RAG-Powered Journal Memory", included: true },
            { text: "Generative Astral Cards", included: false },
            { text: "Deep Synastry (Relationship) Analysis", included: false },
        ],
        cta: "Enter the Flow",
        href: "/checkout/flow",
    },
    {
        name: "Astral Architect",
        price: "€29.99",
        setup: "Billed monthly",
        description: "The ultimate spiritual operating system.",
        bestFor: "Perfect for: The Saturn Returner",
        tier: "premium", // Use this to trigger the Violet/Gold visual logic
        features: [
            { text: "Daily Spark & 1 Transit Analysis", included: true },
            { text: "Accurate Astronomical Charting", included: true },
            { text: "Real-time Oracle Queries", included: true },
            { text: "RAG-Powered Journal Memory", included: true },
            { text: "Generative Astral Cards", included: true },
            { text: "Deep Synastry (Relationship) Analysis", included: true },
        ],
        cta: "Master Your Chart",
        href: "/checkout/architect",
    },
]
```
Implementation Details:

Create a PricingCard sub-component that accepts the plan data, an index, and tracks mouse hover states for the radial glow.

For the popular and premium tiers, use a useRef to track mouse coordinates (glare.x, glare.y) and apply them via inline style variables to a pseudo-element or absolute div to create a dynamic, shimmering metallic foil effect.

Ensure text contrasts well against the dark aesthetic. Avoid standard red for the "X" marks; use a muted, low-opacity pale silver or slate to remain "calm".

Please generate the full pricing.tsx client component, and make the /pricing page.