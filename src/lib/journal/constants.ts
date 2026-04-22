// --- Entry Types ---
export const ENTRY_TYPES = ["freeform", "checkin", "dream", "gratitude"] as const;
export type EntryType = (typeof ENTRY_TYPES)[number];

// --- Entry Type Labels & Icons ---
export const ENTRY_TYPE_META: Record<EntryType, { label: string; icon: string; description: string }> = {
    freeform: { label: "Freeform", icon: "✍️", description: "Write freely" },
    checkin: { label: "Check-in", icon: "🌤️", description: "Quick mood log" },
    dream: { label: "Dream", icon: "🌙", description: "Dream journal" },
    gratitude: { label: "Gratitude", icon: "🙏", description: "What you're grateful for" },
};

// --- Mood (2D Circumplex) ---
export const MOOD_AXES = {
    valence: { min: -2, max: 2 },
    arousal: { min: -2, max: 2 },
} as const;

export const MOOD_ZONES = [
    { key: "excited", label: "Excited", valence: [0, 2] as const, arousal: [0, 2] as const, emoji: "🤩", color: "#10b981" },
    { key: "content", label: "Content", valence: [0, 2] as const, arousal: [-2, 0] as const, emoji: "😊", color: "#22c55e" },
    { key: "tense", label: "Tense", valence: [-2, 0] as const, arousal: [0, 2] as const, emoji: "😤", color: "#f97316" },
    { key: "low", label: "Low", valence: [-2, 0] as const, arousal: [-2, 0] as const, emoji: "😔", color: "#ef4444" },
] as const;

export type MoodZone = (typeof MOOD_ZONES)[number]["key"];

// Helper: derive mood zone from valence/arousal values
export function deriveMoodZone(valence: number, arousal: number): MoodZone {
    if (valence >= 0 && arousal >= 0) return "excited";
    if (valence >= 0 && arousal < 0) return "content";
    if (valence < 0 && arousal >= 0) return "tense";
    return "low";
}

// --- Emotions (clustered + intensity) ---
export type EmotionPolarity = "positive" | "negative" | "neutral";

export interface EmotionDefinition {
    key: string;
    label: string;
    polarity: EmotionPolarity;
    cluster: string;
}

export const EMOTIONS: EmotionDefinition[] = [
    // Connection cluster
    { key: "loved", label: "Loved", polarity: "positive", cluster: "connection" },
    { key: "grateful", label: "Grateful", polarity: "positive", cluster: "connection" },
    { key: "lonely", label: "Lonely", polarity: "negative", cluster: "connection" },

    // Energy cluster
    { key: "inspired", label: "Inspired", polarity: "positive", cluster: "energy" },
    { key: "excited", label: "Excited", polarity: "positive", cluster: "energy" },
    { key: "restless", label: "Restless", polarity: "negative", cluster: "energy" },
    { key: "numb", label: "Numb", polarity: "negative", cluster: "energy" },

    // Safety cluster
    { key: "peaceful", label: "Peaceful", polarity: "positive", cluster: "safety" },
    { key: "confident", label: "Confident", polarity: "positive", cluster: "safety" },
    { key: "anxious", label: "Anxious", polarity: "negative", cluster: "safety" },
    { key: "overwhelmed", label: "Overwhelmed", polarity: "negative", cluster: "safety" },

    // Clarity cluster
    { key: "focused", label: "Focused", polarity: "positive", cluster: "clarity" },
    { key: "confused", label: "Confused", polarity: "negative", cluster: "clarity" },
    { key: "conflicted", label: "Conflicted", polarity: "neutral", cluster: "clarity" },
] as const;

export const EMOTION_CLUSTERS = ["connection", "energy", "safety", "clarity"] as const;

export const CLUSTER_LABELS: Record<string, string> = {
    connection: "Connection",
    energy: "Energy",
    safety: "Safety",
    clarity: "Clarity",
};

export const CLUSTER_ICONS: Record<string, string> = {
    connection: "💛",
    energy: "⚡",
    safety: "🛡️",
    clarity: "🔮",
};

export interface EmotionEntry {
    key: string;
    intensity: 1 | 2 | 3; // mild / moderate / strong
}

export const INTENSITY_LABELS: Record<1 | 2 | 3, string> = {
    1: "mild",
    2: "moderate",
    3: "strong",
};

