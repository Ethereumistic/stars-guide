# Compositional Synthesis Architecture

## Overview
The **Compositional Synthesis** architecture is the foundational pattern used to build astrology-based components in Stars Guide. It strictly decouples pure astrological domain data from presentational UI configurations. By separating *what* the data is from *how* it is displayed, we achieve a highly modular, maintainable, and predictable system.

## The Core Pillars

The architecture is split into three primary layers:

### 1. Pure Domain Data (`src/astrology`)
This layer holds raw astrological properties (traits, modalities, rulers, dates, elemental insights, etc.). It contains absolutely no UI logic, SVG paths, or React nodes.
- **File:** `src/astrology/signs.ts`
- **Export:** `compositionalSigns` (Array) and `SignData` (Interface)
- **Example Use:** `data.archetypeName`, `data.modality`, `data.traits`

### 2. Presentational UI Config (`src/config`)
This layer handles the visual mapping for elements. It maps IDs to their thematic colors, React Icons, CDN image URLs, and elemental classifications. 
- **Files:** `src/config/zodiac-ui.ts`, `src/config/planet-ui.ts`
- **Exports:** `zodiacUIConfig` (Record/Object)
- **Example Use:** `ui.themeColor`, `<Icon />`, `ui.constellationUrl`

### 3. Engine & Logic (`src/lib/astrology.ts`)
This layer holds pure calculation functions that depend on domain data (e.g., `estimateRisingSign`). It handles calculations natively based on exact dates without mutating state or returning component UI.

---

## How "Synthesis" Works
When building a component, you **synthesize** the final output by querying the Domain Data and the UI Config using the same shared identifier (e.g., `signId === "aries"`). 

Instead of passing massive mega-objects containing textual narratives and UI code to components, the component fetches precisely the stylistic variables and narrative text it needs dynamically from independent sources.

## 🤖 Guide for AI Agents: Creating Components

If you are an AI agent asked to build a new component or page using this architecture, **you must follow this exact 4-step blueprint.**

### Step 1: Import the necessary data sources
Always import the arrays/objects directly. Avoid using deprecated files like `old-zodiac.ts` or `zodiac.ts` if they contain legacy coupled data.

```typescript
import { compositionalSigns } from "@/astrology/signs";
import { zodiacUIConfig } from "@/config/zodiac-ui";
// Use planetUIConfig when needing planets!
// import { planetUIConfig } from "@/config/planet-ui"; 
```

### Step 2: Fetch the Data & UI Config using the Sign ID
Look up both the astrological data and the UI presentation config simultaneously utilizing the string ID.

```typescript
const signId = "leo"; // Example input

// 1. Get Pure Astrological Data
const data = compositionalSigns.find((s) => s.id === signId);

// 2. Get UI Presentation Data
const ui = zodiacUIConfig[signId];

if (!data || !ui) return null; // Always handle missing synthesis natively
```

### Step 3: Handle Thematic Colors & Elements dynamically
If you need CSS variables, dynamically map them based on the `ui.elementName` provided by the config. Build robust helper functions specifically for mapping colors:

```typescript
const getStyles = (element: "Fire" | "Earth" | "Air" | "Water") => {
    const el = element.toLowerCase();
    return {
        primary: `var(--${el}-primary)`,
        secondary: `var(--${el}-secondary)`,
        glow: `var(--${el}-glow)`,
    };
};

const styles = getStyles(ui.elementName);
```

### Step 4: Synthesize in Render
Merge the textual domain data with the UI icons, colors, and layout structure within your JSX, passing properties dynamically as demanded by the UI.

```tsx
export function SynthesizedSignCard({ signId }: { signId: string }) {
    const data = compositionalSigns.find(s => s.id === signId);
    const ui = zodiacUIConfig[signId];
    
    if (!data || !ui) return null;

    const styles = getStyles(ui.elementName);
    const Icon = ui.icon; // Dynamic React Icon from UI conf

    return (
        <div style={{ backgroundColor: styles.glow }} className="p-6 rounded-xl">
            {/* UI from config */}
            <Icon className="w-12 h-12" style={{ color: styles.primary }} />
            
            {/* Data from domain */}
            <h2 className="text-2xl font-bold">{data.name}</h2>
            <p className="uppercase text-sm">{data.dates}</p>
            
            <p className="italic">{data.traits}</p>
            
            {/* Synthesizing both */}
            <div className="mt-4 flex gap-2 border-t pt-4">
                <span>Element: {ui.elementName}</span>
                <span>Modality: {data.modality}</span>
                <span>Ruler: {data.ruler}</span>
            </div>
            
            {/* URLs from UI Config */}
            <img src={ui.constellationUrl} alt={`${data.name} constellation`} />
        </div>
    );
}
```

## Best Practices & Golden Rules
1. **Never Hardcode Domain Data:** Do not put dates, modalities, traits, strings, or text blobs directly into components. Always route them through `src/astrology/signs.ts`.
2. **Never Put React in Domain Data:** `src/astrology/signs.ts` should remain plain, framework-agnostic TypeScript. Do not import `react-icons`, SVGs, or any React components there.
3. **Cross-Config Lookups:** If `data.ruler` specifies `"mars"`, you can safely do a secondary lookup into `planetUIConfig["mars"]` to fetch visually specific data (like the symbol `♂` or `☿`) instantly.
4. **Use CSS Variables:** Rely heavily on CSS variables (e.g., `--fire-primary`) for styling to ensure thematic compliance, dark mode, and global theme changes cascade correctly.