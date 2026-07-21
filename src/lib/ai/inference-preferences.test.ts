import { describe, expect, it } from "vitest";
import {
  normalizeReasoningEffort,
  resolveUserModelPolicy,
  type UserModelOptionPolicy,
} from "./inference-preferences";

const options: UserModelOptionPolicy[] = [
  {
    optionKey: "automatic",
    enabled: true,
    allowedTiers: ["free", "popular", "premium"],
    defaultForTiers: ["free"],
    allowedReasoningEfforts: ["auto"],
    defaultReasoningEffort: "auto",
  },
  {
    optionKey: "gemma",
    enabled: true,
    allowedTiers: ["popular", "premium"],
    defaultForTiers: ["popular"],
    allowedReasoningEfforts: ["low", "medium"],
    defaultReasoningEffort: "medium",
  },
  {
    optionKey: "kimi",
    enabled: true,
    allowedTiers: ["premium"],
    defaultForTiers: ["premium"],
    allowedReasoningEfforts: ["auto", "high"],
    defaultReasoningEffort: "high",
  },
  {
    optionKey: "offline",
    enabled: false,
    allowedTiers: ["free", "popular", "premium"],
    defaultForTiers: [],
    allowedReasoningEfforts: ["auto"],
    defaultReasoningEffort: "auto",
  },
];

describe("resolveUserModelPolicy", () => {
  it("keeps a free user on the free route", () => {
    const result = resolveUserModelPolicy(options, "free", "automatic", "high");
    expect(result.option?.optionKey).toBe("automatic");
    expect(result.reasoningEffort).toBe("auto");
  });

  it("falls a free user requesting a paid route back to the free default", () => {
    const result = resolveUserModelPolicy(options, "free", "kimi", "high");
    expect(result.option?.optionKey).toBe("automatic");
    expect(result.fallbackReason).toBe("tier_not_allowed");
  });

  it("allows popular and premium choices according to their access matrix", () => {
    expect(resolveUserModelPolicy(options, "popular", "gemma", "low").option?.optionKey).toBe("gemma");
    expect(resolveUserModelPolicy(options, "premium", "kimi", "high").option?.optionKey).toBe("kimi");
  });

  it("normalizes an unsupported effort to the selected option default", () => {
    const result = resolveUserModelPolicy(options, "popular", "gemma", "high");
    expect(result.reasoningEffort).toBe("medium");
  });

  it("does not select a disabled route", () => {
    const result = resolveUserModelPolicy(options, "free", "offline", "auto");
    expect(result.option?.optionKey).toBe("automatic");
    expect(result.fallbackReason).toBe("option_disabled");
  });

  it("distinguishes an unknown option from a disabled one", () => {
    const result = resolveUserModelPolicy(options, "free", "deleted-option", "auto");
    expect(result.option?.optionKey).toBe("automatic");
    expect(result.fallbackReason).toBe("option_unavailable");
  });

  it("reports a missing tier default instead of inventing access", () => {
    const noPremiumDefault = options.map((option) => ({ ...option, defaultForTiers: option.defaultForTiers.filter((tier) => tier !== "premium") }));
    const result = resolveUserModelPolicy(noPremiumDefault, "premium");
    expect(result.option).toBeNull();
    expect(result.fallbackReason).toBe("no_tier_default");
  });
});

describe("normalizeReasoningEffort", () => {
  it("uses the first allowed value when the configured fallback is invalid", () => {
    expect(normalizeReasoningEffort("high", ["low"], "auto")).toBe("low");
  });
});
