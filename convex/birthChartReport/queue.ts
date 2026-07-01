import { v } from "convex/values";
import { action, internalMutation, internalQuery, mutation, query } from "../_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

const { internal } = require("../_generated/api") as any;

const profilingAnswersValidator = v.object({
  // Legacy v1 fields kept so existing reports/documents remain valid.
  centralQuestion: v.optional(v.string()),
  publicPersona: v.optional(v.string()),
  innerExperience: v.optional(v.string()),
  currentSeason: v.optional(v.array(v.string())),
  reportFocus: v.optional(v.array(v.string())),
  growthPattern: v.optional(v.array(v.string())),
  tonePreference: v.optional(v.string()),
  preferredName: v.optional(v.string()),
  pronouns: v.optional(v.string()),
  customContext: v.optional(v.string()),
});

const onboardingStepValidator = v.union(
  v.literal("centralQuestion"),
  v.literal("publicPersona"),
  v.literal("innerExperience"),
  v.literal("pronouns"),
  v.literal("questionnaire"),
  v.literal("queued"),
);

function trimOptional(value: string | undefined, max: number): string | undefined {
  const trimmed = value?.trim();
  if (!trimmed) return undefined;
  return trimmed.slice(0, max);
}

function cleanList(values: string[] | undefined, maxItems = 4, maxLength = 80): string[] | undefined {
  const cleaned = (values ?? [])
    .map((value) => value.trim().slice(0, maxLength))
    .filter(Boolean)
    .slice(0, maxItems);
  return cleaned.length ? cleaned : undefined;
}

export const getMyReport = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const user = await ctx.db.get(userId);
    return user?.birthChartReport ?? null;
  },
});

export const saveProfilingAnswers = mutation({
  args: { answers: profilingAnswersValidator },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const user = await ctx.db.get(userId);
    if (!user) throw new Error("User not found");
    if (!user.birthData) throw new Error("Birth data is required before generating a report");

    await ctx.db.patch(userId, {
      birthChartReport: {
        ...(user.birthChartReport ?? {}),
        status: user.birthChartReport?.status === "completed" ? "completed" : "pending",
        onboardingStep: user.birthChartReport?.onboardingStep ?? "questionnaire",
        profilingAnswers: {
          centralQuestion: trimOptional(args.answers.centralQuestion, 200),
          publicPersona: trimOptional(args.answers.publicPersona, 140),
          innerExperience: trimOptional(args.answers.innerExperience, 140),
          currentSeason: cleanList(args.answers.currentSeason),
          reportFocus: cleanList(args.answers.reportFocus),
          growthPattern: cleanList(args.answers.growthPattern),
          tonePreference: trimOptional(args.answers.tonePreference, 80),
          preferredName: trimOptional(args.answers.preferredName, 80),
          pronouns: trimOptional(args.answers.pronouns, 40),
          customContext: trimOptional(args.answers.customContext, 600),
        },
      },
    });

    return { userId };
  },
});

async function enqueueReportGenerationForUser(
  ctx: any,
  args: { userId: string; priority?: number },
): Promise<{ jobId: string; alreadyQueued: boolean }> {
  const existing = await ctx.runQuery(internal.birthChartReport.queue.getActiveJobForUser, {
    userId: args.userId,
  });
  if (existing) return { jobId: existing._id, alreadyQueued: true };

  const jobId = await ctx.runMutation(internal.birthChartReport.queue.createJob, {
    userId: args.userId,
    priority: args.priority ?? 1,
  });

  await ctx.scheduler.runAfter(0, internal.birthChartReport.worker.processNextJobs, { limit: 1 });
  return { jobId, alreadyQueued: false };
}

export const submitReportQuestionnaire = action({
  args: {
    answers: profilingAnswersValidator,
    sessionId: v.optional(v.id("oracle_sessions")),
    priority: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<{ jobId: string; alreadyQueued: boolean }> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    await ctx.runMutation(internal.birthChartReport.queue.saveCompletedQuestionnaire, {
      userId,
      answers: args.answers,
      sessionId: args.sessionId,
    });

    return await enqueueReportGenerationForUser(ctx, { userId, priority: args.priority ?? 2 });
  },
});

export const enqueueMyReportGeneration = action({
  args: { priority: v.optional(v.number()) },
  handler: async (ctx, args): Promise<{ jobId: string; alreadyQueued: boolean }> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    return await enqueueReportGenerationForUser(ctx, { userId, priority: args.priority });
  },
});

export const enqueueReportGeneration = action({
  args: { userId: v.id("users"), priority: v.optional(v.number()) },
  handler: async (ctx, args): Promise<{ jobId: string; alreadyQueued: boolean }> => {
    return await enqueueReportGenerationForUser(ctx, args);
  },
});

export const startChatOnboarding = internalMutation({
  args: { userId: v.id("users"), sessionId: v.optional(v.id("oracle_sessions")) },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) throw new Error("User not found");
    if (!user.birthData) throw new Error("Missing birth data");
    if (user.birthChartReport?.status === "completed") return null;

    await ctx.db.patch(args.userId, {
      birthChartReport: {
        ...(user.birthChartReport ?? {}),
        status: "pending",
        onboardingStep: "questionnaire",
        profilingAnswers: user.birthChartReport?.profilingAnswers ?? {},
        oracleSessionId: args.sessionId ?? user.birthChartReport?.oracleSessionId,
        errorMessage: undefined,
      },
    });
    return null;
  },
});

