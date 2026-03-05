/**
 * contextAssembler.ts — Oracle Context Assembly
 * 
 * Takes follow-up answers and formats them into a structured
 * context block for the LLM prompt. Handles both third-party
 * astrological data and situational context.
 * 
 * Output: Layer 4 of the prompt stack (see PHASE2_PROMPT_ENGINEERING.md)
 */

export interface FollowUpAnswer {
    contextLabel: string;
    answer: string;
    skipped: boolean;
    questionType: string;
}

export interface AssembledContext {
    formatted: string;
    hasThirdPartyData: boolean;
}

/**
 * Assembles follow-up answers into a structured context block.
 * 
 * Rules:
 * - Skipped optional questions are omitted entirely (reduces noise)
 * - Astrological data section only appears if sign/date data was given
 * - Max context block: ~300 tokens. If exceeded, truncate answers.
 */
export function assembleUserContext(
    questionText: string,
    categoryName: string,
    followUpAnswers: FollowUpAnswer[],
): AssembledContext {
    const lines: string[] = [];
    let hasThirdPartyData = false;

    lines.push("---USER CONTEXT---");
    lines.push(`Primary Question: ${questionText}`);
    lines.push(`Category: ${categoryName}`);
    lines.push("");

    // Separate astrological data from situational data
    const astroLabels = ["birth date", "birth time", "sun sign", "moon sign", "rising sign", "signs"];
    const astroAnswers: FollowUpAnswer[] = [];
    const situationalAnswers: FollowUpAnswer[] = [];

    for (const answer of followUpAnswers) {
        if (answer.skipped) continue; // Omit skipped questions entirely

        const isAstro = astroLabels.some((label) =>
            answer.contextLabel.toLowerCase().includes(label)
        );

        if (isAstro) {
            astroAnswers.push(answer);
            hasThirdPartyData = true;
        } else {
            situationalAnswers.push(answer);
        }
    }

    // Situational follow-up responses
    if (situationalAnswers.length > 0) {
        lines.push("Follow-up Responses:");
        for (const answer of situationalAnswers) {
            const truncatedAnswer = answer.answer.length > 100
                ? answer.answer.substring(0, 100) + "..."
                : answer.answer;
            lines.push(`  - ${answer.contextLabel}: ${truncatedAnswer}`);
        }
        lines.push("");
    }

    // Third-party astrological data
    if (astroAnswers.length > 0) {
        lines.push("Third-Party Astrological Data (if provided):");
        for (const answer of astroAnswers) {
            lines.push(`  - ${answer.contextLabel}: ${answer.answer}`);
        }
        lines.push("");
    }

    lines.push("---END USER CONTEXT---");

    return {
        formatted: lines.join("\n"),
        hasThirdPartyData,
    };
}

/**
 * Assembles a minimal context for questions that skip follow-ups.
 * Used when requiresThirdParty is false.
 */
export function assembleMinimalContext(
    questionText: string,
    categoryName: string,
): string {
    return [
        "---USER CONTEXT---",
        `Primary Question: ${questionText}`,
        `Category: ${categoryName}`,
        "---END USER CONTEXT---",
    ].join("\n");
}
