"use node";
/**
 * convex/emails/templateRenderer.ts — Server-side React Email template rendering.
 *
 * Uses "use node" because @react-email/render requires Node.js.
 * Must NOT be imported from a non-"use node" file — call via ctx.runAction().
 */
import { action } from "../_generated/server";
import { v } from "convex/values";
import { render } from "@react-email/render";
import React from "react";
import { WelcomeEmail } from "../../emails/WelcomeEmail";
import { DailyHoroscopeEmail } from "../../emails/DailyHoroscopeEmail";
import { WeeklyCosmicEmail } from "../../emails/WeeklyCosmicEmail";
import { ReengagementEmail } from "../../emails/ReengagementEmail";
import { MonthlyRoundupEmail } from "../../emails/MonthlyRoundupEmail";

// ─── Template Component Map ──────────────────────────────────────────────────

const templateComponents: Record<string, React.ComponentType<any>> = {
    WelcomeEmail,
    DailyHoroscopeEmail,
    WeeklyCosmicEmail,
    ReengagementEmail,
    MonthlyRoundupEmail,
};

// ─── Sample Data ──────────────────────────────────────────────────────────────

const sampleData: Record<string, Record<string, any>> = {
    WelcomeEmail: {
        userName: "Luna",
        sign: "Scorpio",
        unsubToken: "preview-token-placeholder",
    },
    DailyHoroscopeEmail: {
        sign: "Scorpio",
        horoscope: "Today the stars align in your favor — an unexpected conversation could spark a brilliant idea. Trust your instincts and lean into creative pursuits. The evening brings a moment of clarity that's been eluding you for weeks.",
        mood: "Contemplative",
        luckyNumber: 42,
        element: "Water",
        date: new Date().toISOString(),
        unsubToken: "preview-token-placeholder",
    },
    WeeklyCosmicEmail: {
        weekOf: "June 2–8, 2025",
        highlights: [
            { planet: "Mercury", sign: "Gemini", aspect: "trine Saturn", description: "Clear thinking and productive conversations dominate early in the week. A great time for negotiations and signing agreements." },
            { planet: "Venus", sign: "Leo", aspect: "square Uranus", description: "Expect the unexpected in love and finances mid-week. Excitement is in the air, but avoid impulsive spending." },
            { planet: "Full Moon", sign: "Sagittarius", description: "The weekend's full moon illuminates your long-term goals. It's time to let go of what no longer serves your vision." },
        ],
        overallTheme: "A week of contrasts — laser focus early, cosmic twists mid-week, and illuminating clarity by the weekend.",
        recommendedFocus: "Channel early-week productivity into a creative project. By the weekend, revisit your bigger vision under the Sagittarius full moon.",
        unsubToken: "preview-token-placeholder",
    },
    ReengagementEmail: {
        sign: "Scorpio",
        daysAway: 21,
        unsubToken: "preview-token-placeholder",
    },
    MonthlyRoundupEmail: {
        month: "May",
        year: 2025,
        sign: "Scorpio",
        highlights: [
            "Venus entered your sign, amplifying your magnetism and creative energy.",
            "The lunar eclipse brought a turning point in a close relationship.",
            "Mercury retrograde had you rethinking your long-term career direction.",
            "Jupiter's aspect to your sun sparked a breakthrough idea mid-month.",
        ],
        nextMonthPreview: "June brings Jupiter into your partnership sector — expect growth through collaboration and new alliances.",
        unsubToken: "preview-token-placeholder",
    },
};

// ─── Action ───────────────────────────────────────────────────────────────────

/** Render a named email template to HTML with sample data */
export const previewTemplate = action({
    args: {
        templateName: v.string(),
    },
    handler: async (ctx, args): Promise<{ html: string; subject: string }> => {
        const Component = templateComponents[args.templateName];
        if (!Component) {
            throw new Error(`Unknown template: ${args.templateName}`);
        }

        const props = sampleData[args.templateName] ?? {};
        const element = React.createElement(Component, props);
        const html = await render(element, { pretty: true });

        const subjects: Record<string, string> = {
            WelcomeEmail: "Welcome to stars.guide — Scorpio",
            DailyHoroscopeEmail: "✨ Your daily horoscope for Scorpio",
            WeeklyCosmicEmail: "🌌 Cosmic Weather: Week of June 2–8",
            ReengagementEmail: "The stars are calling you back",
            MonthlyRoundupEmail: "🌕 May 2025 Roundup — Scorpio",
        };

        return {
            html,
            subject: subjects[args.templateName] ?? "Preview",
        };
    },
});