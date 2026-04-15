# Plan: Upgrade Cosmic Today Transit Section

We are replacing the data-heavy "Transits Strip" with a "Cosmic Connections" (Aspects) section that delivers immediate astrological intelligence in a normie-friendly, visually hooky way.

## 1. Analysis
- **Current State**: A grid of planets with signs and degrees. Accurate but lacks "so what?" factor for non-experts.
- **Goal**: Show real-time planetary aspects (squares, trines, etc.) with human-readable labels and status (applying/separating).
- **Placement**: Under the Hero's 2/3 column feature (Sign Season, Lunar Phase, Retrograde).

## 2. Data Strategy
- Use `getActiveAspects(new Date())` from `src/lib/aspects.ts`.
- Filter for **Major Aspects** (Conjunction, Sextile, Square, Trine, Opposition) first.
- Limit to the **Top 3-4 tightest aspects** to avoid overwhelming the user.
- Include **North/South Node** and **Chiron** as they provide deep "hooky" insights.

## 3. Visual Design (Frontend Design Skill)
- **Component Name**: `CosmicConnections`
- **Layout**: A horizontal "Pulse" or "Connection" strip using cards.
- **Card Elements**:
    - **Visual Hook**: Two planet icons/images connected by the aspect glyph.
    - **Readable Title**: e.g., "Mars Square Moon"
    - **Nature Badge**: "High Tension" (Red), "Smooth Flow" (Blue), "Major Shift" (Gold).
    - **Momentum Indicator**: 
        - Applying -> "Building Intensity" or "Coming into Focus"
        - Separating -> "Fading" or "Post-Peak Reflection"
    - **One-liner Insight**: Pull from `coreKeywords` or a simplified version of `psychologicalFunction`.
- **Styling**:
    - Dark, translucent backgrounds (`bg-white/[0.03]`).
    - Glowing borders matching the aspect's color family (from `aspectUIConfig`).
    - Subtle animations using `motion/react` to indicate the "live" nature.

## 4. Implementation Steps
1.  **Create `src/components/landing/cosmic-today/cosmic-connections.tsx`**:
    - Fetch active aspects.
    - Map them to UI configurations.
    - Render the cards.
2.  **Update `src/components/landing/cosmic-today.tsx`**:
    - Remove the old "TRANSITS STRIP" sections.
    - Import and place the new `CosmicConnections` component.
3.  **Refinement**:
    - Ensure the "Applying/Separating" logic is clearly explained in normie terms.
    - Add hover effects to show more detail (e.g., the exact degrees for those who *do* want them).

## 5. Normie-Friendly Labels Mapping
- **Applying**: "Building..." or "Approaching Peak"
- **Separating**: "Passing..." or "Fading Out"
- **Conjunction**: "Fused Energy"
- **Square**: "Internal Tension"
- **Opposition**: "Relational Polarity"
- **Trine**: "Natural Harmony"
- **Sextile**: "Opportunity Window"

This plan focuses on high-impact visual communication that turns raw data into actionable cosmic weather.