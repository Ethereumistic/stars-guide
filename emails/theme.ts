/**
 * theme.ts — Shared styling constants for React Email templates.
 * Matches the stars.guide brand: dark cosmic theme with violet + amber accents.
 */
export const theme = {
    colors: {
        background: "#0B0911",
        surface: "#161223",
        surfaceHover: "#1E1830",
        border: "#2D2048",
        brand: "#7C3AED",
        brandHover: "#6D28D9",
        brandDark: "#4C1D95",
        text: "#F5F3FF",
        textMuted: "#A78BFA",
        textFaint: "#7C5CB8",
        accent: "#F59E0B",
        accentFaint: "#FEF3C7",
        success: "#10B981",
        error: "#EF4444",
    },
    fonts: {
        heading: "Georgia, 'Times New Roman', serif",
        body: "system-ui, -apple-system, sans-serif",
    },
    spacing: {
        section: "32px",
        gap: "16px",
    },
};

export const baseStyles = {
    backgroundColor: theme.colors.background,
    color: theme.colors.text,
    fontFamily: theme.fonts.body,
};