export const saveCompletedQuestionnaire = internalMutation({
  args: { userId: v.id("users"), answers: profilingAnswersValidator, sessionId: v.optional(v.id("oracle_sessions")) },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) throw new Error("User not found");
    if (!user.birthData) throw new Error("Missing birth data");
    if (user.birthChartReport?.status === "completed") return null;

    await ctx.db.patch(args.userId, {
      birthChartReport: {
        ...(user.birthChartReport ?? {}),
        status: "pending",
        onboardingStep: "queued",
        profilingAnswers: {
          currentSeason: cleanList(args.answers.currentSeason),
          reportFocus: cleanList(args.answers.reportFocus),
          growthPattern: cleanList(args.answers.growthPattern),
          tonePreference: trimOptional(args.answers.tonePreference, 80),
          preferredName: trimOptional(args.answers.preferredName, 80),
          pronouns: trimOptional(args.answers.pronouns, 40),
          customContext: trimOptional(args.answers.customContext, 600),
          centralQuestion: trimOptional(args.answers.centralQuestion, 200),
          publicPersona: trimOptional(args.answers.publicPersona, 140),
          innerExperience: trimOptional(args.answers.innerExperience, 140),
        },
        oracleSessionId: args.sessionId ?? user.birthChartReport?.oracleSessionId,
        errorMessage: undefined,
      },
    });
    return null;
  },
});

export const saveChatOnboardingAnswer = internalMutation({
  args: {
    userId: v.id("users"),
    step: onboardingStepValidator,
    answer: v.optional(v.string()),
    nextStep: onboardingStepValidator,
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) throw new Error("User not found");
    const current = user.birthChartReport ?? { status: "pending" as const };
    const profiling = current.profilingAnswers ?? {};
    const clean = trimOptional(args.answer, args.step === "centralQuestion" ? 200 : args.step === "pronouns" ? 40 : 140);

    await ctx.db.patch(args.userId, {
      birthChartReport: {
        ...current,
        status: "pending",
        onboardingStep: args.nextStep,
        profilingAnswers: {
          ...profiling,
          ...(args.step !== "queued" && clean ? { [args.step]: clean } : {}),
        },
      },
    });
    return null;
  },
});

export const getActiveJobForUser = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const jobs = await ctx.db
      .query("birth_chart_report_jobs")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();
    return jobs.find((job) => job.status === "queued" || job.status === "processing") ?? null;
  },
});

export const getQueuedJobs = internalQuery({
  args: { limit: v.number() },
  handler: async (ctx, args) => {
    const jobs = await ctx.db
      .query("birth_chart_report_jobs")
      .withIndex("by_status", (q) => q.eq("status", "queued"))
      .collect();
    return jobs
      .sort((a, b) => b.priority - a.priority || a._creationTime - b._creationTime)
      .slice(0, args.limit);
  },
});

export const createJob = internalMutation({
  args: { userId: v.id("users"), priority: v.number() },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user?.birthData) throw new Error("Missing birth data");
    if (user.birthChartReport?.status === "completed") {
      throw new Error("Birth chart report already completed");
    }

    await ctx.db.patch(args.userId, {
      birthChartReport: {
        ...(user.birthChartReport ?? {}),
        status: "pending",
        errorMessage: undefined,
      },
    });

    return await ctx.db.insert("birth_chart_report_jobs", {
      userId: args.userId,
      status: "queued",
      priority: args.priority,
      attempts: 0,
      maxAttempts: 3,
    });
  },
});

export const markJobProcessing = internalMutation({
  args: { jobId: v.id("birth_chart_report_jobs") },
  handler: async (ctx, args) => {
    const job = await ctx.db.get(args.jobId);
    if (!job) throw new Error("Job not found");
    await ctx.db.patch(args.jobId, {
      status: "processing",
      attempts: job.attempts + 1,
      startedAt: Date.now(),
    });
    await ctx.db.patch(job.userId, {
      birthChartReport: {
        ...((await ctx.db.get(job.userId))?.birthChartReport ?? {}),
        status: "generating",
        errorMessage: undefined,
      },
    });
  },
});

export const markJobCompleted = internalMutation({
  args: { jobId: v.id("birth_chart_report_jobs") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.jobId, { status: "completed", completedAt: Date.now() });
  },
});

export const markJobFailed = internalMutation({
  args: { jobId: v.id("birth_chart_report_jobs"), error: v.string() },
  handler: async (ctx, args) => {
    const job = await ctx.db.get(args.jobId);
    if (!job) return;
    const terminal = job.attempts >= job.maxAttempts;
    await ctx.db.patch(args.jobId, {
      status: terminal ? "failed" : "queued",
      error: args.error,
      completedAt: terminal ? Date.now() : undefined,
    });
    if (terminal) {
      const user = await ctx.db.get(job.userId);
      await ctx.db.patch(job.userId, {
        birthChartReport: {
          ...(user?.birthChartReport ?? {}),
          status: "failed",
          errorMessage: args.error.slice(0, 500),
        },
      });
    }
  },
});
