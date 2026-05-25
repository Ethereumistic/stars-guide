import { NextRequest, NextResponse } from "next/server";
import satori from "satori";
import { Resvg, initWasm } from "@resvg/resvg-wasm";
import {
  OgType,
  resolveOgColors,
  SIGN_COLORS,
  ELEMENT_COLORS,
} from "@/lib/seo/og";

// ── Font loading ─────────────────────────────────────────────────────────
// We load Inter (the project's body font) as an ArrayBuffer for satori.
// The font file is committed to public/fonts/ for edge-runtime access.

let fontCache: ArrayBuffer | null = null;

async function getFont(): Promise<ArrayBuffer> {
  if (fontCache) return fontCache;
  // Fetch the font from the public directory at runtime.
  // In edge/CF Workers we can't use `fs`, so we fetch from the deployed URL.
  // For local dev, Next.js serves public/ at localhost:3000.
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const res = await fetch(`${baseUrl}/fonts/Inter-Bold.woff2`);
  if (!res.ok) {
    // Fallback: try the static import approach
    throw new Error(`Failed to load font: ${res.status}`);
  }
  fontCache = await res.arrayBuffer();
  return fontCache;
}

// ── Resvg WASM init ──────────────────────────────────────────────────────
let wasmInitialized = false;

async function ensureResvgInit() {
  if (wasmInitialized) return;
  // On CF Workers the wasm module must be fetched from the deployed URL
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const wasmRes = await fetch(`${baseUrl}/fonts/resvg_wasm.wasm`);
  const wasmBuffer = await wasmRes.arrayBuffer();
  await initWasm(wasmBuffer);
  wasmInitialized = true;
}

// ── Star field SVG for background ────────────────────────────────────────

function generateStars(count: number, width: number, height: number): string {
  let svg = "";
  for (let i = 0; i < count; i++) {
    const x = Math.random() * width;
    const y = Math.random() * height;
    const r = Math.random() * 1.5 + 0.5;
    const opacity = Math.random() * 0.6 + 0.3;
    svg += `<circle cx="${x}" cy="${y}" r="${r}" fill="white" opacity="${opacity}" />`;
  }
  return svg;
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

    const colors = resolveOgColors(type, typeId);
    const width = 1200;
    const height = 630;

    // Pre-generate star positions (seeded-ish for consistency)
    const starsSvg = generateStars(80, width, height);

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
        {/* Background gradient */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: `radial-gradient(ellipse at 50% 30%, ${colors.primary}22 0%, transparent 70%)`,
          }}
        />

        {/* Stars overlay (rendered as inline SVG) */}
        <div
          style={{
            position: "absolute",
            inset: 0,
          }}
          dangerouslySetInnerHTML={{
            __html: `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">${starsSvg}</svg>`,
          }}
        />

        {/* Top accent bar */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: 4,
            background: `linear-gradient(90deg, ${colors.primary}, ${colors.secondary}, ${colors.primary})`,
          }}
        />

        {/* Content */}
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
          {/* Decorative element symbol area */}
          {type && typeId && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 20,
                width: 64,
                height: 64,
                borderRadius: "50%",
                border: `2px solid ${colors.primary}44`,
                backgroundColor: `${colors.primary}15`,
              }}
            >
              <svg
                width="28"
                height="28"
                viewBox="0 0 24 24"
                fill="none"
                stroke={colors.primary}
                strokeWidth="2"
              >
                {/* Star icon as generic zodiac/element symbol */}
                <polygon
                  points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"
                  fill={`${colors.primary}33`}
                  stroke={colors.primary}
                />
              </svg>
            </div>
          )}

          {/* Title */}
          <div
            style={{
              fontSize: 56,
              fontWeight: 700,
              color: "#FFFFFF",
              lineHeight: 1.2,
              letterSpacing: "-0.02em",
              maxWidth: 900,
              textShadow: `0 0 40px ${colors.primary}44`,
            }}
          >
            {title}
          </div>

          {/* Subtitle */}
          {subtitle && (
            <div
              style={{
                fontSize: 26,
                fontWeight: 400,
                color: `${colors.secondary}`,
                marginTop: 16,
                lineHeight: 1.4,
                letterSpacing: "0.01em",
              }}
            >
              {subtitle}
            </div>
          )}
        </div>

        {/* Bottom bar with branding */}
        <div
          style={{
            position: "relative",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "20px 80px",
            borderTop: `1px solid ${colors.primary}22`,
          }}
        >
          <div
            style={{
              fontSize: 18,
              fontWeight: 600,
              color: colors.primary,
              letterSpacing: "0.08em",
            }}
          >
            ★ STARS.GUIDE
          </div>
          <div
            style={{
              fontSize: 14,
              color: "#888888",
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

    return new NextResponse(new Uint8Array(pngBuffer), {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=3600, s-maxage=3600",
      },
    });
  } catch (error) {
    console.error("OG image generation failed:", error);
    // Return a simple error response — never block the page from loading
    return new NextResponse("OG image generation failed", { status: 500 });
  }
}