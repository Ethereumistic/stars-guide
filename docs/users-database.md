## 🗄️ Database Architecture

### Single-Table Strategy (Atomic User)

We use a **unified `users` table** to store all core user data in one place:

```typescript
// convex/schema.ts
users: defineTable({
  // Auth (managed by Convex Auth)
  name, email, image, emailVerificationTime, phone, etc.
  
  // Subscription
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