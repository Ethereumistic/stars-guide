import type { MetadataRoute } from "next";

const BASE_URL = "https://stars.guide";

// Zodiac sign slugs (matching src/astrology/signs.ts compositionalSigns)
const ZODIAC_SIGNS = [
  "aries",
  "taurus",
  "gemini",
  "cancer",
  "leo",
  "virgo",
  "libra",
  "scorpio",
  "sagittarius",
  "capricorn",
  "aquarius",
  "pisces",
];

// Planet slugs (matching src/astrology/planets.ts compositionalPlanets — major + luminaries)
const PLANETS = [
  "sun",
  "moon",
  "mercury",
  "venus",
  "mars",
  "jupiter",
  "saturn",
  "uranus",
  "neptune",
  "pluto",
];

// House IDs (1–12, matching src/astrology/houses.ts compositionalHouses)
const HOUSES = Array.from({ length: 12 }, (_, i) => i + 1);

// Aspect slugs (major Ptolemaic only for sitemap — matching src/astrology/aspects.ts)
const ASPECTS = [
  "conjunction",
  "sextile",
  "square",
  "trine",
  "opposition",
];

// Element slugs (matching src/astrology/elements.ts ElementType)
const ELEMENTS = ["fire", "earth", "air", "water"];

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  // ── Top-level static pages ─────────────────────────────────────────────
  const topLevel: MetadataRoute.Sitemap = [
    { url: BASE_URL, lastModified: now, changeFrequency: "daily", priority: 1.0 },
    { url: `${BASE_URL}/horoscopes`, lastModified: now, changeFrequency: "daily", priority: 0.9 },
    { url: `${BASE_URL}/learn`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    { url: `${BASE_URL}/pricing`, lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    { url: `${BASE_URL}/privacy`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    { url: `${BASE_URL}/terms`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
  ];

  // ── Horoscope pages (per-sign + per-sign/today) ─────────────────────────
  const horoscopePages: MetadataRoute.Sitemap = ZODIAC_SIGNS.flatMap((sign) => [
    {
      url: `${BASE_URL}/horoscopes/${sign}`,
      lastModified: now,
      changeFrequency: "daily" as const,
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/horoscopes/${sign}/today`,
      lastModified: now,
      changeFrequency: "daily" as const,
      priority: 0.9,
    },
  ]);

  // ── Learn sub-pages ─────────────────────────────────────────────────────
  const learnPages: MetadataRoute.Sitemap = [
    // Signs index + individual sign pages
    { url: `${BASE_URL}/learn/signs`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    ...ZODIAC_SIGNS.map((sign) => ({
      url: `${BASE_URL}/learn/signs/${sign}`,
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),

    // Planets index + individual planet pages
    { url: `${BASE_URL}/learn/planets`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    ...PLANETS.map((planet) => ({
      url: `${BASE_URL}/learn/planets/${planet}`,
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),

    // Houses index + individual house pages
    { url: `${BASE_URL}/learn/houses`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    ...HOUSES.map((house) => ({
      url: `${BASE_URL}/learn/houses/${house}`,
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),

    // Aspects index + individual aspect pages
    { url: `${BASE_URL}/learn/aspects`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    ...ASPECTS.map((aspect) => ({
      url: `${BASE_URL}/learn/aspects/${aspect}`,
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),

    // Elements index + individual element pages
    { url: `${BASE_URL}/learn/elements`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    ...ELEMENTS.map((element) => ({
      url: `${BASE_URL}/learn/elements/${element}`,
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
  ];

  return [...topLevel, ...horoscopePages, ...learnPages];
}