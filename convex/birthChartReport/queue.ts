import { v } from "convex/values";
import { action, internalMutation, internalQuery, mutation, query } from "../_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { BIRTH_CHART_REPORT_VERSION } from "./prompts";
import { BIRTH_CHART_REPORT_WELCOME } from "./onboarding";

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
    if (!user) return null;
    return {
      report: user.birthChartReport ?? null,
      birthData: user.birthData ?? null,
    };
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

  const created = await ctx.runMutation(internal.birthChartReport.queue.createJob, {
    userId: args.userId,
    priority: args.priority ?? 1,
  });
  if (created.created) {
    await ctx.scheduler.runAfter(0, internal.birthChartReport.worker.processNextJobs, { limit: 1 });
  }
  return { jobId: created.jobId, alreadyQueued: !created.created };
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

export const createJob = internalMutation({
  args: { userId: v.id("users"), priority: v.number() },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user?.birthData) throw new Error("Missing birth data");
    const existingJobs = await ctx.db.query("birth_chart_report_jobs").withIndex("by_user", (q) => q.eq("userId", args.userId)).collect();
    const existing = existingJobs.find((job) => job.status === "queued" || job.status === "processing");
    if (existing) return { jobId: existing._id, created: false };
    if (user.birthChartReport?.status === "completed" && (user.birthChartReport.version ?? 0) >= BIRTH_CHART_REPORT_VERSION) {
      throw new Error("Birth chart report already completed");
    }

    await ctx.db.patch(args.userId, {
      birthChartReport: {
        ...(user.birthChartReport ?? {}),
        status: "pending",
        errorMessage: undefined,
      },
    });

    const jobId = await ctx.db.insert("birth_chart_report_jobs", {
      userId: args.userId,
      status: "queued",
      priority: args.priority,
      attempts: 0,
      maxAttempts: 3,
    });
    return { jobId, created: true };
  },
});

/** Atomically selects and claims one queued job inside a single mutation. */
export const claimNextJob = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const processing = await ctx.db.query("birth_chart_report_jobs").withIndex("by_status", (q) => q.eq("status", "processing")).collect();
    for (const stale of processing.filter((job) => (job.startedAt ?? job._creationTime) < now - 10 * 60_000)) {
      const terminal = stale.attempts >= stale.maxAttempts;
      await ctx.db.patch(stale._id, {
        status: terminal ? "failed" : "queued",
        error: "Worker lease expired before completion",
        completedAt: terminal ? now : undefined,
      });
      if (terminal) {
        const staleUser = await ctx.db.get(stale.userId);
        if (staleUser) await ctx.db.patch(stale.userId, { birthChartReport: { ...(staleUser.birthChartReport ?? {}), status: "failed", errorMessage: "Report generation timed out. Retry to start a fresh pass." } });
      }
    }
    const jobs = await ctx.db
      .query("birth_chart_report_jobs")
      .withIndex("by_status", (q) => q.eq("status", "queued"))
      .collect();
    const job = jobs.sort((a, b) => b.priority - a.priority || a._creationTime - b._creationTime)[0];
    if (!job) return null;
    await ctx.db.patch(job._id, { status: "processing", attempts: job.attempts + 1, startedAt: now });
    const user = await ctx.db.get(job.userId);
    if (user) {
      await ctx.db.patch(job.userId, {
        birthChartReport: {
          ...(user.birthChartReport ?? {}),
          status: "generating",
          onboardingStep: "queued",
          errorMessage: undefined,
        },
      });
    }
    return { ...job, status: "processing" as const, attempts: job.attempts + 1, startedAt: now };
  },
});

/**
 * Repairs legacy/bare pending report sessions and makes onboarding durable.
 * This is intentionally deterministic and does not consume Oracle quota.
 */
export const ensureMyReportOnboarding = mutation({
  args: { sessionId: v.id("oracle_sessions") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const [user, session] = await Promise.all([ctx.db.get(userId), ctx.db.get(args.sessionId)]);
    if (!user?.birthData) throw new Error("Birth data is required before generating a report");
    if (!session || session.userId !== userId) throw new Error("Report session not found");
    const report = user.birthChartReport;
    const isReportSession = session.featureKey === "birth_chart_report" || report?.oracleSessionId === args.sessionId;
    if (!isReportSession) throw new Error("Session is not the user's Birth Chart Report session");
    if (report?.status === "completed") return { repaired: false };

    const messages = await ctx.db
      .query("oracle_messages")
      .withIndex("by_session_created", (q) => q.eq("sessionId", args.sessionId))
      .collect();
    if (!messages.some((message) => message.role === "assistant")) {
      const now = Date.now();
      await ctx.db.insert("oracle_messages", {
        sessionId: args.sessionId,
        role: "assistant",
        content: BIRTH_CHART_REPORT_WELCOME,
        createdAt: now,
      });
      await ctx.db.patch(args.sessionId, {
        messageCount: session.messageCount + 1,
        updatedAt: now,
        lastMessageAt: now,
      });
    }
    await ctx.db.patch(userId, {
      birthChartReport: {
        ...(report ?? {}),
        status: "pending",
        onboardingStep: "questionnaire",
        profilingAnswers: report?.profilingAnswers ?? {},
        oracleSessionId: args.sessionId,
        errorMessage: undefined,
      },
    });
    return { repaired: true };
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
    return { retry: !terminal, attempt: job.attempts };
  },
});
