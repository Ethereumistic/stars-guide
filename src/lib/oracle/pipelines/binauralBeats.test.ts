import { describe, expect, it } from "vitest";
import type { PipelineContext } from "../pipelineTypes";
import { binauralBeatsPipeline } from "./binauralBeats";

describe("binaural beats pipeline", () => {
  it("emits persisted player params for the reported natural-language request", () => {
    const context: PipelineContext = {
      userQuestion: "generate me a binarual beat for today's weather and call it smth cool",
      timezone: "Asia/Beirut",
      isFirstResponse: true,
      featureKey: null,
      birthChartDepth: null,
      birthData: null,
      birthChartReportContext: null,
      rawBirthData: null,
      journalContext: null,
      timespaceContext: null,
      soulDoc: "",
      featureInjection: null,
      synastryData: null,
    };

    const actions = binauralBeatsPipeline.afterResponse?.("Ember Tide", context);

    expect(actions).toEqual([
      expect.objectContaining({
        type: "store_binaural_params",
        payload: expect.objectContaining({
          version: 2,
          leftHz: expect.any(Number),
          rightHz: expect.any(Number),
          durationSeconds: expect.any(Number),
        }),
      }),
    ]);
  });
});
