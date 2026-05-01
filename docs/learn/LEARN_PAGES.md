# Learn Pages — Design & Layout Documentation

## Overview

The `/learn` section follows a consistent **dark cosmic editorial** aesthetic with rich typographic hierarchy, ambient glow effects, and staggered card animations. Each category (signs, planets, houses, aspects) shares the same structural DNA but adapts visuals to its subject matter.

---

## Page Architecture

### Hub Pages (`/learn/[category]/page.tsx`)

**Purpose:** Grid overview of all items within a category.

**Layout Structure:**
- Full-width container: `max-w-[1600px] mx-auto px-6 md:px-12`
- Top section: Breadcrumb → Title/Subtitle → Filter Tabs
- Bottom section: Responsive card grid → Footer Linkages section

**Key Components:**
1. **Breadcrumb** — Standard navigation trail (Home / Learn / Category)
2. **PageHeader** — Title (serif, large) + Subtitle (italic, gold) + Filter tabs (element or category)
3. **Card Grid** — Staggered reveal animation with `useCenterCard` hook for active state tracking
4. **SystemArchiveLinkages** — "Related items" footer grid (6 cards max)

**Grid Breakpoints:**
```
1 item  → grid-cols-1 max-w-sm
2 items → grid-cols-1 sm:grid-cols-2 max-w-2xl
3 items → grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 max-w-5xl
4+      → grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4
```

**Stagger Animation:**
- Container variants: `staggerChildren: 0.05, delayChildren: 0.1`
- Card variants: `opacity: 0 → 1, y: 20 → 0, scale: 0.9 → 1`, duration 0.5s, easeOut

**Active Card State (`useCenterCard` hook):**
- Tracks scroll position and finds the card closest to viewport center
- On mobile only: triggers `scale-[1.03]` + opacity + glow changes
- `data-card-index` attribute on each card for tracking

---

### Detail Pages (`/learn/[category]/[item]/page.tsx`)

**Purpose:** Deep-dive into a single item with rich structured content.

**Layout Structure:**
- Full-width with fixed ambient background glow (`radial-gradient` centered, `opacity-[0.15]`, `mix-blend-screen`)
- Hero section: 2-column asymmetric grid (5/12 + 7/12 on lg)
- Data sections: 2-column grid (lg:grid-cols-2, gap-8)
- Footer: SystemArchiveLinkages

**Hero Section (5-col left / 7-col right):**
- **Left:** Title Block → Specs Grid → Essence paragraph
- **Right:** Large visual (constellation image, planet image, or symbol graphic) — `sticky top-32` on desktop

**Content Sections:**
- **Section cards:** `border border-white/10 bg-black/50 p-8 md:p-12 rounded-md`
- **Stats grids:** 2x2 or 2-column layouts with icons
- **Motion:** `whileInView` fade-in with `y: 30 → 0`, `viewport: { once: true, margin: "-100px" }`

**Specs Grid Pattern:**
```
border-b border-white/10
  └─ grid grid-cols-2
       ├─ [icon] Label / Value
       ├─ [icon] Label / Value
       ├─ ...
```

---

## Shared Component Patterns

### PageHeader (`/components/layout/page-header.tsx`)

**Props:**
```ts
breadcrumbs: BreadcrumbItem[]
title: string
subtitle?: string
activeFilter?: string
onFilterChange?: (value: string) => void
showElementFilter?: boolean  // default: true
customFilter?: ReactNode       // for non-element filters (aspects uses Tabs)
filterLabel?: string
```

**Structure:**
- Breadcrumb with `font-mono text-[10px] uppercase tracking-[0.2em]`
- Title: `text-5xl md:text-6xl font-serif font-bold text-white tracking-tighter`
- Subtitle: `italic text-primary drop-shadow-[0_0_15px_rgba(212,175,55,0.3)]`
- Filter: TabsList with `bg-white/5 border border-white/10 p-1 h-auto gap-2`

**Filter Tabs Style:**
- `data-[state=active]:text-white text-white/60`
- `data-[state=active]:bg-white/10 data-[state=active]:border data-[state=active]:border-white/10`
- `data-[state=active]:shadow-[0_0_15px_rgba(255,255,255,0.05)]`
- `font-mono text-xs uppercase tracking-wider`

---

### Compact Cards (`CompactSignCard`, `CompactPlanetCard`, `CompactHouseCard`, `CompactAspectCard`)

