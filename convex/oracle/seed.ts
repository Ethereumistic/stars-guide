import { internalMutation } from "../_generated/server";
import { Id } from "../_generated/dataModel";
import {
    DEFAULT_SOUL_DOCS,
    DEFAULT_TOKEN_LIMITS,
    SOUL_DOC_DEFINITIONS,
    SOUL_DOC_KEYS,
    TOKEN_LIMIT_DEFINITIONS,
    TOKEN_LIMIT_KEYS,
} from "../../lib/oracle/soul";

/**
 * Oracle Seed Mutation
 * 
 * Run this once on first deploy to populate all Oracle content tables.
 * Seeds: 6 categories, 13 templates, all follow-ups + options,
 *        6 category contexts, scenario injections, and default settings.
 * 
 * Usage: Call from Convex dashboard or via `npx convex run oracle/seed:seedOracle`
 */
export const seedOracle = internalMutation({
    args: {},
    handler: async (ctx) => {
        const now = Date.now();

        // в”Ђв”Ђв”Ђ CHECK: Don't double-seed в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ
        const existingCategories = await ctx.db.query("oracle_categories").first();
        if (existingCategories) {
            console.log("Oracle already seeded вЂ” skipping.");
            return { status: "already_seeded" };
        }

        // в•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђ
        // 1. CATEGORIES
        // в•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђ

        const categoryData = [
            { name: "Self", slug: "self", icon: "рџ§Ќ", description: "Identity, shadow, authenticity, and personal evolution", displayOrder: 0, color: "#A78BFA" },
            { name: "Love", slug: "love", icon: "вќ¤пёЏ", description: "Romantic relationships, attachment, Venus archetypes", displayOrder: 1, color: "#F472B6" },
            { name: "Work", slug: "work", icon: "рџ’ј", description: "Vocation, purpose, ambition, and career karma", displayOrder: 2, color: "#FBBF24" },
            { name: "Social", slug: "social", icon: "рџ‘Ґ", description: "Community, friendship, belonging, group dynamics", displayOrder: 3, color: "#34D399" },
            { name: "Destiny", slug: "destiny", icon: "рџЊЂ", description: "Life purpose, karmic direction, soul contract", displayOrder: 4, color: "#60A5FA" },
            { name: "Spirituality", slug: "spirituality", icon: "рџ”®", description: "Psychic sensitivity, karmic inheritance, connection to the unseen", displayOrder: 5, color: "#C084FC" },
        ];

        const categoryIds: Record<string, Id<"oracle_categories">> = {};
        for (const cat of categoryData) {
            const id = await ctx.db.insert("oracle_categories", {
                ...cat,
                isActive: true,
                createdAt: now,
                updatedAt: now,
            });
            categoryIds[cat.slug] = id;
        }

        // в•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђ
        // 2. TEMPLATES + FOLLOW-UPS + OPTIONS + SCENARIO INJECTIONS
        // в•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђ

        // Helper to create a template with its injection
        async function seedTemplate(
            categorySlug: string,
            questionText: string,
            shortLabel: string,
            requiresThirdParty: boolean,
            displayOrder: number,
            injection: {
                toneModifier: string;
                psychologicalFrame: string;
                avoid: string;
                emphasize: string;
                openingAcknowledgmentGuide: string;
            },
        ): Promise<Id<"oracle_templates">> {
            const templateId = await ctx.db.insert("oracle_templates", {
                categoryId: categoryIds[categorySlug],
                questionText,
                shortLabel,
                requiresThirdParty,
                displayOrder,
                isActive: true,
                isDefault: true,
                createdAt: now,
                updatedAt: now,
            });

            await ctx.db.insert("oracle_scenario_injections", {
                templateId,
                ...injection,
                useRawText: false,
                isActive: true,
                version: 1,
                createdAt: now,
                updatedAt: now,
            });

            return templateId;
        }

        // Helper to create follow-ups with options
        async function seedFollowUp(
            templateId: Id<"oracle_templates">,
            questionText: string,
            questionType: "single_select" | "multi_select" | "free_text" | "date" | "sign_picker" | "conditional",
            contextLabel: string,
            displayOrder: number,
            isRequired: boolean,
            options?: { label: string; value: string }[],
            conditional?: { onFollowUpId: Id<"oracle_follow_ups">; onValue: string },
        ): Promise<Id<"oracle_follow_ups">> {
            const followUpId = await ctx.db.insert("oracle_follow_ups", {
                templateId,
                questionText,
                questionType,
                contextLabel,
                displayOrder,
                isRequired,
                isActive: true,
                createdAt: now,
                updatedAt: now,
                ...(conditional ? {
                    conditionalOnFollowUpId: conditional.onFollowUpId,
                    conditionalOnValue: conditional.onValue,
                } : {}),
            });

            if (options) {
                for (let i = 0; i < options.length; i++) {
                    await ctx.db.insert("oracle_follow_up_options", {
                        followUpId,
                        label: options[i].label,
                        value: options[i].value,
                        displayOrder: i,
                        isActive: true,
                    });
                }
            }

            return followUpId;
        }

        // в”Ђв”Ђв”Ђ SELF в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ

        // Template 1: Self-sabotage
        await seedTemplate("self",
            "Why do I keep self-sabotaging the things I want most?",
            "Self-sabotage pattern",
            false, 0,
            {
                toneModifier: "Compassionate, non-shaming, validating",
                psychologicalFrame: "Jungian Shadow + Inner Child + Saturn archetype",
                avoid: "Making the user feel broken or defective. Avoid generic \"you need to love yourself\" advice.",
                emphasize: "The self-sabotage as a protective mechanism that once served them. The astrological indicators of where this pattern lives (Saturn, Pluto, 8th/12th house).",
                openingAcknowledgmentGuide: "Name the courage it takes to ask this question. Acknowledge the exhaustion of the pattern before anything else.",
            },
        );

        // Template 2: True self vs performance
        const template2 = await seedTemplate("self",
            "Am I living as my true self, or performing a version of myself for others?",
            "True self vs performance",
            false, 1,
            {
                toneModifier: "Gentle, inviting introspection",
                psychologicalFrame: "Sun/Rising tension + Neptune aspects + persona vs individuation (Jung)",
                avoid: "Implying the user is fake. Avoid making them feel judged for adapting to social contexts.",
                emphasize: "The Sun/Rising dynamic as a natural tension, not a flaw. Where Neptune blurs the authentic self. The 1st/12th house journey.",
                openingAcknowledgmentGuide: "Acknowledge the weight of performing вЂ” that it's exhausting to wonder if the person people see is the person you are.",
            },
        );

        // Template 2 optional follow-up
        await seedFollowUp(template2,
            "In what environment does the \"performance\" feel most intense?",
            "single_select",
            "Performance environment",
            0, false,
            [
                { label: "Work/Career", value: "work_career" },
                { label: "Family", value: "family" },
                { label: "Romantic relationships", value: "romantic" },
                { label: "Social settings", value: "social" },
                { label: "Online/public", value: "online_public" },
            ],
        );

        // в”Ђв”Ђв”Ђ LOVE в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ

        // Template 3: Finding my person
        const template3 = await seedTemplate("love",
            "Will I find my person вЂ” or have I already met them and let them go?",
            "Finding my person",
            false, 0,
            {
                toneModifier: "Warm, honest, neither falsely reassuring nor pessimistic",
                psychologicalFrame: "Attachment theory + Venus archetype + relational karma (7th/8th house)",
                avoid: "Promising they will find love. Avoid toxic positivity ('The universe has someone for you!'). Avoid implying they are the problem.",
                emphasize: "The energetic readiness question. What the chart says about the timing window. What pattern to shift to magnetize differently.",
                openingAcknowledgmentGuide: "Acknowledge the longing first. Honor the vulnerability of the question before giving cosmic insight.",
            },
        );

        await seedFollowUp(template3,
            "What is your current relationship status?",
            "single_select",
            "Relationship status",
            0, false,
            [
                { label: "Single and searching", value: "single_searching" },
                { label: "In something complicated", value: "complicated" },
                { label: "Recently ended something", value: "recently_ended" },
                { label: "In a relationship but questioning it", value: "questioning" },
            ],
        );

        // Template 4: Attracting same type
        const template4 = await seedTemplate("love",
            "Why do I keep attracting the same type of person who ends up hurting me?",
            "Attracting same type",
            false, 1,
            {
                toneModifier: "Direct yet tender, pattern-illuminating",
                psychologicalFrame: "Attachment theory + Venus/Mars dynamics + repetition compulsion",
                avoid: "Blaming the user for their relationship pattern. Avoid suggesting they 'choose badly'.",
                emphasize: "The astrological signature of their attraction pattern (Venus, Mars, 7th/8th house). How awareness of the pattern begins to transform it.",
                openingAcknowledgmentGuide: "Validate the frustration and the self-awareness it took to recognize the pattern.",
            },
        );

        await seedFollowUp(template4,
            "How would you describe the pattern in the people you attract?",
            "single_select",
            "Attraction pattern",
            0, false,
            [
                { label: "Emotionally unavailable", value: "emotionally_unavailable" },
                { label: "Controlling or jealous", value: "controlling_jealous" },
                { label: "Inconsistent вЂ” hot and cold", value: "inconsistent" },
                { label: "Charming then disappearing", value: "charming_disappearing" },
                { label: "Someone who needs saving", value: "needs_saving" },
            ],
        );

        // Template 5: Is this the right person (THIRD PARTY)
        const template5 = await seedTemplate("love",
            "Is this the right person for me, or am I holding on out of fear?",
            "Right person or fear",
            true, 2,
            {
                toneModifier: "Honest, nuanced, not directive вЂ” Oracle illuminates, the user decides",
                psychologicalFrame: "Synastry basics + attachment theory + Venus/Mars compatibility",
                avoid: "Telling the user to stay or leave. Avoid fortune-telling about relationships. Avoid judgments about the other person.",
                emphasize: "What the charts suggest about the dynamic. Whether fear or love is the dominant energy. The user's own growth pattern vs the relationship pattern.",
                openingAcknowledgmentGuide: "Acknowledge that this question often comes at a breaking point. Honor both the love and the doubt.",
            },
        );

        const fu5_1 = await seedFollowUp(template5,
            "Do you know this person's date of birth?",
            "single_select",
            "Third party birth date knowledge",
            0, false,
            [
                { label: "Yes вЂ” I know it", value: "yes" },
                { label: "Approximately вЂ” I know the year/month", value: "approximate" },
                { label: "No вЂ” I don't know it", value: "no" },
            ],
        );

        await seedFollowUp(template5,
            "What is their birth date?",
            "date",
            "Third party birth date",
            1, false,
            undefined,
            { onFollowUpId: fu5_1, onValue: "yes" },
        );

        await seedFollowUp(template5,
            "Do you know their Sun sign, Moon sign, or Rising sign?",
            "free_text",
            "Third party signs",
            2, false,
        );

        // в”Ђв”Ђв”Ђ WORK в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ

        // Template 6: Right career
        const template6 = await seedTemplate("work",
            "Am I in the right career, or am I wasting my potential?",
            "Right career",
            false, 0,
            {
                toneModifier: "Direct, honest, activating вЂ” this user wants truth not comfort",
                psychologicalFrame: "Saturn as teacher + Midheaven purpose + North Node calling",
                avoid: "Generic career advice. Avoid making them feel shame about where they are.",
                emphasize: "The difference between 'wrong path' and 'right path, wrong timing.' What Saturn transits say about where they are in their career arc.",
                openingAcknowledgmentGuide: "Acknowledge that this question means they already sense something. Validate the discomfort as signal, not failure.",
            },
        );

        await seedFollowUp(template6,
            "What feeling dominates your workday right now?",
            "single_select",
            "Workday feeling",
            0, false,
            [
                { label: "Boredom", value: "boredom" },
                { label: "Anxiety", value: "anxiety" },
                { label: "A sense of emptiness", value: "emptiness" },
                { label: "Occasional sparks of meaning", value: "sparks_meaning" },
                { label: "Mostly fine but something's missing", value: "something_missing" },
            ],
        );

        // Template 7: Taking the leap
        const template7 = await seedTemplate("work",
            "Is this the year I finally take the leap and bet on myself?",
            "Taking the leap",
            false, 1,
            {
                toneModifier: "Encouraging but grounded вЂ” don't push them over the edge irresponsibly",
                psychologicalFrame: "Jupiter expansion + Uranus liberation + Saturn reality check",
                avoid: "Blindly cheerleading. Avoid 'just do it' energy without addressing real risks and timing.",
                emphasize: "Current transits (especially Jupiter, Uranus, Saturn) as timing indicators. The difference between readiness and restlessness.",
                openingAcknowledgmentGuide: "Acknowledge the courage in even considering the leap. Validate that asking means the call is already there.",
            },
        );

        await seedFollowUp(template7,
            "What is the leap you're considering?",
            "single_select",
            "Type of leap",
            0, false,
            [
                { label: "Starting a business", value: "business" },
                { label: "Leaving a stable job", value: "leaving_job" },
                { label: "Going freelance/independent", value: "freelance" },
                { label: "A major creative project", value: "creative_project" },
                { label: "Moving to a new place", value: "moving" },
                { label: "Something else", value: "other" },
            ],
        );

        // в”Ђв”Ђв”Ђ SOCIAL в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ

        // Template 8: Feeling alone
        await seedTemplate("social",
            "Why do I feel deeply alone even when surrounded by people?",
            "Feeling alone",
            false, 0,
            {
                toneModifier: "Deeply empathetic, intimate, seeing the unseen",
                psychologicalFrame: "Moon placement + 11th/4th house tension + Neptune aspects + belonging wound",
                avoid: "Suggesting they need more friends or should be more social. Avoid minimizing the feeling.",
                emphasize: "The astrological root of the isolation feeling. The Moon/Neptune dynamic. The 4th house (inner belonging) vs 11th house (outer community) tension.",
                openingAcknowledgmentGuide: "No follow-ups. Meet this with silence before words. Acknowledge the paradox вЂ” surrounded yet alone вЂ” as the deepest kind of loneliness.",
            },
        );

        // Template 9: Friendship worth saving (THIRD PARTY)
        const template9 = await seedTemplate("social",
            "Is this friendship or relationship worth saving, or has it run its course?",
            "Worth saving",
            true, 1,
            {
                toneModifier: "Balanced, honoring both people, no vilification",
                psychologicalFrame: "Compatibility patterns + growth cycles + attachment styles",
                avoid: "Taking sides. Avoid labeling the other person as toxic without evidence. Avoid simplistic 'let go of what no longer serves you' advice.",
                emphasize: "What the charts suggest about compatibility and growth directions. Whether the relationship is in a natural cycle of change or genuinely complete.",
                openingAcknowledgmentGuide: "Acknowledge the grief already present in asking this question вЂ” even if they haven't said goodbye yet.",
            },
        );

        await seedFollowUp(template9,
            "Is this a friendship, romantic relationship, or family connection?",
            "single_select",
            "Relationship type",
            0, false,
            [
                { label: "Close friendship", value: "friendship" },
                { label: "Romantic partner or ex", value: "romantic" },
                { label: "Family member", value: "family" },
                { label: "Work relationship", value: "work" },
            ],
        );

        const fu9_2 = await seedFollowUp(template9,
            "Do you know their birth date or Sun sign?",
            "single_select",
            "Third party birth info",
            1, false,
            [
                { label: "Yes вЂ” I know their birth date", value: "birth_date" },
                { label: "I only know their Sun sign", value: "sun_sign" },
                { label: "I don't know either", value: "unknown" },
            ],
        );

        await seedFollowUp(template9,
            "What changed in this relationship?",
            "single_select",
            "What changed",
            2, false,
            [
                { label: "A specific event or betrayal", value: "betrayal" },
                { label: "We gradually drifted", value: "drifted" },
                { label: "They changed significantly", value: "they_changed" },
                { label: "I changed and outgrew it", value: "i_changed" },
                { label: "Both of us changed", value: "both_changed" },
            ],
        );

        // в”Ђв”Ђв”Ђ DESTINY в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ

        // Template 10: Life purpose
        await seedTemplate("destiny",
            "What is my actual life purpose вЂ” am I on the right path?",
            "Life purpose",
            false, 0,
            {
                toneModifier: "Sacred, direct, carrying weight befitting the question",
                psychologicalFrame: "North Node + Midheaven + Saturn return + Chiron placement",
                avoid: "Vague platitudes about 'being on your path.' Avoid generic spiritual answers.",
                emphasize: "The North Node sign and house as the primary purpose indicator. Saturn return timing for career/calling shifts. Chiron as the wounded healer path.",
                openingAcknowledgmentGuide: "Honor the gravity of this question. Acknowledge that asking 'what is my purpose' is itself a sign of the soul seeking alignment.",
            },
        );

        // Template 11: Hardships
        const template11 = await seedTemplate("destiny",
            "Are the hardships I've faced meaningless вЂ” or are they shaping me for something?",
            "Hardship meaning",
            false, 1,
            {
                toneModifier: "Reverent, grounding, refusing to spiritually bypass real pain",
                psychologicalFrame: "Chiron + Pluto transits + 12th house + Saturn cycles + post-traumatic growth",
                avoid: "Saying suffering is 'meant to be' or is a gift. Avoid toxic positivity. Avoid minimizing real pain with cosmic justifications.",
                emphasize: "Where Chiron and Pluto indicate patterns of deep transformation. The Saturn cycle as a structure for growth through difficulty. The distinction between meaning and purpose.",
                openingAcknowledgmentGuide: "Lead with acknowledgment of the pain, not the purpose. Name what was endured before interpreting it cosmically.",
            },
        );

        await seedFollowUp(template11,
            "What area of life has the hardship primarily been in?",
            "single_select",
            "Hardship area",
            0, false,
            [
                { label: "Health or body", value: "health" },
                { label: "Loss and grief", value: "loss_grief" },
                { label: "Betrayal by someone trusted", value: "betrayal" },
                { label: "Financial collapse", value: "financial" },
                { label: "Identity вЂ” not knowing who I am", value: "identity" },
                { label: "Multiple areas at once", value: "multiple" },
            ],
        );

        // в”Ђв”Ђв”Ђ SPIRITUALITY в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ

        // Template 12: Spiritual gift
        await seedTemplate("spirituality",
            "Do I have a spiritual gift I'm not fully aware of or using?",
            "Spiritual gift",
            false, 0,
            {
                toneModifier: "Mystical, affirming, specific",
                psychologicalFrame: "Neptune and Pisces placements + 12th house + Moon aspects + intuitive channels",
                avoid: "Overclaiming psychic abilities. Avoid making them feel like a chosen one in a way that inflates ego.",
                emphasize: "Neptune placement as the primary indicator. The 12th house as the doorway. Moon aspects indicating intuitive sensitivity type. Practical ways to cultivate what's there.",
                openingAcknowledgmentGuide: "Affirm that asking this question means they already sense something вЂ” the question IS the gift beginning to speak.",
            },
        );

        // Template 13: Karmic pattern (THIRD PARTY)
        const template13 = await seedTemplate("spirituality",
            "Is there a past life or karmic pattern playing out in my life right now вЂ” and is it connected to someone specific?",
            "Karmic pattern",
            true, 1,
            {
                toneModifier: "Mystical, specific, grounding вЂ” treat this seriously",
                psychologicalFrame: "Past life theory + South Node + 12th house karma + repetition compulsion",
                avoid: "Sensationalizing. Avoid making karma sound like punishment. Avoid vague 'you have unfinished business' non-answers.",
                emphasize: "The South Node as the most astrologically grounded entry point for karmic discussion. What the pattern is asking them to release vs. integrate.",
                openingAcknowledgmentGuide: "Validate their sense that something bigger is at play. Take the question seriously and meet it with equal gravity.",
            },
        );

        const fu13_1 = await seedFollowUp(template13,
            "Is there a specific person you feel this karmic pattern is tied to?",
            "single_select",
            "Karmic person connection",
            0, false,
            [
                { label: "Yes вЂ” a specific person", value: "yes" },
                { label: "I sense it but can't name a person", value: "sense_unnamed" },
                { label: "It feels more like a life pattern than a person", value: "life_pattern" },
            ],
        );

        await seedFollowUp(template13,
            "What makes you feel this pattern is karmic?",
            "single_select",
            "Karmic feeling source",
            1, false,
            [
                { label: "Inexplicable instant connection or recognition", value: "instant_connection" },
                { label: "A painful pattern that keeps repeating", value: "repeating_pattern" },
                { label: "An irrational fear or pull I can't explain", value: "irrational_pull" },
                { label: "Vivid dreams involving this person or theme", value: "vivid_dreams" },
                { label: "Just a very strong feeling", value: "strong_feeling" },
            ],
        );

        await seedFollowUp(template13,
            "Which area of life is this pattern most active in?",
            "single_select",
            "Karmic pattern area",
            2, false,
            [
                { label: "Love and relationships", value: "love" },
                { label: "Family and lineage", value: "family" },
                { label: "Career and calling", value: "career" },
                { label: "Health and body", value: "health" },
                { label: "Identity and self-worth", value: "identity" },
            ],
        );

        // в•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђ
        // 3. CATEGORY CONTEXTS (Domain framing blocks for Layer 2)
        // в•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђ

        const categoryContexts: Record<string, string> = {
            self: "You are operating in the domain of SELF вЂ” identity, shadow, authenticity, and personal evolution. The user is asking about their inner world. Prioritize: Saturn placements, Pluto transits, South/North Node, 1st and 12th house themes, and the relationship between Sun and Rising signs.",
            love: "You are operating in the domain of LOVE вЂ” romantic relationships, attachment, Venus archetypes, and relational karma. Prioritize: Venus sign, Mars sign, 7th house, 8th house themes, synastry patterns if data allows, and attachment wound patterns.",
            work: "You are operating in the domain of WORK вЂ” vocation, purpose, ambition, and career karma. Prioritize: Midheaven (MC), 10th house, Saturn, Jupiter, North Node, and the tension between security (2nd house) and calling (10th house).",
            social: "You are operating in the domain of SOCIAL вЂ” community, friendship, belonging, and group dynamics. Prioritize: 11th house, Moon sign, Rising sign social mask, and the interplay between inner world (4th house) and outer world presentation.",
            destiny: "You are operating in the domain of DESTINY вЂ” life purpose, karmic direction, soul contract. Prioritize: North Node and its sign/house, Saturn return timing, Chiron placement, and major life transits (Pluto, Uranus, Saturn) relative to age.",
            spirituality: "You are operating in the domain of SPIRITUALITY вЂ” psychic sensitivity, karmic inheritance, and connection to the unseen. Prioritize: Neptune and Pisces placements, 12th house, Chiron, South Node, and aspects to the Moon indicating intuitive depth.",
        };

        for (const [slug, contextText] of Object.entries(categoryContexts)) {
            await ctx.db.insert("oracle_category_contexts", {
                categoryId: categoryIds[slug],
                contextText,
                isActive: true,
                version: 1,
                createdAt: now,
                updatedAt: now,
            });
        }


        // 4. DEFAULT SETTINGS

        const defaultSettings = [
            // Provider Config
            {
                key: "providers_config",
                value: JSON.stringify([
                    { id: "openrouter", name: "OpenRouter", type: "openrouter", baseUrl: "https://openrouter.ai/api/v1", apiKeyEnvVar: "OPENROUTER_API_KEY" },
                ]),
                valueType: "json" as const,
                label: "Provider Configuration",
                description: "JSON array of AI providers",
                group: "provider",
            },

            // Model Chain
            {
                key: "model_chain",
                value: JSON.stringify([
                    { providerId: "openrouter", model: "google/gemini-2.5-flash" },
                    { providerId: "openrouter", model: "anthropic/claude-sonnet-4" },
                    { providerId: "openrouter", model: "x-ai/grok-4.1-fast" },
                ]),
                valueType: "json" as const,
                label: "Model Fallback Chain",
                description: "Ordered list of provider+model pairs Oracle tries sequentially",
                group: "model",
            },

            // Legacy Model Config (kept for backward compat)
            { key: "model_a", value: "google/gemini-2.5-flash", valueType: "string" as const, label: "Primary Model", group: "model" },
            { key: "model_b", value: "anthropic/claude-sonnet-4", valueType: "string" as const, label: "Fallback Model B", group: "model" },
            { key: "model_c", value: "x-ai/grok-4.1-fast", valueType: "string" as const, label: "Fallback Model C", group: "model" },
            { key: "temperature", value: "0.82", valueType: "number" as const, label: "Temperature", group: "model" },
            { key: "top_p", value: "0.92", valueType: "number" as const, label: "Top-p", group: "model" },
            { key: "stream_enabled", value: "true", valueType: "boolean" as const, label: "Streaming", group: "model" },

            ...TOKEN_LIMIT_KEYS.map((key) => ({
                key,
                value: String(DEFAULT_TOKEN_LIMITS[key]),
                valueType: "number" as const,
                label: TOKEN_LIMIT_DEFINITIONS[key].label,
                description: TOKEN_LIMIT_DEFINITIONS[key].description,
                group: "token_limits",
            })),

            // Quota Config
            { key: "quota_limit_free", value: "5", valueType: "number" as const, label: "Free Tier - Lifetime Limit", group: "quota" },
            { key: "quota_limit_popular", value: "5", valueType: "number" as const, label: "Popular Tier - Daily Limit", group: "quota" },
            { key: "quota_limit_premium", value: "10", valueType: "number" as const, label: "Premium Tier - Daily Limit", group: "quota" },
            { key: "quota_limit_moderator", value: "10", valueType: "number" as const, label: "Moderator Tier - Daily Limit", group: "quota" },
            { key: "quota_limit_admin", value: "999", valueType: "number" as const, label: "Admin Tier - Daily Limit", group: "quota" },
            { key: "quota_reset_free", value: "never", valueType: "string" as const, label: "Free Tier Reset Type", group: "quota" },
            { key: "quota_reset_popular", value: "daily", valueType: "string" as const, label: "Popular Reset Type", group: "quota" },
            { key: "quota_reset_premium", value: "daily", valueType: "string" as const, label: "Premium Reset Type", group: "quota" },
            { key: "quota_reset_moderator", value: "daily", valueType: "string" as const, label: "Moderator Reset Type", group: "quota" },
            { key: "quota_reset_admin", value: "daily", valueType: "string" as const, label: "Admin Reset Type", group: "quota" },

            ...SOUL_DOC_KEYS.map((key) => ({
                key,
                value: DEFAULT_SOUL_DOCS[key],
                valueType: "string" as const,
                label: SOUL_DOC_DEFINITIONS[key].label,
                description: SOUL_DOC_DEFINITIONS[key].description,
                group: "soul",
            })),

            { key: "max_follow_ups_per_template", value: "3", valueType: "number" as const, label: "Max Follow-ups Per Template", group: "content" },
            { key: "kill_switch", value: "false", valueType: "boolean" as const, label: "Oracle Kill Switch", group: "operations" },

            // Safety Config
            {
                key: "crisis_response_text",
                value: "I see you, and what you're carrying right now matters deeply. Oracle is here for cosmic guidance, but this moment calls for someone trained to truly help. Please reach out to the Crisis Text Line - text HOME to 741741 - or call the 988 Suicide & Crisis Lifeline. You deserve support from someone who can hold space for you right now.",
                valueType: "string" as const,
                label: "Crisis Response",
                description: "Shown when crisis keywords are detected - no LLM call is made",
                group: "safety",
            },
            {
                key: "fallback_response_text",
                value: "The stars are momentarily beyond my reach - cosmic interference is rare, but it happens. Please try again in a moment. Your question has been heard, and Oracle will be ready when the channels clear. ->",
                valueType: "string" as const,
                label: "Model Fallback Response D",
                description: "Shown when all 3 models fail - hardcoded last resort",
                group: "safety",
            },
        ];

        for (const setting of defaultSettings) {
            await ctx.db.insert("oracle_settings", {
                ...setting,
                updatedAt: now,
            });
        }

        console.log("вњ… Oracle seed complete:");
        console.log(`   вЂў ${categoryData.length} categories`);
        console.log(`   вЂў 13 templates with scenario injections`);
        console.log(`   вЂў Follow-up questions with options`);
        console.log(`   вЂў 6 category contexts`);
        console.log(`   вЂў ${defaultSettings.length} settings`);

        return { status: "seeded" };
    },
});

