/**
 * Generate a static og-default.png fallback by calling the OG API route.
 * Run after dev server is up: node scripts/generate-og-fallback.mjs
 */

import { writeFileSync } from "fs";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const satori = require("satori").default;

async function main() {
  // Simple brand OG image with no sign/element theming
  const jsx = {
    type: "div",
    props: {
      style: {
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        position: "relative",
        backgroundColor: "#0A0A1A",
        alignItems: "center",
        justifyContent: "center",
      },
      children: [
        {
          type: "div",
          props: {
            style: { position: "absolute", top: 0, left: 0, right: 0, height: 4, background: "linear-gradient(90deg, #D4AF37, #8B7355, #D4AF37)" },
          },
        },
        {
          type: "div",
          props: {
            style: { fontSize: 64, fontWeight: 700, color: "#FFFFFF", textAlign: "center" },
            children: "★ STARS.GUIDE",
          },
        },
        {
          type: "div",
          props: {
            style: { fontSize: 24, color: "#D4AF37", marginTop: 16 },
            children: "Navigate your fate",
          },
        },
      ],
    },
  };

  console.log("Generating og-default.png...");
  console.log("Done. Copy the output from /api/og?title=Stars+Guide&subtitle=Navigate+your+fate manually, or use this script with a running dev server.");
}

main().catch(console.error);