// --- Time of Day ---
export const TIME_OF_DAY = [
    { key: "morning", label: "Morning", icon: "🌅" },
    { key: "midday", label: "Midday", icon: "☀️" },
    { key: "evening", label: "Evening", icon: "🌇" },
    { key: "night", label: "Night", icon: "🌙" },
] as const;

export type TimeOfDay = (typeof TIME_OF_DAY)[number]["key"];

// Helper: auto-detect time of day from current hour
export function autoDetectTimeOfDay(): TimeOfDay {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return "morning";
    if (hour >= 12 && hour < 17) return "midday";
    if (hour >= 17 && hour < 21) return "evening";
    return "night";
}

// --- Limits ---
export const JOURNAL_LIMITS = {
    MAX_ENTRIES_PER_DAY: 10,
    MAX_CONTENT_LENGTH: 50_000,
    MAX_TITLE_LENGTH: 100,
    MAX_TAGS_PER_ENTRY: 10,
    MAX_TAG_LENGTH: 30,
    MAX_EMOTIONS_PER_ENTRY: 7,
    MAX_GRATITUDE_ITEMS: 5,
    MAX_DREAM_SIGNS: 10,
    MAX_PHOTO_SIZE_BYTES: 5_242_880, // 5 MB
} as const;

// --- Oracle Integration ---
export const ORACLE_JOURNAL_CONTEXT = {
    BUDGET_CHARS: 4_000,
    MAX_ENTRY_CHARS: 500,
    MAX_ENTRIES_IN_CONTEXT: 10,
    DEFAULT_LOOKBACK_DAYS: 90,
} as const;

// --- Consent ---
export const CONSENT_VERSION = "1.0";

// --- Admin Settings Defaults ---
export const JOURNAL_SETTINGS_DEFAULTS: Record<string, {
    value: string;
    valueType: "string" | "number" | "boolean" | "json";
    label: string;
    group: string;
    description: string;
}> = {
    max_entries_per_day: {
        value: "10",
        valueType: "number",
        label: "Max Entries Per Day",
        group: "limits",
        description: "Prevent spam",
    },
    max_content_length: {
        value: "50000",
        valueType: "number",
        label: "Max Content Length (chars)",
        group: "limits",
        description: "Characters per entry",
    },
    max_photo_size_bytes: {
        value: "5242880",
        valueType: "number",
        label: "Max Photo Size (bytes)",
        group: "limits",
        description: "5 MB default",
    },
    journal_context_budget_chars: {
        value: "4000",
        valueType: "number",
        label: "Journal Context Char Budget",
        group: "oracle_integration",
        description: "Max chars for journal context in Oracle prompt",
    },
    max_entry_context_chars: {
        value: "500",
        valueType: "number",
        label: "Max Chars Per Entry in Context",
        group: "oracle_integration",
        description: "Max chars per journal entry in Oracle context",
    },
    max_context_journal_entries: {
        value: "10",
        valueType: "number",
        label: "Max Entries in Context",
        group: "oracle_integration",
        description: "Max journal entries included in Oracle prompt",
    },
    journal_context_enabled: {
        value: "true",
        valueType: "boolean",
        label: "Journal-Oracle Integration",
        group: "features",
        description: "Global toggle for Journal-Oracle context sharing",
    },
    voice_input_enabled: {
        value: "true",
        valueType: "boolean",
        label: "Voice Input",
        group: "features",
        description: "Global toggle for voice journaling",
    },
    default_lookback_days: {
        value: "90",
        valueType: "number",
        label: "Default Lookback Days",
        group: "oracle_integration",
        description: "Default lookback for Oracle journal context",
    },
};

// --- Dream Emotional Tones ---
export const DREAM_EMOTIONAL_TONES = [
    "eerie",
    "joyful",
    "confusing",
    "peaceful",
    "terrifying",
    "nostalgic",
    "mysterious",
    "surreal",
    "melancholic",
    "adventurous",
] as const;

// --- Energy Levels ---
export const ENERGY_LEVELS = [
    { value: 1, label: "Depleted", icon: "🔋" },
    { value: 2, label: "Low", icon: "🪫" },
    { value: 3, label: "Moderate", icon: "⚡" },
    { value: 4, label: "High", icon: "✨" },
    { value: 5, label: "Charged", icon: "🚀" },
] as const;