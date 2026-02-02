# Geocoding Solutions for stars.guide
## Finding the Best Free Option

---

## 📍 The Requirement

**What we need:**
- Convert "Los Angeles, California" → `{ lat: 34.0522, long: -118.2437 }`
- Autocomplete as user types (UX requirement)
- Support for 10K+ users without breaking the bank

---

## 🔍 Option Comparison

| Solution | Cost | Autocomplete | Accuracy | Rate Limit | API Key | Verdict |
|----------|------|--------------|----------|------------|---------|---------|
| **Google Places API** | $17/1K requests | ✅ Excellent | ⭐⭐⭐⭐⭐ | None | Required | ❌ Too expensive |
| **Google Geocoding API** | $5/1K requests | ❌ No | ⭐⭐⭐⭐⭐ | None | Required | ❌ Expensive + no autocomplete |
| **Nominatim (OSM)** | 💚 **FREE** | ✅ Yes | ⭐⭐⭐⭐ | 1 req/sec | None | ✅ **WINNER** |
| **Mapbox Geocoding** | $0.50/1K requests | ✅ Excellent | ⭐⭐⭐⭐⭐ | 100K/month free | Required | ⚠️ Good backup |
| **OpenStreetMap Embed** | 💚 FREE | ❌ Manual pin | ⭐⭐⭐⭐⭐ | None | None | ⚠️ Fallback only |

---

## ✅ Recommended Solution: Nominatim

### Why Nominatim?
1. **100% Free** - Unlimited requests (with 1 req/sec rate limit)
2. **No API Key** - No signup, no billing, no surprises
3. **High Accuracy** - Powered by OpenStreetMap (1 billion+ features)
4. **Autocomplete Support** - Real-time search suggestions
5. **Privacy-Friendly** - Open-source, no tracking
6. **Reverse Geocoding** - Bonus: "Use my current location" feature

### Cost Comparison (10K Users)
```
Google Places:  $170
Google Geocoding: $50
Mapbox:          $5 (above free tier)
Nominatim:       $0 ✅
```

### Implementation

**1. Search API (Autocomplete)**
```typescript
// User types: "Los A..."
const response = await fetch(
  'https://nominatim.openstreetmap.org/search?q=Los+Angeles&format=json&limit=5',
  {
    headers: {
      'User-Agent': 'stars.guide/1.0', // Required by Nominatim
    },
  }
);

// Returns:
[
  {
    "lat": "34.0536909",
    "lon": "-118.2427666",
    "display_name": "Los Angeles, Los Angeles County, California, United States",
    "address": {
      "city": "Los Angeles",
      "country": "United States"
    }
  }
]
```

**2. Reverse Geocoding (Current Location)**
```typescript
// User clicks "Use my current location"
const response = await fetch(
  'https://nominatim.openstreetmap.org/reverse?lat=34.0522&lon=-118.2437&format=json'
);

// Returns city name from coordinates
```

**3. Rate Limit Handling**
```typescript
// Debounce search input by 500ms
const debouncedQuery = useDebounce(query, 500);

// User must stop typing for 500ms before we search
// This ensures we stay under 1 req/sec limit
```

---

## 🎨 UX Implementation

### Option 1: Autocomplete Dropdown (Recommended)
**User Flow:**
1. User focuses input field
2. User types: "Los"
3. After 500ms, fetch suggestions
4. Show dropdown with 5 results
5. User clicks "Los Angeles, California, USA"
6. Store: `{ lat: 34.05, long: -118.24, city: "Los Angeles", country: "USA" }`

**Pros:**
- Familiar UX (like Google search)
- Fast (no map loading)
- Mobile-friendly

**Cons:**
- Requires typing (but everyone can spell their city)

**Component:** `<LocationAutocomplete />` (provided above)

---

### Option 2: Map with Search + Pin (Fallback)
**User Flow:**
1. User types city name in search box above map
2. Map zooms to location
3. User can fine-tune by dragging pin
4. Click "Confirm Location"

**Pros:**
- Visual confirmation
- Can adjust for small towns/villages

**Cons:**
- Slower (map loading)
- More complex UX
- Harder on mobile

**When to use:** If autocomplete fails to find location

**Component:** Embedded OpenStreetMap iframe

---

### Option 3: "Use My Current Location" Button
**User Flow:**
1. User clicks "Use my current location"
2. Browser requests geolocation permission
3. Reverse geocode coordinates to city name
4. Pre-fill form

**Pros:**
- Zero typing (fastest path)
- Accurate to GPS precision

**Cons:**
- Requires browser permission
- Won't work on desktop (usually)
- Privacy concerns (some users decline)

**Usage:** Secondary CTA alongside search input

---

## 🚀 Recommended Implementation Strategy

### Step 1: Primary Flow (Autocomplete)
```tsx
<FormStep step={2}>
  <h2>Where were you born?</h2>
  
  <LocationAutocomplete
    value={location}
    onValueChange={setLocation}
    placeholder="Start typing your birth city..."
  />
  
  {/* "Use my location" as secondary option */}
  <Button variant="ghost" onClick={handleGetCurrentLocation}>
    📍 Use my current location
  </Button>
</FormStep>
```

