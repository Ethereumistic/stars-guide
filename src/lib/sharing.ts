const SITE_URL = "https://stars.guide";

export type SharePlatform = "twitter" | "facebook" | "whatsapp" | "instagram" | "imessage" | "copy";

export type ShareType = "birth_chart" | "horoscope" | "compatibility" | "journal" | "profile";

export interface ShareParams {
  type: ShareType;
  sign?: string;
  date?: string;
  username?: string;
  partnerSign?: string;
  utmSource?: SharePlatform;
}

const UTM_DEFAULTS: Record<ShareType, { medium: string; campaign: string }> = {
  birth_chart: { medium: "share_image", campaign: "viral_birth_chart" },
  horoscope: { medium: "share_horoscope", campaign: "viral_horoscope" },
  compatibility: { medium: "share_compatibility", campaign: "viral_compatibility" },
  journal: { medium: "share_journal", campaign: "viral_journal" },
  profile: { medium: "share_profile", campaign: "viral_profile" },
};

function buildUtmUrl(base: string, params: ShareParams): string {
  const searchParams = new URLSearchParams();
  const utmConfig = UTM_DEFAULTS[params.type];
  searchParams.set("utm_source", params.utmSource ?? "direct");
  searchParams.set("utm_medium", utmConfig.medium);
  searchParams.set("utm_campaign", utmConfig.campaign);
  return `${base}?${searchParams.toString()}`;
}

export function getShareUrl(params: ShareParams): string {
  const baseMap: Record<ShareType, string> = {
    birth_chart: `${SITE_URL}/dashboard`,
    horoscope: params.sign
      ? `${SITE_URL}/horoscopes/${params.sign.toLowerCase()}/${params.date ?? new Date().toISOString().split("T")[0]}`
      : `${SITE_URL}/horoscopes`,
    compatibility: `${SITE_URL}/compatibility`,
    journal: `${SITE_URL}/journal`,
    profile: params.username ? `${SITE_URL}/${params.username}` : `${SITE_URL}/dashboard`,
  };
  return buildUtmUrl(baseMap[params.type], params);
}

export function getPrewrittenShareText(params: ShareParams): string {
  const signEmoji: Record<string, string> = {
    aries: "♈", taurus: "♉", gemini: "♊", cancer: "♋",
    leo: "♌", virgo: "♍", libra: "♎", scorpio: "♏",
    sagittarius: "♐", capricorn: "♑", aquarius: "♒", pisces: "♓",
  };
  const emoji = params.sign ? (signEmoji[params.sign.toLowerCase()] ?? "✨") : "✨";

  const templates: Record<ShareType, string> = {
    birth_chart:
      "✨ Check out my cosmic blueprint on stars.guide! What does your birth chart say about your destiny?",
    horoscope: `${emoji} Today's horoscope for ${params.sign}: — Discover yours at stars.guide ✨`,
    compatibility: `💕 My cosmic compatibility with ${params.partnerSign}: — Find yours at stars.guide ✨`,
    journal:
      "🌟 My astrology journal journey on stars.guide ✨ What's your cosmic story?",
    profile: `🪐 My stars.guide profile: ${params.username} — Explore your cosmic blueprint! ✨`,
  };
  return templates[params.type];
}

export function openShareDialog(platform: SharePlatform, params: ShareParams) {
  const url = getShareUrl(params);
  const text = encodeURIComponent(getPrewrittenShareText(params));
  const encodedUrl = encodeURIComponent(url);

  const shareUrls: Record<SharePlatform, string> = {
    twitter: `https://twitter.com/intent/tweet?text=${text}&url=${encodedUrl}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
    whatsapp: `https://wa.me/?text=${text}%20${encodedUrl}`,
    instagram: "https://www.instagram.com/",
    imessage: `sms:?body=${text}%20${encodedUrl}`,
    copy: url,
  };

  if (platform === "copy") {
    navigator.clipboard.writeText(url);
    return;
  }
  window.open(shareUrls[platform], "_blank", "width=600,height=400");
}

export function useNativeShare(params: ShareParams) {
  if (typeof window === "undefined" || !navigator.share) return null;
  return async () => {
    try {
      await navigator.share({
        title: "stars.guide",
        text: getPrewrittenShareText(params),
        url: getShareUrl(params),
      });
    } catch {
      // user cancelled or not supported
    }
  };
}