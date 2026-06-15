"use node";

import type { ActionCtx } from "../_generated/server";
import type { Id } from "../_generated/dataModel";
import { internal } from "../_generated/api";
import { callLLMEndpoint } from "../lib/llmProvider";
import { selectProvider, releaseProvider } from "../oracle/providerRouter";
import {
  BIRTH_CHART_REPORT_VERSION,
  buildReportSystemPrompt,
  buildReportUserPrompt,
  sanitizeReportMarkdown,
} from "./prompts";

export async function generateAndSaveReport(ctx: ActionCtx, userId: Id<"users">) {
  const user = await ctx.runQuery(internal.birthChartReport.mutations.getUserForReport, { userId });
  if (!user?.birthData) throw new Error("Missing birth data");

  const config = await ctx.runQuery(internal.oracle.settings.getPromptRuntimeSettingsInternal, {});
  const selection = selectProvider(config.modelChain, config.providers, "smart");
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
      maxTokens: 6000,
      title: "Stars.Guide Birth Chart Report",
      thinkingMode: "auto",
    });

    const markdown = sanitizeReportMarkdown(result.content ?? "");
    if (markdown.length < 2200) {
      throw new Error("Generated report was unexpectedly short");
    }

    const requiredSections = [
      "## Chart at a Glance",
      "## Your Chart in One Sentence",
      "## The Core Myth of Your Chart",
      "## Your Dominant Signatures",
      "## Inner World & Emotional Care",
      "## Love, Desire & Attachment Patterns",
      "## Work, Calling & Public Direction",
      "## Practices for Integration",
      "## Reflection Prompts",
    ];
    const missingSections = requiredSections.filter((section) => !markdown.includes(section));
    if (missingSections.length > 0) {
      throw new Error(`Generated report missing required sections: ${missingSections.join(", ")}`);
    }

    await ctx.runMutation(internal.birthChartReport.mutations.saveCompletedReport, {
      userId,
      markdown,
      version: BIRTH_CHART_REPORT_VERSION,
    });
  } finally {
    releaseProvider(selection.provider.id);
  }
}

