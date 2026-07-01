"use node";

import { v } from "convex/values";
import { internalAction } from "../_generated/server";
import { generateAndSaveReport } from "./generate";

const { internal } = require("../_generated/api") as any;

export const processNextJobs = internalAction({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const jobs = await ctx.runQuery(internal.birthChartReport.queue.getQueuedJobs, {
      limit: Math.min(args.limit ?? 3, 5),
    });

    const results: Array<{ jobId: string; status: "completed" | "failed"; error?: string }> = [];

    for (const job of jobs) {
      await ctx.runMutation(internal.birthChartReport.queue.markJobProcessing, {
        jobId: job._id,
      });

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
        await ctx.runMutation(internal.birthChartReport.queue.markJobFailed, {
          jobId: job._id,
          error,
        });
        results.push({ jobId: job._id, status: "failed", error });
      }
    }

    return { processed: results.length, results };
  },
});
