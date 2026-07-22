import { describe, expect, it } from "vitest";
import { distanceFromBottom } from "./use-smart-chat-scroll";

describe("smart chat scroll geometry", () => {
  it("measures whether the viewport is near the newest approved content", () => {
    expect(distanceFromBottom({ scrollHeight: 1_000, scrollTop: 600, clientHeight: 400 })).toBe(0);
    expect(distanceFromBottom({ scrollHeight: 1_000, scrollTop: 300, clientHeight: 400 })).toBe(300);
  });
});
