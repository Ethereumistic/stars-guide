export interface BirthChartReportBootstrapUser {
  birthData?: unknown;
  birthChartReport?: {
    status: "pending" | "generating" | "completed" | "failed";
    onboardingStep?: string;
    oracleSessionId?: unknown;
  } | null;
}

/**
 * Start the human-report conversation once, when the user first reaches Oracle
 * with canonical birth data. An initialized questionnaire or queued job must
 * never keep redirecting ordinary Oracle conversations.
 */
export function shouldAutoStartBirthChartReport(
  user: BirthChartReportBootstrapUser | null | undefined,
): boolean {
  if (!user?.birthData) return false;
  const report = user.birthChartReport;
  return !report || (report.status === "pending" && !report.onboardingStep);
}
