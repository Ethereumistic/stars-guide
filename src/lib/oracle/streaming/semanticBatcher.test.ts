import { describe, expect, it } from "vitest";
import { SemanticBatchAccumulator } from "./semanticBatcher";

describe("SemanticBatchAccumulator", () => {
  it("prefers complete paragraphs and preserves exact text", () => {
    const batcher = new SemanticBatchAccumulator();
    expect(batcher.push("First paragraph.\n")).toEqual([]);
    expect(batcher.push("\nSecond paragraph is still arriving")).toEqual([
      "First paragraph.\n\n",
    ]);
    expect(batcher.finish()).toEqual(["Second paragraph is still arriving"]);
  });

  it("uses sentence and bounded forced boundaries", () => {
    const sentence = new SemanticBatchAccumulator({ minSentenceChars: 20 });
    expect(sentence.push("A sufficiently complete sentence. More")).toEqual([
      "A sufficiently complete sentence. ",
    ]);
    const bounded = new SemanticBatchAccumulator({ maxPendingChars: 16 });
    const batches = bounded.push("abcdefgh ijklmnop qrstuv");
    expect(batches[0].length).toBeLessThanOrEqual(16);
    expect(batches.join("") + bounded.finish().join("")).toBe("abcdefgh ijklmnop qrstuv");
  });
});