**Shared Structure:**
```tsx
<motion.div variants={cardVariants}>
  <Link href={...}>
    <Card className="relative h-full overflow-hidden rounded-xl bg-transparent border border-border/30">
      {/* Background gradient */}
      <div className="absolute inset-0 backdrop-blur-[0.5px] rounded-xl" style={{background}} />
      
      {/* Element/Theme gradient overlay */}
      <div className="absolute inset-0" style={{background: gradient}} />
      
      {/* Watermark (right side) */}
      <div className="absolute inset-y-0 right-0 w-1/2 pointer-events-none">
        <img or span className="..." />
      </div>
      
      {/* Radial glow */}
      <div className="absolute top-1/2 right-0 -translate-y-1/2 w-32 h-32 rounded-full blur-2xl" style={{backgroundColor}} />
      
      {/* Content */}
      <CardContent className="relative p-5 h-full flex items-center justify-between">
        {/* Left: Text */}
        <div className="flex flex-col max-w-[65%]">
          <span>{data.dates || meta}</span>
          <h2>{data.name}</h2>
          <p>{data.archetype || keyword}</p>
        </div>
        {/* Right: Icon/Symbol */}
        <div className="w-16 h-16 shrink-0" />
      </CardContent>
    </Card>
    {/* Hover glow */}
    <div className="absolute inset-0 -z-10 rounded-xl blur-xl opacity-0 group-hover:opacity-20" />
  </Link>
</motion.div>
```

**Card Variants (shared):**
```ts
const cardVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.9 },
  visible: { opacity: 1, y: 0, scale: 1, duration: 0.5, ease: "easeOut" }
};
```

**Active State (mobile scroll-triggered):**
```
scale-[1.03] + opacity-20 gradient + glow blur
```

**Hover State (all sizes):**
```
scale-[1.03] + opacity-40 watermark + opacity-30 glow
```

**Watermarks by category:**
- Signs: `ui.constellationUrl` image (constellation graphic)
- Planets: `ui.imageUrl` image (planet visual)
- Houses: Roman numeral `{data.romanNumeral}` in `font-serif`
- Aspects: Aspect symbol `{data.symbol}` in `font-serif`

---

### Title Blocks (Detail Pages)

**Sign:** `SignTitleBlock` — border, icon, name, dates, motto
**Planet:** `PlanetTitleBlock` — name, classification, verb phrase, ruler symbol

**Style:** `border border-white/10 p-8 space-y-6`

---

### Specs Grids

**Pattern:** Icon + Label (mono, uppercase) + Value stack

```tsx
<div className="flex items-center gap-2.5">
  <Icon className="size-5 text-white/40" />
  <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/30">
    {label}
  </span>
</div>
<span className="text-sm text-white/90">{value}</span>
```

---

### Section Headers

**Pattern:**
```
<span className="font-mono text-[10px] uppercase tracking-[0.4em] text-white/40">
  Category Label
</span>
<h2 className="text-4xl md:text-6xl font-serif text-white tracking-tight">
  Section Title
</h2>
```

---

### Breadcrumb (Detail Pages)

Uses `PageBreadcrumbs` with `currentPageColor` prop for themed accent.

---

## Design Tokens

**Colors:**
- Primary: `#d4af37` (gold)
- Background: Dark black with subtle gradients
- Borders: `border-white/10` or `border-border/30`
- Glow effects: Element/theme-specific colors

**Typography:**
- Display: `font-serif` — large section titles, card names
- Body: `font-sans` — descriptions, labels
- Mono: `font-mono text-[10px] uppercase tracking-[0.2em]` — breadcrumbs, section labels, metadata

**Spacing:**
- Page padding: `px-6 md:px-12`
- Section gaps: `gap-8`, `gap-12`, `gap-16`
- Card padding: `p-5`
- Content padding: `p-8 md:p-12`

**Shadows & Glows:**
- Card glow: `blur-xl opacity-20 group-hover:opacity-20`
- Ambient: `radial-gradient` with element color, `mix-blend-screen`
- Text shadow: `drop-shadow-[0_0_5px_${color}]`

---

## Animation Summary

| Context | Animation | Trigger |
|---------|-----------|---------|
| Page load | Staggered card reveal `y: 20→0, opacity: 0→1` | Initial mount |
| Scroll | Card "active" state (mobile only) | Center-aligned tracking |
| Hover | Scale + glow + watermark shift | Hover |
| WhileInView | `opacity: 0→1, y: 30→0` | Scroll into view |
| Hero visual | `opacity: 0→1, scale: 0.95→1` | Initial mount with 0.2s delay |

---

## Creating a New Learn Category

To create a new category (e.g., `/learn/elements`):

