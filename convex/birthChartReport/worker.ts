"use node";

import { v } from "convex/values";
import { internalAction } from "../_generated/server";
import { generateAndSaveReport } from "./generate";

const { internal } = require("../_generated/api") as any;

export const processNextJobs = internalAction({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const results: Array<{ jobId: string; status: "completed" | "failed"; error?: string }> = [];

    for (let index = 0; index < Math.min(args.limit ?? 3, 5); index += 1) {
      const job = await ctx.runMutation(internal.birthChartReport.queue.claimNextJob, {});
      if (!job) break;

      try {
        await generateAndSaveReport(ctx, job.userId);
        await ctx.runMutation(internal.birthChartReport.queue.markJobCompleted, {
          jobId: job._id,
        });
        results.push({ jobId: job._id, status: "completed" });
      } catch (err) {
        const error = err instanceof Error ? err.message : "Unknown birth chart report generation error";
        console.error("[BirthChartReport] generation failed", {
          jobId: job._id,
          userId: job.userId,
          error,
          stack: err instanceof Error ? err.stack : undefined,
        });
        const failure = await ctx.runMutation(internal.birthChartReport.queue.markJobFailed, {
          jobId: job._id,
          error,
        });
        if (failure?.retry) {
          const retryDelayMs = Math.min(120_000, 15_000 * 2 ** Math.max(0, failure.attempt - 1));
          await ctx.scheduler.runAfter(retryDelayMs, internal.birthChartReport.worker.processNextJobs, { limit: 1 });
        }
        results.push({ jobId: job._id, status: "failed", error });
      }
    }

    return { processed: results.length, results };
  },
});
