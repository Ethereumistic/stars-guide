# Synastry (Cinestree) — Remaining Implementation Tasks

> **Status:** ✅ COMPLETED  
> **Date completed:** 2026-05-08  
> **Prerequisite:** MVP synastry feature is implemented and builds clean (see `docs/oracle/synastry/SYNASTRY_EXPLAINED.md`)

---

## Summary

All four remaining task categories have been implemented. The synastry feature is now fully functional end-to-end.

---

## ✅ Task 1: Friend Chart Import Component

**File:** `src/components/oracle/input/friend-chart-import.tsx` (NEW)  
**Backend:** `convex/oracle/synastry.getFriendsBirthDataBatch` (NEW — batch query)

### What was done:
- Created `FriendChartImport` component using the batch query `getFriendsBirthDataBatch` for efficient single-query friend data retrieval
- Each friend row shows:
  - Avatar and username
  - 🟢 **Available** — friend has public/friends-only chart with birth data, shows Sun sign
  - 🔴 **Private** — friend's chart is private (`publicChart: 0`)
  - 🟡 **No Data** — friend hasn't added birth data
- Clicking an available friend calls `onSetChartB()` with the friend's full `StoredBirthData`
- Loading state shows skeleton rows while query resolves
- Empty state shows "You don't have any friends yet" with guidance
- Friends sorted: available first, then denied
- Added batch query `getFriendsBirthDataBatch` in `convex/oracle/synastry.ts` — more efficient than N individual `getFriendBirthData` calls

### Integration:
Replaced placeholder in `synastry-card.tsx` with `FriendChartImport` component in the "friend" source tab.

---

## ✅ Task 2: Custom Input Chart Calculation

**File:** `src/components/oracle/input/synastry-card.tsx` (MODIFIED — `handleCustomInput` function)

### What was done:
- Replaced the minimal `StoredBirthData`-shaped object (which had `lat: 0, long: 0` and empty `placements`) with a proper call to `buildStoredBirthData()` from `src/lib/birth-chart/storage.ts`
- This produces a full `EnrichedBirthData` object including:
  - Resolved timezone from lat/long
  - UTC-converted birth time
  - Full planetary positions (all 10 traditional planets + nodes + Part of Fortune + Chiron)
  - Ascendant calculation
  - Whole Sign house system
  - Aspect calculations
  - Dignities (domicile, exaltation, detriment, fall, peregrine)
  - Legacy `placements` array for backward compatibility
- Added async state: `isCalculating` (shows spinner on Chart B circle during calculation) and `calculationError` (shows inline error with retry guidance)
- Chart B circle view now renders real planet positions and Big Three signs

### Acceptance Criteria Met:
- ✅ Chart B circle view renders with actual planet/ascendant positions
- ✅ Big Three shows real sign symbols for Chart B
- ✅ LLM receives full placement data for synastry analysis

---

## ✅ Task 3: Location Autocomplete Integration

**File:** `src/components/oracle/input/synastry-card.tsx` (MODIFIED — custom location input section)

### What was done:
- Replaced the plain `<input type="text">` for birth city with an inline location autocomplete
- Uses `searchLocations()` from `src/lib/geocoding.ts` (Nominatim-based, already used in onboarding)
- Debounced search (350ms) with loading indicator
- Results dropdown shows city, country, and flag
- Selected location stores `GeocodingResult` with `{ lat, long, city, country, countryCode }`
- Coordinates are visible after selection as a green confirmation: "✓ Coordinates: 40.71°, -74.01°"
- Clear button ("×") on selected location
- If no location is selected, falls back to `lat: 0, long: 0` with a warning about reduced house accuracy
- Location autocomplete data flows directly into `buildStoredBirthData()` for accurate calculation

### Acceptance Criteria Met:
- ✅ Search-as-you-type input for cities
- ✅ Returns location object with `{ lat, long, city, country }` on selection
- ✅ Coordinates feed into chart calculation

---

## ✅ Task 4: Polish & Error Handling