### Step 2: Fallback (Manual Entry)
If user can't find their city in autocomplete:
```tsx
<Button variant="link" onClick={showManualEntry}>
  Can't find your city? Enter coordinates manually
</Button>

{/* Collapsible manual entry form */}
<div className="space-y-2">
  <Input placeholder="Latitude (e.g., 34.0522)" />
  <Input placeholder="Longitude (e.g., -118.2437)" />
  <Input placeholder="City name" />
</div>
```

### Step 3: Visual Confirmation
After user selects location, show small map preview:
```tsx
{location && (
  <div className="aspect-video rounded-lg overflow-hidden">
    <iframe
      src={`https://www.openstreetmap.org/export/embed.html?marker=${location.lat},${location.long}`}
    />
  </div>
)}
```

---

## ⚠️ Nominatim Best Practices

### 1. Required Headers
```typescript
headers: {
  'User-Agent': 'stars.guide/1.0 (https://stars.guide)', // REQUIRED
}
```
Nominatim requires identifying your app. Without this, requests are blocked.

### 2. Rate Limiting (1 req/sec)
**Solution:** Debounce search input by 500ms
```typescript
const debouncedQuery = useDebounce(query, 500);
// Only search after user stops typing for 500ms
```

**Result:** Even if 10 users onboard simultaneously, we're safe.

### 3. Cache Results Client-Side
```typescript
// After user selects location, store in localStorage
localStorage.setItem('lastSearchedCity', JSON.stringify(location));

// Pre-fill if user returns to form
const cached = localStorage.getItem('lastSearchedCity');
```

### 4. Filter Results
Nominatim returns streets, buildings, etc. Filter to cities only:
```typescript
.filter((result) => {
  const validTypes = ['city', 'town', 'village', 'municipality'];
  return validTypes.includes(result.type);
})
```

---

## 🔄 Backup Plan: Mapbox Geocoding

If Nominatim ever becomes unreliable, Mapbox is a solid backup:

**Free Tier:**
- 100,000 requests/month
- No credit card required
- $0.50 per 1,000 requests after

**At 10K users:**
- Cost: ~$5/month (if you exceed free tier)

**Migration Path:**
```typescript
// Just swap the API endpoint
const GEOCODING_ENDPOINT = process.env.USE_MAPBOX
  ? 'https://api.mapbox.com/geocoding/v5/mapbox.places'
  : 'https://nominatim.openstreetmap.org/search';
```

---

## 🧪 Testing Strategy

### Test Cases
1. **Common cities:** "New York", "London", "Tokyo" → Should return instantly
2. **Small towns:** "Keszthely, Hungary" → Should still work
3. **Non-English names:** "София, България" → Should handle Cyrillic
4. **Ambiguous names:** "Paris" → Should show Paris, France AND Paris, Texas
5. **Misspellings:** "Los Angelos" → Should fuzzy-match to Los Angeles

### Error Handling
```typescript
try {
  const results = await searchLocations(query);
  if (results.length === 0) {
    showToast("No locations found. Try a different spelling.");
  }
} catch (error) {
  showToast("Connection error. Please try again.");
}
```

---

## 📊 Performance Benchmarks

**Nominatim Response Times:**
- Search query: ~200-500ms
- Reverse geocode: ~100-300ms

**User Experience:**
- With 500ms debounce + 500ms API = ~1 second from stop typing → results
- Feels instant (no perceived lag)

**Comparison:**
- Google Places API: ~100-200ms (faster but costs money)
- Mapbox: ~200-400ms (similar to Nominatim)

**Verdict:** Nominatim is fast enough for excellent UX.

---

## 🎯 Final Recommendation

### Use This Stack:
1. **Primary:** Nominatim autocomplete (`<LocationAutocomplete />`)
2. **Secondary:** "Use my current location" button (browser geolocation + reverse geocode)
3. **Fallback:** Manual coordinate entry (collapsible form)
4. **Visual:** Embedded OSM map preview after selection

### Why This Works:
- ✅ **Free** (handles 100K+ users without cost)
- ✅ **Fast** (1 second perceived latency with debounce)
- ✅ **Accurate** (OSM has excellent city coverage)
- ✅ **Simple** (no API keys, no billing setup)
- ✅ **Privacy-friendly** (open-source, no tracking)

### Migration Path:
If you ever need premium features (e.g., address validation, business locations):
- Start with Nominatim (free)
- Monitor usage/quality
- Switch to Mapbox if needed (~$5/month at 10K users)
- Never need Google ($170+ at 10K users)

---

## 📦 Files Provided

1. **`geocoding.ts`** - Service layer with Nominatim API calls
2. **`location-autocomplete.tsx`** - Full autocomplete component
3. **`use-debounce.ts`** - React hook for rate limiting

**Installation:**
```bash
# No additional dependencies needed!
# Uses native fetch + shadcn-ui components (already installed)
```

**Usage in Onboarding:**
```tsx
import { LocationAutocomplete } from '@/components/onboarding/location-autocomplete';

<LocationAutocomplete
  value={birthLocation}
  onValueChange={setBirthLocation}
/>
```

---

**TL;DR: Use Nominatim. It's free, fast, and handles your use case perfectly. Google is overkill and expensive. You're welcome. 🎉**