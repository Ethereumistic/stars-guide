import { describe, expect, it } from "vitest";
import { shouldAutoStartBirthChartReport } from "./reportOnboarding";

describe("Birth Chart Report first-Oracle bootstrap", () => {
  it("starts for a natal user with no report record", () => {
    expect(shouldAutoStartBirthChartReport({ birthData: { chart: {} } })).toBe(true);
  });

  it("repairs a legacy bare pending record", () => {
    expect(shouldAutoStartBirthChartReport({
      birthData: { chart: {} },
      birthChartReport: { status: "pending", oracleSessionId: "existing-session" },
    })).toBe(true);
  });

  it("does not repeatedly redirect after questionnaire initialization", () => {
    expect(shouldAutoStartBirthChartReport({
      birthData: { chart: {} },
      birthChartReport: { status: "pending", onboardingStep: "questionnaire" },
    })).toBe(false);
  });

  it("does not start without birth data or during queued/completed work", () => {
    expect(shouldAutoStartBirthChartReport({})).toBe(false);
    expect(shouldAutoStartBirthChartReport({ birthData: {}, birthChartReport: { status: "pending", onboardingStep: "queued" } })).toBe(false);
    expect(shouldAutoStartBirthChartReport({ birthData: {}, birthChartReport: { status: "completed" } })).toBe(false);
  });
});