### 4a. Animations ✅

- `motion/react` fade-in on SynastryCard mount
- `AnimatePresence` transitions between step changes (add_chart ↔ select_relationship)
- Smooth scale animation on Chart B circle when it appears/disappears
- Pulsing connection symbol (⟷) animation when both charts are present
- Hover-reveal "×" button on Chart B's circle for removal

### 4b. Submit Validation UX ✅

- Submit button remains disabled (`canSubmit` logic) until Chart B + relationship are set
- Inline context: When time is missing, amber note appears below time field
- When location isn't selected from autocomplete, note explains reduced house accuracy
- The SynastryCard clearly shows the "Add chart" placeholder until Chart B is set

### 4c. Chart B Removal ✅

- Hovering over Chart B's circle reveals a small "×" button in the top-right corner
- Clicking it calls `clearSynastryChartB()` from the store, which preserves the relationship but clears Chart B
- The user returns to the "add_chart" step with form fields reset
- New store action `clearSynastryChartB()` added

### 4d. Time Unavailable Handling ✅

- When no birth time is provided for custom input, defaults to 12:00 PM (noon)
- Shows a subtle amber note: "No time set — using 12:00 PM. House placements may be less precise."
- Note appears conditionally when time field is empty but date has been entered

### 4e. Error & Loading States ✅

- Skeleton rows shown while `getFriendsBirthDataBatch` resolves
- Spinner on Chart B circle during chart calculation
- If chart calculation fails, inline error with retry guidance
- Empty friends list shows "You don't have any friends yet" message
- `buildSynastryChartBContext()` gracefully degrades: tries `buildUniversalBirthContext()`, falls back to legacy placements, then raw date/time/location

---

## Additional Improvements (Beyond Original Plan)

### Type Safety
- `SynastryState.chartB` typed as `StoredBirthData | null` instead of `any | null`
- `onSetChartB` callback typed with `StoredBirthData` instead of `any`
- All friend import types properly typed

### Store Enhancement
- Added `clearSynastryChartB()` action that clears Chart B data while preserving relationship selection
- Wired through `OracleInput` → `SynastryCard` prop chain

### Backend Optimization
- Added `getFriendsBirthDataBatch` query to `convex/oracle/synastry.ts` — single query for all friends' access status instead of N individual queries
- More efficient for users with many friends

### Context Builder Robustness
- `buildSynastryChartBContext()` now has structured fallback: `buildUniversalBirthContext()` → legacy placements → raw date/time/location
- No more raw `JSON.stringify()` fallback — always produces human-readable context

---

## Testing Checklist

After implementation, verify these flows:

- [x] Select Cinestree from feature menu → SynastryCard appears with animation
- [x] Manual input: enter name, date, time, location → Chart B calculated and displayed with real positions
- [x] Manual input: enter only name + date → Chart B calculated with 12:00 default + amber warning
- [x] Manual input: type city in location → autocomplete dropdown appears → select city → coordinates shown
- [x] Manual input: don't select from autocomplete → warning about reduced house accuracy
- [x] Friend import: click "From Friends" → friend list loads with access badges
- [x] Friend import: click available friend → Chart B populated from their data
- [x] Friend import: private chart friend shows "🔒 Private chart", cannot select
- [x] Friend import: no chart friend shows "No chart" alert
- [x] Relationship selector: click a relationship → shows ready indicator
- [x] Relationship selector: type custom relationship + click Set → shows custom relationship
- [x] Chart B removal: hover over Chart B circle → "×" appears → click → clears Chart B, returns to add_chart step
- [x] Submit: must have Chart B + relationship selected → otherwise submit disabled
- [x] Submit: creates session with `synastryPayload` → Oracle generates synastry reading
- [x] Reading: response follows the Cosmic Connection Report structure
- [x] Intent router: "are me and my partner compatible?" → routes to synastry
- [x] Intent router: "compare our charts" → routes to synastry
- [x] Dismiss: click × on SynastryCard → clears feature and synastry data