1. **Create data file:** `/astrology/[category].ts` with `compositional*` export
2. **Create UI config:** `/config/[category]-ui.ts` with `*UIConfig` (theme colors, icons, images, etc.)
3. **Create hub page:** `/src/app/learn/[category]/page.tsx`
4. **Create detail page:** `/src/app/learn/[category]/[item]/page.tsx`
5. **Create compact card:** `/src/components/learn/[category]/compact-[category]-card.tsx`
6. **Create detail components:** Title block, specs grid, essence, visual graphic
7. **Update SystemArchiveLinkages:** Add category to `ArchiveCategory` type and render function
8. **Add to navigation:** Update breadcrumb configurations

**Hub Page Template:**
```tsx
"use client";
import { motion, Variants } from "motion/react";
import { PageHeader } from "@/components/layout/page-header";
import { CompactItemCard } from "@/components/learn/[category]";
import { useState, useRef, useEffect } from "react";

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.05, delayChildren: 0.1 }
  }
};

// ... useCenterCard hook (copy from existing pages)

// ... merge data + ui config
const mergedItems = items.map(data => ({ data, ui: uiConfig[data.id] }));

export default function CategoryHubPage() {
  const [activeTab, setActiveTab] = useState("all");
  const filteredItems = activeTab === "all"
    ? mergedItems
    : mergedItems.filter(i => i.data.filterField === activeTab);
  
  const { activeIndex, containerRef } = useCenterCard(filteredItems.length);

  return (
    <div className="max-w-[1600px] mx-auto px-6 md:px-12 pt-8 pb-32">
      <PageHeader
        breadcrumbs={[{ label: "Home", href: "/" }, { label: "Learn", href: "/learn" }, { label: "Category" }]}
        title="Title"
        subtitle="Subtitle"
        activeFilter={activeTab}
        onFilterChange={setActiveTab}
      />
      <motion.div
        ref={containerRef}
        key={activeTab}
        className={`grid gap-4 md:gap-6 ${gridClass}`}
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {filteredItems.map(({ data, ui }, index) => (
          <div key={data.id} data-card-index={index}>
            <CompactItemCard data={data} ui={ui} isActive={index === activeIndex} href={...} />
          </div>
        ))}
      </motion.div>
      <SystemArchiveLinkages category="category" currentId={...} />
    </div>
  );
}
```

**Detail Page Template:**
```tsx
"use client";
import { motion } from "motion/react";
import { useParams, notFound } from "next/navigation";
import { PageBreadcrumbs } from "@/components/layout/page-breadcrumbs";
import { SystemArchiveLinkages } from "@/components/learn/system-archive-linkages";

export default function ItemDetailPage() {
  const params = useParams();
  const itemId = params.item as string;
  
  const data = items.find(i => i.id === itemId);
  const ui = uiConfig[itemId];
  if (!data || !ui) return notFound();

  return (
    <div className="relative min-h-screen overflow-x-hidden">
      {/* Ambient glow */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[0%] w-[140%] h-[140%] opacity-[0.15] mix-blend-screen"
          style={{ background: `radial-gradient(circle at 50% 50%, ${ui.themeColor} 0%, transparent 60%)` }} />
      </div>

      <div className="relative z-10 max-w-[1600px] mx-auto px-6 md:px-12 pt-8 pb-32">
        <PageBreadcrumbs items={[...]} currentPage={...} currentPageColor={ui.themeColor} />
        
        {/* Hero */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 mb-48">
          <div className="lg:col-span-5">Title / Specs / Essence</div>
          <div className="lg:col-span-7">Visual (sticky)</div>
        </section>

        {/* Data sections */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-48">
          {/* Content cards with whileInView animations */}
        </div>

        <SystemArchiveLinkages category="category" currentId={itemId} />
      </div>
    </div>
  );
}
```

**Compact Card Template:**
```tsx
// See shared component pattern above — adapt watermark to category
// Signs → constellationUrl, Planets → imageUrl, Houses → romanNumeral, Aspects → symbol
```

---

## Key Files Reference

| Purpose | Path |
|---------|------|
| Hub pages | `src/app/learn/[category]/page.tsx` |
| Detail pages | `src/app/learn/[category]/[item]/page.tsx` |
| PageHeader | `src/components/layout/page-header.tsx` |
| PageBreadcrumbs | `src/components/layout/page-breadcrumbs.tsx` |
| SystemArchiveLinkages | `src/components/learn/system-archive-linkages.tsx` |
| Compact cards | `src/components/learn/[category]/compact-[category]-card.tsx` |
| Title blocks | `src/components/learn/[category]/[name]-title-block.tsx` |
| Specs grids | `src/components/learn/[category]/[name]-specs-grid.tsx` |
| Essence | `src/components/learn/[category]/[name]-essence.tsx` |
| Data files | `astrology/[category].ts` |
| UI configs | `config/[category]-ui.ts` |
