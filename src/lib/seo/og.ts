/**
 * OG image URL builder for stars.guide
 *
 * Constructs `/api/og?...` URLs used in page metadata for social sharing previews.
 * The actual image is rendered at the edge by src/app/api/og/route.tsx.
 */

const SITE_URL = "https://stars.guide";

/** OG image types that map to color schemes */
export type OgType = "sign" | "element" | "default";

/** Color map for zodiac signs — hex values for OG image rendering */
export const SIGN_COLORS: Record<string, { primary: string; secondary: string }> = {
  aries:       { primary: "#FF6B35", secondary: "#FFB347" },
  taurus:      { primary: "#6B8E23", secondary: "#9ACD32" },
  gemini:      { primary: "#87CEEB", secondary: "#B0E0E6" },
  cancer:      { primary: "#1E90FF", secondary: "#4682B4" },
  leo:         { primary: "#FF6B35", secondary: "#FFD700" },
  virgo:       { primary: "#6B8E23", secondary: "#8FBC8F" },
  libra:       { primary: "#87CEEB", secondary: "#DDA0DD" },
  scorpio:     { primary: "#1E90FF", secondary: "#4169E1" },
  sagittarius: { primary: "#FF6B35", secondary: "#FF8C00" },
  capricorn:   { primary: "#6B8E23", secondary: "#556B2F" },
  aquarius:    { primary: "#87CEEB", secondary: "#00CED1" },
  pisces:      { primary: "#1E90FF", secondary: "#7B68EE" },
};

/** Color map for elements */
export const ELEMENT_COLORS: Record<string, { primary: string; secondary: string }> = {
  fire:  { primary: "#FF6B35", secondary: "#FFB347" },
  earth: { primary: "#6B8E23", secondary: "#8FBC8F" },
  air:   { primary: "#87CEEB", secondary: "#B0E0E6" },
  water: { primary: "#1E90FF", secondary: "#4682B4" },
};

/**
 * Build a full URL to the OG image API route.
 *
 * @param opts.title     - Main heading text (e.g. "Aries Daily Horoscope")
 * @param opts.subtitle  - Secondary text (e.g. "March 21 – April 19")
 * @param opts.type      - Image variant: sign | element | default
 * @param opts.typeId    - Slug identifier for the type (e.g. "aries", "fire")
 */
export function buildOgImageUrl(opts: {
  title: string;
  subtitle?: string;
  type?: OgType;
  typeId?: string;
}): string {
  const params = new URLSearchParams();
  params.set("title", opts.title);
  if (opts.subtitle) params.set("subtitle", opts.subtitle);
  if (opts.type) params.set("type", opts.type);
  if (opts.typeId) params.set("typeId", opts.typeId);
  return `${SITE_URL}/api/og?${params.toString()}`;
}

/**
 * Resolve the accent colors for a given OG type + typeId.
 * Falls back to the brand gold (#D4AF37) for unknown types.
 */
export function resolveOgColors(type?: OgType, typeId?: string): {
  primary: string;
  secondary: string;
} {
  if (type === "sign" && typeId && SIGN_COLORS[typeId]) {
    return SIGN_COLORS[typeId];
  }
  if (type === "element" && typeId && ELEMENT_COLORS[typeId.toLowerCase()]) {
    return ELEMENT_COLORS[typeId.toLowerCase()];
  }
  // Brand default
  return { primary: "#D4AF37", secondary: "#8B7355" };
}