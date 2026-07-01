"use node";

import type { ActionCtx } from "../_generated/server";
import type { Id } from "../_generated/dataModel";
import { callLLMEndpoint } from "../lib/llmProvider";
import { selectProvider, releaseProvider } from "../oracle/providerRouter";
import {
  BIRTH_CHART_REPORT_VERSION,
  buildReportSystemPrompt,
  buildReportUserPrompt,
  sanitizeReportMarkdown,
} from "./prompts";
import {
  extractStructuredReportJson,
  renderBirthChartReportMarkdown,
  validateBirthChartReportV2,
} from "./v2";

const { internal } = require("../_generated/api") as any;

export async function generateAndSaveReport(ctx: ActionCtx, userId: Id<"users">) {
  const user = await ctx.runQuery(internal.birthChartReport.mutations.getUserForReport, { userId });
  if (!user?.birthData) throw new Error("Missing birth data");

  const config = await ctx.runQuery(internal.oracle.settings.getPromptRuntimeSettingsInternal, {});
  const modelChain = config.birthChartReportModelChain ?? config.modelChain;
  const selection = selectProvider(modelChain, config.providers, "smart");
  if (!selection) throw new Error("No LLM provider capacity available");

  try {
    const result = await callLLMEndpoint({
      provider: selection.provider,
      model: selection.entry.model,
      messages: [
        {
          role: "system",
          content: buildReportSystemPrompt(user.birthChartReport?.profilingAnswers),
        },
        {
          role: "user",
          content: buildReportUserPrompt({
            user,
            profiling: user.birthChartReport?.profilingAnswers,
          }),
        },
      ],
      temperature: 0.55,
      maxTokens: 12000,
      title: "Stars.Guide Birth Chart Report",
      thinkingMode: "disabled",
    });

    let structured;
    try {
      structured = validateBirthChartReportV2(extractStructuredReportJson(result.content ?? ""));
    } catch (validationError) {
      const error = validationError instanceof Error ? validationError.message : "Invalid structured report";
      console.warn("[BirthChartReport] structured validation failed; attempting repair", { userId, error });
      const repair = await callLLMEndpoint({
        provider: selection.provider,
        model: selection.entry.model,
        messages: [
          {
            role: "system",
            content: [
              "You repair a Stars.Guide Birth Chart Report JSON object.",
              "Return valid JSON only. No Markdown, comments, code fences, or explanation.",
              "Preserve the user's astrology interpretation, but fix schema errors exactly.",
              "Every signature must have a non-empty evidence array named exactly evidence.",
              "Every lifeAreas section must have a non-empty evidence array named exactly evidence.",
              "Every topThemes/gifts/growthEdges/practices/reflectionPrompts item must have evidence when the schema includes it.",
              "Evidence objects must use the supplied labels/placements/aspects already present in the JSON; do not invent new chart facts.",
            ].join("\n"),
          },
          {
            role: "user",
            content: [
              `[VALIDATION ERROR]\n${error}\n[END VALIDATION ERROR]`,
              "",
              "[INVALID JSON TO REPAIR]",
              result.content ?? "",
              "[END INVALID JSON TO REPAIR]",
            ].join("\n"),
          },
        ],
        temperature: 0.1,
        maxTokens: 12000,
        title: "Stars.Guide Birth Chart Report JSON Repair",
        thinkingMode: "disabled",
      });
      structured = validateBirthChartReportV2(extractStructuredReportJson(repair.content ?? ""));
    }
    const markdown = sanitizeReportMarkdown(renderBirthChartReportMarkdown(structured));
    if (markdown.length < 2200) {
      throw new Error("Generated report was unexpectedly short");
    }

    await ctx.runMutation(internal.birthChartReport.mutations.saveCompletedReport, {
      userId,
      markdown,
      structured,
      version: BIRTH_CHART_REPORT_VERSION,
    });
  } finally {
    releaseProvider(selection.provider.id);
  }
}

