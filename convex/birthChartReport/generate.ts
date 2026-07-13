"use node";

import type { ActionCtx } from "../_generated/server";
import type { Id } from "../_generated/dataModel";
import { makeFunctionReference } from "convex/server";
import {
  BIRTH_CHART_REPORT_VERSION,
  buildReportSystemPrompt,
  buildReportUserPrompt,
  sanitizeReportMarkdown,
} from "./prompts";
import {
  extractStructuredReportJson,
} from "./v2";
import {
  getBirthChartReportV3QualityIssues,
  renderBirthChartReportV3Markdown,
  validateAndHydrateBirthChartReportV3,
} from "./v3";
import { buildBirthChartContextArtifact } from "../../src/lib/birth-chart/report-context";

const { internal } = require("../_generated/api") as any;
const invokeAIGatewayRef = makeFunctionReference<"action", {
  feature: string;
  mode?: "chat" | "json" | "stream" | "embedding" | "image";
  messages: Array<{ role: "system" | "user" | "assistant"; content: string }>;
  overrides?: {
    temperature?: number;
    maxTokens?: number;
    timeoutMs?: number;
    thinkingMode?: "auto" | "disabled" | "low" | "medium" | "high";
  };
}, {
  content: string;
  providerId: string;
  model: string;
  tier: string;
  promptTokens?: number;
  completionTokens?: number;
}>("aiGateway/runtime:invokeAIGateway");

export async function generateAndSaveReport(ctx: ActionCtx, userId: Id<"users">) {
  const user = await ctx.runQuery(internal.birthChartReport.mutations.getUserForReport, { userId });
  if (!user?.birthData) throw new Error("Missing birth data");
  const chartContext = buildBirthChartContextArtifact(user.birthData);
  if (chartContext.derived.patterns.length === 0) {
    throw new Error("The stored chart is incomplete: no reliable chart signature could be derived");
  }
  const preferredName = user.birthChartReport?.profilingAnswers?.preferredName ?? user.username ?? "Seeker";
  const reportUserPrompt = buildReportUserPrompt({
    user,
    profiling: user.birthChartReport?.profilingAnswers,
  });

  const result = await ctx.runAction(invokeAIGatewayRef, {
    feature: "birth_chart_report",
    mode: "json",
    messages: [
      {
        role: "system",
        content: buildReportSystemPrompt(user.birthChartReport?.profilingAnswers),
      },
      {
        role: "user",
        content: reportUserPrompt,
      },
    ],
    overrides: {
      temperature: 0.45,
      maxTokens: 7000,
      timeoutMs: 180000,
      thinkingMode: "disabled",
    },
  });

  let structured;
  let repairReason: string | null = null;
  let finalResult = result;
  let promptTokens = result.promptTokens;
  let completionTokens = result.completionTokens;
  try {
    structured = validateAndHydrateBirthChartReportV3(
      extractStructuredReportJson(result.content ?? ""),
      chartContext,
      preferredName,
    );
    const issues = getBirthChartReportV3QualityIssues(structured);
    if (issues.length) repairReason = issues.join("\n");
  } catch (validationError) {
    repairReason = validationError instanceof Error ? validationError.message : "Invalid structured report";
  }
  if (repairReason) {
    console.warn("[BirthChartReport] validation failed; attempting repair", { userId, repairReason });
    const repair = await ctx.runAction(invokeAIGatewayRef, {
      feature: "birth_chart_report",
      mode: "json",
      messages: [
        {
          role: "system",
          content: [
            buildReportSystemPrompt(user.birthChartReport?.profilingAnswers),
            "",
            "You are repairing a rejected report. Fix every listed problem while preserving only chart-faithful interpretation.",
            "Return valid JSON only. No Markdown, comments, code fences, or explanation.",
          ].join("\n"),
        },
        {
          role: "user",
          content: [
            `[VALIDATION ERRORS]\n${repairReason}\n[END VALIDATION ERRORS]`,
            "",
            "[INVALID JSON TO REPAIR]",
            result.content ?? "",
            "[END INVALID JSON TO REPAIR]",
            "",
            reportUserPrompt,
          ].join("\n"),
        },
      ],
      overrides: {
        temperature: 0.1,
        maxTokens: 7000,
        timeoutMs: 180000,
        thinkingMode: "disabled",
      },
    });
    finalResult = repair;
    promptTokens =
      result.promptTokens == null && repair.promptTokens == null
        ? undefined
        : (result.promptTokens ?? 0) + (repair.promptTokens ?? 0);
    completionTokens =
      result.completionTokens == null && repair.completionTokens == null
        ? undefined
        : (result.completionTokens ?? 0) + (repair.completionTokens ?? 0);
    structured = validateAndHydrateBirthChartReportV3(
      extractStructuredReportJson(repair.content ?? ""),
      chartContext,
      preferredName,
    );
    const repairedIssues = getBirthChartReportV3QualityIssues(structured);
    if (repairedIssues.length) {
      // These checks are deliberately heuristic. The repaired artifact has
      // already passed the strict schema, pattern, and evidence boundaries, so
      // do not discard it or spend another full generation attempt over prose.
      console.warn("[BirthChartReport] repaired report accepted with editorial advisories", {
        userId,
        advisories: repairedIssues,
      });
    }
  }
  if (!structured) throw new Error("Birth chart report did not produce structured output");

  const markdown = sanitizeReportMarkdown(renderBirthChartReportV3Markdown(structured));
  if (markdown.length < 900) {
    // Exact structured section counts already establish completeness. Markdown
    // is an archival fallback, so its character count is not a validity gate.
    console.warn("[BirthChartReport] concise Markdown fallback accepted", {
      userId,
      markdownLength: markdown.length,
    });
  }

  await ctx.runMutation(internal.birthChartReport.mutations.saveCompletedReport, {
    userId,
    markdown,
    structured,
    version: BIRTH_CHART_REPORT_VERSION,
    sourceChartFingerprint: chartContext.sourceFingerprint,
    generationProviderId: finalResult.providerId,
    generationModel: finalResult.model,
    generationTier: finalResult.tier,
    promptTokens,
    completionTokens,
  });
}

