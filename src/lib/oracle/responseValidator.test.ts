import { describe, expect, it } from "vitest";
import type { OracleEvidenceBundle } from "./capabilities";
import { validateCanonicalNatalClaims } from "./responseValidator";

const evidence: OracleEvidenceBundle = {
  requestedAt: new Date(0).toISOString(),
  timezone: "UTC",
  warnings: [],
  items: [],
  natalChart: {
    availableEntities: ["ascendant", "sun", "moon", "mercury", "mars", "north_node", "south_node"],
    placements: [
      { body: "Ascendant", sign: "Aries", house: 1, degree: 14.72 },
      { body: "Sun", sign: "Leo", house: 5, degree: 12.49, retrograde: false, dignity: "domicile" },
      { body: "Moon", sign: "Pisces", house: 12, degree: 29.8, retrograde: false, dignity: null },
      { body: "Mercury", sign: "Virgo", house: 6, degree: 4.2, retrograde: true, dignity: "domicile" },
      { body: "Mars", sign: "Capricorn", house: 10, degree: 18.1, retrograde: false, dignity: "exaltation" },
      { body: "North Node", sign: "Taurus", house: 2, degree: 6.1, retrograde: true, dignity: null },
      { body: "South Node", sign: "Scorpio", house: 8, degree: 6.1, retrograde: true, dignity: null },
    ],
    houseSignatures: [
      { house: 1, sign: "Aries" },
      { house: 10, sign: "Capricorn" },
    ],
    storedAspects: [
      { body1: "Sun", body2: "Moon", type: "trine" },
      { body1: "Mercury", body2: "Mars", type: "sextile" },
    ],
    chartRuler: { body: "Mars" },
    concentrations: [
      { kind: "house", value: 10, bodies: ["Mars", "Jupiter", "Saturn"] },
      { kind: "sign", value: "Capricorn", bodies: ["Mars", "Jupiter", "Saturn"] },
    ],
  },
};

function codes(content: string) {
  return validateCanonicalNatalClaims(content, evidence).map((item) => item.code);
}

describe("validateCanonicalNatalClaims", () => {
  it("accepts canonical sign, house, motion, dignity, degree, ruler, axis, and aspect claims", () => {
    const content = [
      "Your Ascendant is in Aries and your Sun in Leo in House 5 is direct and in domicile.",
      "Sun at 12\u00b0 trines Moon, while Mercury is retrograde in Virgo in House 6.",
      "Mars is exalted and is your chart ruler.",
      "House 1 is Aries and Capricorn rules the tenth house.",
      "Your North Node in Taurus in the second house opposes the South Node in Scorpio in the eighth house.",
      "The Capricorn concentration and House 10 cluster are central themes.",
    ].join(" ");
    expect(validateCanonicalNatalClaims(content, evidence)).toEqual([]);
  });

  it("rejects contradictory signs and houses for every asserted placement", () => {
    expect(codes("Sun in Virgo in House 4. Mercury in Leo in the seventh house.")).toEqual(
      expect.arrayContaining(["contradictory_natal_sign", "contradictory_natal_house"]),
    );
  });

  it("covers every supported natal entity alias for sign and house contradictions", () => {
    const bodies = [
      "Ascendant",
      "Sun",
      "Moon",
      "Mercury",
      "Venus",
      "Mars",
      "Jupiter",
      "Saturn",
      "Uranus",
      "Neptune",
      "Pluto",
      "North Node",
      "South Node",
      "Chiron",
      "Part of Fortune",
    ];
    const signs = [
      "Aries",
      "Taurus",
      "Gemini",
      "Cancer",
      "Leo",
      "Virgo",
      "Libra",
      "Scorpio",
      "Sagittarius",
      "Capricorn",
      "Aquarius",
      "Pisces",
    ];
    const allEntityEvidence: OracleEvidenceBundle = {
      ...evidence,
      natalChart: {
        availableEntities: bodies,
        storedAspects: [],
        placements: bodies.map((body, index) => ({
          body,
          sign: signs[index % signs.length],
          house: (index % 12) + 1,
        })),
      },
    };

    for (const [index, body] of bodies.entries()) {
      const canonicalSign = signs[index % signs.length];
      const wrongSign = canonicalSign === "Aries" ? "Taurus" : "Aries";
      const canonicalHouse = (index % 12) + 1;
      const wrongHouse = (canonicalHouse % 12) + 1;
      const result = validateCanonicalNatalClaims(
        `${body} in ${wrongSign} in House ${wrongHouse}.`,
        allEntityEvidence,
      ).map((item) => item.code);
      expect(result, body).toEqual(expect.arrayContaining([
        "contradictory_natal_sign",
        "contradictory_natal_house",
      ]));
    }
  });

  it("rejects incorrect motion and dignity claims", () => {
    expect(codes("Mercury is direct and Mars is in fall.")).toEqual(
      expect.arrayContaining(["contradictory_natal_motion", "contradictory_natal_dignity"]),
    );
  });

  it("documents degree rounding tolerance and rejects larger differences", () => {
    expect(codes("Sun at 12\u00b0.")).not.toContain("contradictory_natal_degree");
    expect(codes("Sun at 13\u00b0.")).not.toContain("contradictory_natal_degree");
    expect(codes("Sun at 14\u00b0.")).toContain("contradictory_natal_degree");
  });

  it("rejects incorrect house signatures, chart ruler, and concentrations", () => {
    const result = codes(
      "House 1 is Taurus. Venus is the chart ruler. The Pisces concentration and House 9 cluster dominate.",
    );
    expect(result).toEqual(expect.arrayContaining([
      "contradictory_house_signature",
      "unsupported_chart_ruler",
      "unsupported_natal_concentration",
    ]));
  });

  it("accepts stored aspects and rejects invented ones", () => {
    expect(codes("Sun trine Moon. Mercury sextile Mars.")).not.toContain("unsupported_natal_aspect");
    expect(codes("Sun square Moon.")).toContain("unsupported_natal_aspect");
  });

  it("does not activate richer checks when old evidence lacks structured facts", () => {
    const legacyEvidence: OracleEvidenceBundle = {
      ...evidence,
      natalChart: {
        availableEntities: ["sun"],
        storedAspects: [],
      },
    };
    expect(validateCanonicalNatalClaims("Sun in Virgo in House 4.", legacyEvidence)).toEqual([]);
  });
});
