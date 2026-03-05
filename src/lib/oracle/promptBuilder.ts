/**
 * promptBuilder.ts — Oracle Prompt Assembly
 * 
 * Assembles all prompt layers into the final payload sent to OpenRouter.
 * 
 * Layer stack (see PHASE2_PROMPT_ENGINEERING.md):
 *   Layer 1: Soul Prompt (soul.md)
 *   Layer 2: Category Context (domain framing)
 *   Layer 3: Scenario Injection (template-specific behavioral rules)
 *   Layer 4: Assembled User Context (follow-up answers + natal context)
 *   Layer 5: User Question
 */

export interface ScenarioInjection {
    toneModifier: string;
    psychologicalFrame: string;
    avoid: string;
    emphasize: string;
    openingAcknowledgmentGuide: string;
    rawInjectionText?: string;
    useRawText: boolean;
}

export interface PromptPayload {
    systemPrompt: string;
    userMessage: string;
}

/**
 * Builds the complete prompt payload for OpenRouter.
 */
export function buildPrompt(params: {
    soulPrompt: string;
    categoryContext: string;
    scenarioInjection: ScenarioInjection | null;
    natalContext: string;
    userContext: string;      // From contextAssembler (follow-up answers)
    userQuestion: string;
}): PromptPayload {
    // ─── Layer 1: Soul Prompt ─────────────────────────────────────────
    // Always present, lowest precedence, highest authority

    // ─── Layer 2: Category Context ────────────────────────────────────
    // Domain framing (Love, Work, Self, etc.)

    // ─── Layer 3: Scenario Injection ──────────────────────────────────
    // Template-specific behavioral modification
    let scenarioBlock = "";
    if (params.scenarioInjection) {
        const inj = params.scenarioInjection;
        if (inj.useRawText && inj.rawInjectionText) {
            scenarioBlock = inj.rawInjectionText;
        } else {
            scenarioBlock = [
                "[SCENARIO INJECTION]",
                `Tone: ${inj.toneModifier}`,
                `Psychological Frame: ${inj.psychologicalFrame}`,
                `Avoid: ${inj.avoid}`,
                `Emphasize: ${inj.emphasize}`,
                `Opening: ${inj.openingAcknowledgmentGuide}`,
            ].join("\n");
        }
    }

    // Assemble system prompt (Layers 1 + 2 + 3)
    const systemParts = [params.soulPrompt, params.categoryContext];
    if (scenarioBlock) systemParts.push(scenarioBlock);
    const systemPrompt = systemParts.join("\n\n---\n\n");

    // ─── Layer 4 + 5: User Context + Question ────────────────────────
    const userParts = [
        params.natalContext,
        params.userContext,
        `\nMy question: ${params.userQuestion}`,
    ];
    const userMessage = userParts.join("\n\n");

    return { systemPrompt, userMessage };
}

/**
 * Builds the OpenRouter API payload from the assembled prompt.
 */
export function buildOpenRouterPayload(
    prompt: PromptPayload,
    config: {
        model: string;
        temperature: number;
        maxTokens: number;
        topP: number;
        stream: boolean;
    },
    conversationHistory?: { role: "user" | "assistant"; content: string }[],
) {
    const messages: { role: string; content: string }[] = [
        { role: "system", content: prompt.systemPrompt },
    ];

    // Add conversation history for follow-up messages
    if (conversationHistory && conversationHistory.length > 0) {
        messages.push(...conversationHistory);
    }

    // Always end with the current user message
    messages.push({ role: "user", content: prompt.userMessage });

    return {
        model: config.model,
        temperature: config.temperature,
        max_tokens: config.maxTokens,
        top_p: config.topP,
        stream: config.stream,
        messages,
    };
}
