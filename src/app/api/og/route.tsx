import { NextRequest, NextResponse } from "next/server";
import satori from "satori";
import { Resvg, initWasm } from "@resvg/resvg-wasm";
import { OgType, resolveOgColors, SIGN_COLORS } from "@/lib/seo/og";

// ── Font loading ─────────────────────────────────────────────────────────
let fontCache: ArrayBuffer | null = null;

async function getFont(): Promise<ArrayBuffer> {
  if (fontCache) return fontCache;
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const res = await fetch(`${baseUrl}/fonts/Inter-Bold.woff2`);
  if (!res.ok) throw new Error(`Failed to load font: ${res.status}`);
  fontCache = await res.arrayBuffer();
  return fontCache;
}

// ── Resvg WASM init ──────────────────────────────────────────────────────
let wasmInitialized = false;

async function ensureResvgInit() {
  if (wasmInitialized) return;
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const wasmRes = await fetch(`${baseUrl}/fonts/resvg_wasm.wasm`);
  const wasmBuffer = await wasmRes.arrayBuffer();
  await initWasm(wasmBuffer);
  wasmInitialized = true;
}

// ── Deterministic star positions (pre-computed) ───────────────────────────
// Using a seeded pseudo-random to get consistent images across requests
function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function generateStars(width: number, height: number): Array<{ x: number; y: number; r: number; o: number }> {
  const rand = seededRandom(42);
  const stars: Array<{ x: number; y: number; r: number; o: number }> = [];
  for (let i = 0; i < 60; i++) {
    stars.push({
      x: rand() * width,
      y: rand() * height,
      r: rand() * 1.5 + 0.5,
      o: rand() * 0.5 + 0.25,
    });
  }
  return stars;
}

// ── Main handler ──────────────────────────────────────────────────────────

export const runtime = "edge";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const title = searchParams.get("title") || "Stars Guide";
    const subtitle = searchParams.get("subtitle") || "";
    const type = (searchParams.get("type") as OgType) || undefined;
    const typeId = searchParams.get("typeId") || undefined;
    const date = searchParams.get("date") || undefined;
    const sign1 = searchParams.get("sign1") || undefined;
    const sign2 = searchParams.get("sign2") || undefined;
    const score = searchParams.get("score") || undefined;
    const label = searchParams.get("label") || undefined;

    const colors = resolveOgColors(type, typeId);
    const width = 1200;
    const height = 630;

    const stars = generateStars(width, height);

    // Build the main content block based on type
    const renderContent = () => {
      if (type === "compatibility" && sign1 && sign2) {
        const scoreNum = parseInt(score || "50", 10);
        const scoreColor = scoreNum >= 75 ? "#4ADE80" : scoreNum >= 50 ? "#FBBF24" : "#F87171";
        return (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 24 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 32 }}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                <div style={{ fontSize: 48, fontWeight: 700, color: SIGN_COLORS[sign1]?.primary || colors.primary }}>
                  {sign1.charAt(0).toUpperCase() + sign1.slice(1)}
                </div>
                <div style={{ fontSize: 18, color: "#888888" }}>You</div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                <div style={{ fontSize: 48 }}>💕</div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                <div style={{ fontSize: 48, fontWeight: 700, color: SIGN_COLORS[sign2]?.primary || colors.secondary }}>
                  {sign2.charAt(0).toUpperCase() + sign2.slice(1)}
                </div>
                <div style={{ fontSize: 18, color: "#888888" }}>Partner</div>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ fontSize: 64, fontWeight: 700, color: scoreColor }}>{scoreNum}%</div>
              {label && <div style={{ fontSize: 24, color: "#AAAAAA", fontWeight: 400 }}>{label}</div>}
            </div>
          </div>
        );
      }
      return (
        <>
          {/* Title */}
          <div
            style={{
              fontSize: title.length > 30 ? 44 : 56,
              fontWeight: 700,
              color: "#FFFFFF",
              lineHeight: 1.2,
              letterSpacing: "-0.02em",
              maxWidth: 900,
            }}
          >
            {title}
          </div>
          {/* Subtitle */}
          {subtitle && (
            <div
              style={{
                fontSize: 24,
                fontWeight: 400,
                color: colors.secondary,
                marginTop: 16,
                lineHeight: 1.4,
                letterSpacing: "0.01em",
              }}
            >
              {subtitle}
            </div>
          )}
          {date && type === "horoscope" && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginTop: 20,
                padding: "8px 20px",
                borderRadius: 999,
                border: `1px solid ${colors.primary}44`,
                backgroundColor: `${colors.primary}11`,
              }}
            >
              <div style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: colors.primary }} />
              <div style={{ fontSize: 16, fontWeight: 600, color: colors.primary, letterSpacing: "0.05em" }}>
                {date.toUpperCase()}
              </div>
            </div>
          )}
        </>
      );
    };

    const jsx = (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          position: "relative",
          backgroundColor: "#0A0A1A",
          overflow: "hidden",
        }}
      >
        {/* Top accent bar */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: 4,
            background: `linear-gradient(90deg, ${colors.primary}, ${colors.secondary})`,
          }}
        />

        {/* Background radial glow */}
        <div
          style={{
            position: "absolute",
            top: -80,
            left: "25%",
            width: "50%",
            height: 400,
            background: colors.primary,
            opacity: 0.08,
            borderRadius: "50%",
          }}
        />

        {/* Star dots */}
        {stars.map((star, i) => (
          <div
            key={i}
            style={{
              position: "absolute",
              left: star.x,
              top: star.y,
              width: star.r * 2,
              height: star.r * 2,
              borderRadius: "50%",
              backgroundColor: "white",
              opacity: star.o,
            }}
          />
        ))}

        {/* Content area */}
        <div
          style={{
            position: "relative",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
            flex: 1,
            padding: "60px 80px",
            textAlign: "center",
          }}
        >
          {renderContent()}
        </div>

        {/* Bottom bar with branding */}
        <div
          style={{
            position: "relative",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "16px 80px",
            borderTop: `1px solid ${colors.primary}33`,
          }}
        >
          <div
            style={{
              fontSize: 16,
              fontWeight: 600,
              color: colors.primary,
              letterSpacing: "0.08em",
            }}
          >
            STARS.GUIDE
          </div>
          <div
            style={{
              fontSize: 14,
              color: "#666666",
            }}
          >
            Navigate your fate
          </div>
        </div>
      </div>
    );

    // Render JSX → SVG via satori
    const fontData = await getFont();
    const svg = await satori(jsx, {
      width,
      height,
      fonts: [
        {
          name: "Inter",
          data: fontData,
          weight: 700,
          style: "normal",
        },
      ],
    });

    // Convert SVG → PNG via resvg
    await ensureResvgInit();
    const resvg = new Resvg(svg, {
      fitTo: { mode: "width", value: width },
    });
    const pngData = resvg.render();
    const pngBuffer = pngData.asPng();

    return new NextResponse(Buffer.from(pngBuffer), {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=3600, s-maxage=3600",
      },
    });
  } catch (error) {
    console.error("OG image generation failed:", error);
    return new NextResponse("OG image generation failed", { status: 500 });
  }
}