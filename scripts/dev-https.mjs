#!/usr/bin/env node
/**
 * dev-https.mjs — Start an HTTPS development tunnel for mobile debugging.
 *
 * Uses Cloudflare Tunnel (cloudflared) to create a public HTTPS URL pointing
 * at your local Next.js dev server. Sets DEVELOPMENT_URL on your Convex
 * deployment so OAuth redirects work on real devices (iPhone, etc).
 *
 * Usage:
 *   pnpm dev:https              # Start tunnel + dev server + auto-configure Convex
 *   pnpm dev:https:tunnel       # Start just the tunnel (no dev server)
 *
 * Prerequisites:
 *   pnpm add -D cloudflared
 *
 *   That's it. No account, no auth token, no sign-up required for quick tunnels.
 *
 * OAuth provider configuration:
 *   The OAuth redirect URIs go through your Convex backend, so they DON'T
 *   need to change. But Google One Tap requires the tunnel URL to be in the
 *   "Authorized JavaScript origins" list:
 *
 *   Google Cloud Console → APIs & Services → Credentials → Your OAuth client
 *     → Authorized JavaScript origins: add https://<your-tunnel-url>
 */

import { execFileSync, execSync, spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createInterface } from "node:readline";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

// ── Configuration ────────────────────────────────────────────────────────
const PORT = parseInt(process.env.PORT || "3001", 10);
const TUNNEL_URL_ENV = "SITE_URL";
const PRODUCTION_SITE_URL = "https://stars.guide";

// ── Helpers ──────────────────────────────────────────────────────────────

function log(level, msg) {
  const colors = { info: "\x1b[36m", ok: "\x1b[32m", warn: "\x1b[33m", err: "\x1b[31m" };
  const reset = "\x1b[0m";
  const c = colors[level] || "";
  console.log(`${c}${msg}${reset}`);
}

function checkCloudflared() {
  try {
    execSync("npx cloudflared version", { stdio: "pipe", cwd: ROOT });
    return true;
  } catch {
    return false;
  }
}

/**
 * Resolve the hosted deployment to update. `convex env --prod` only works
 * after `convex dev` has configured a checkout. The deployment name can be
 * derived from NEXT_PUBLIC_CONVEX_URL for the normal hosted Convex setup.
 */
function getConvexTarget() {
  if (process.env.CONVEX_SELF_HOSTED_URL && process.env.CONVEX_SELF_HOSTED_ADMIN_KEY) {
    return {
      type: "self-hosted",
      url: process.env.CONVEX_SELF_HOSTED_URL,
      adminKey: process.env.CONVEX_SELF_HOSTED_ADMIN_KEY,
    };
  }
  if (process.env.CONVEX_DEPLOYMENT) return { type: "hosted", deployment: process.env.CONVEX_DEPLOYMENT };

  try {
    const envLocal = fs.readFileSync(path.join(ROOT, ".env.local"), "utf-8");
    const parsed = {};
    for (const line of envLocal.split("\n")) {
      const trimmed = line.trim();
      if (trimmed.startsWith("#") || !trimmed.includes("=")) continue;
      const match = trimmed.match(/^([A-Z_]+)\s*=\s*(.+)$/);
      if (match) parsed[match[1]] = match[2].trim().replace(/^['"]|['"]$/g, "");
    }
    if (parsed.CONVEX_SELF_HOSTED_URL && parsed.CONVEX_SELF_HOSTED_ADMIN_KEY) {
      return { type: "self-hosted", url: parsed.CONVEX_SELF_HOSTED_URL, adminKey: parsed.CONVEX_SELF_HOSTED_ADMIN_KEY };
    }
    if (parsed.CONVEX_DEPLOYMENT) return { type: "hosted", deployment: parsed.CONVEX_DEPLOYMENT };

    const hostname = new URL(parsed.NEXT_PUBLIC_CONVEX_URL).hostname;
    const match = hostname.match(/^([^.]+)\.convex\.cloud$/);
    if (match) return { type: "hosted", deployment: match[1] };
  } catch { /* fall through */ }

  return null;
}

function convexEnvArgs(subcmd, ...args) {
  const target = getConvexTarget();
  return ["env", subcmd, ...args, ...(target?.type === "hosted" ? ["--deployment-name", target.deployment] : [])];
}

function convexCommandText(args) {
  return `node node_modules/convex/bin/main.js ${args.map((arg) => JSON.stringify(arg)).join(" ")}`;
}

function runConvexEnv(subcmd, ...args) {
  const commandArgs = convexEnvArgs(subcmd, ...args);
  const target = getConvexTarget();
  if (!target) {
    throw new Error(
      "No Convex target configured. Set CONVEX_DEPLOYMENT for Convex Cloud, " +
      "or CONVEX_SELF_HOSTED_URL and CONVEX_SELF_HOSTED_ADMIN_KEY for self-hosted Convex.",
    );
  }
  return execFileSync(process.execPath, ["node_modules/convex/bin/main.js", ...commandArgs], {
    cwd: ROOT,
    encoding: "utf-8",
    stdio: ["ignore", "pipe", "pipe"],
    env: target?.type === "self-hosted"
      ? { ...process.env, CONVEX_SELF_HOSTED_URL: target.url, CONVEX_SELF_HOSTED_ADMIN_KEY: target.adminKey }
      : process.env,
  });
}

/**
 * Wait for cloudflared to print the tunnel URL to stderr.
 * cloudflared logs the URL in a line like:
 *   |  https://some-words.trycloudflare.com  |
 * Listens on stderr for up to 30 seconds.
 */
async function getTunnelUrl(cloudflared) {
  return new Promise((resolve) => {
    const urlPattern = /https:\/\/[a-z0-9-]+\.trycloudflare\.com/;
    let buffer = "";

    const rl = createInterface({ input: cloudflared.stderr });

    const timeout = setTimeout(() => {
      resolve(null);
    }, 30_000);

    rl.on("line", (line) => {
      buffer += line + "\n";
      const match = line.match(urlPattern);
      if (match) {
        clearTimeout(timeout);
        resolve(match[0]);
      }
    });

    rl.on("close", () => {
      clearTimeout(timeout);
      resolve(null);
    });
  });
}

/**
 * Set DEVELOPMENT_URL on the Convex deployment.
 */
function setTunnelSiteUrl(url) {
  try {
    runConvexEnv("set", TUNNEL_URL_ENV, url);
    log("ok", `✓ Convex DEVELOPMENT_URL set to: ${url}`);
    return true;
  } catch (err) {
    log("err", "✗ Failed to set DEVELOPMENT_URL");
    const details = [err.stdout, err.stderr, err.message]
      .filter(Boolean)
      .map((value) => value.toString().trim())
      .filter(Boolean)
      .join("\n");
    log("err", `  ${details || "Convex CLI exited without an error message."}`);
    log("info", "");
    log("warn", "  Run manually:");
    log("info", `    ${convexCommandText(convexEnvArgs("set", TUNNEL_URL_ENV, url))}`);
    log("info", "");
    log("warn", "  Or set it via the Convex dashboard if the CLI doesn't connect.");
    return false;
  }
}

/**
 * Remove DEVELOPMENT_URL from the Convex deployment.
 */
function restoreSiteUrl(previousValue) {
  try {
    runConvexEnv("set", TUNNEL_URL_ENV, previousValue);
    log("ok", "✓ DEVELOPMENT_URL removed from Convex deployment");
  } catch {
    log("info", "  DEVELOPMENT_URL was not set (nothing to remove)");
  }
}

// ── Main ─────────────────────────────────────────────────────────────────

async function main() {
  const mode = process.argv[2] || "full"; // "full" = tunnel + dev server, "tunnel" = tunnel only

  console.log();
  log("info", "╔══════════════════════════════════════════════════════════╗");
  log("info", "║         🔐 stars.guide — HTTPS Dev Tunnel Setup          ║");
  log("info", "╚══════════════════════════════════════════════════════════╝");
  console.log();

  // ── Step 1: Check cloudflared ───────────────────────────────────────────
  if (!checkCloudflared()) {
    log("err", "✗ cloudflared is not installed!");
    console.log();
    log("info", "Install it as a dev dependency:");
    console.log();
    console.log("  pnpm add -D cloudflared");
    console.log();
    process.exit(1);
  }

  log("ok", "✓ cloudflared found");

  // ── Step 2: Start cloudflared tunnel ────────────────────────────────────
  const tunnelArgs = ["cloudflared", "tunnel", "--url", `http://localhost:${PORT}`];

  log("info", `Starting Cloudflare Tunnel on port ${PORT}...`);
  const cloudflared = spawn("npx", tunnelArgs, {
    stdio: ["pipe", "pipe", "pipe"],
    cwd: ROOT,
    detached: false,
  });

  cloudflared.on("error", (err) => {
    log("err", `cloudflared error: ${err.message}`);
    process.exit(1);
  });

  cloudflared.on("close", (code) => {
    if (code && code !== 0) {
      log("err", `cloudflared exited with code ${code}`);
    }
  });

  // ── Step 3: Get tunnel URL ──────────────────────────────────────────────
  log("info", "Waiting for tunnel URL...");
  const tunnelUrl = await getTunnelUrl(cloudflared);

  if (!tunnelUrl) {
    log("err", "✗ Could not get tunnel URL after 30 seconds.");
    cloudflared.kill();
    process.exit(1);
  }

  console.log();
  log("ok", "╔══════════════════════════════════════════════════════════╗");
  log("ok", `║  🔗 HTTPS Tunnel:  ${tunnelUrl.padEnd(38)} ║`);
  log("ok", "╚══════════════════════════════════════════════════════════╝");
  console.log();

  // ── Step 4: Set DEVELOPMENT_URL on Convex ───────────────────────────────
  const convexTarget = getConvexTarget();
  const convexFlags = convexTarget
    ? { ...convexTarget, url: convexTarget.url ?? convexTarget.deployment }
    : null;
  if (convexFlags?.url) {
    log("ok", `✓ Using self-hosted Convex at: ${convexFlags.url}`);
  } else {
    log("warn", "⚠ Could not find Convex connection params.");
    log("info", "  Add CONVEX_DEPLOYMENT for Convex Cloud, or CONVEX_SELF_HOSTED_URL");
    log("info", "  and CONVEX_DEPLOY_KEY for your self-hosted Convex deployment.");
  }

  log("info", `Temporarily setting ${TUNNEL_URL_ENV} on your Convex deployment...`);
  log("info", "(The original production URL will be restored when the tunnel stops)\n");

  const previousSiteUrl = PRODUCTION_SITE_URL;
  let didSet = false;
  try {
    didSet = setTunnelSiteUrl(tunnelUrl);
  } catch (err) {
    log("err", `Could not update ${TUNNEL_URL_ENV}; the tunnel URL was not applied.`);
    log("err", `  ${err.stderr?.toString().trim() || err.message}`);
  }

  // ── Step 5: Print OAuth configuration instructions ──────────────────────
  console.log();
  log("info", "═══════════════════════════════════════════════════════════");
  log("info", "  📱  OAuth Provider Configuration");
  log("info", "═══════════════════════════════════════════════════════════");
  console.log();
  console.log("  OAuth redirect URIs do NOT need to change — they go through");
  console.log("  your Convex backend at: https://convex-site.stars.guide");
  console.log();
  console.log("  But you MUST add the tunnel URL to Google's Authorized");
  console.log("  JavaScript origins for One Tap / FedCM to work on mobile:");
  console.log();
  console.log(`  Google Cloud Console → Credentials → OAuth client →`);
  console.log(`    Authorized JavaScript origins: ${tunnelUrl}`);
  console.log();

  if (!didSet) {
    log("warn", "═══════════════════════════════════════════════════════════");
    log("warn", "  ⚠  Manual Step Required");
    log("warn", "═══════════════════════════════════════════════════════════");
    console.log();
    log("warn", `  The script couldn't set ${TUNNEL_URL_ENV} automatically.`);
    log("warn", "  OAuth redirects will go to the production URL instead of");
    log("warn", "  your tunnel. Please set it manually:");
    console.log();
    const cmd = convexCommandText(convexEnvArgs("set", TUNNEL_URL_ENV, tunnelUrl));
    log("info", `    ${cmd}`);
    console.log();
    log("warn", "  Don't forget to remove it when done:");
    const rmCmd = `Restore ${TUNNEL_URL_ENV} to https://stars.guide in your Convex dashboard`;
    log("info", `    ${rmCmd}`);
    console.log();
  }

  log("info", "═══════════════════════════════════════════════════════════");
  console.log();

  // ── Step 6: Start dev server or just keep tunnel alive ──────────────────
  const cleanup = () => {
    console.log();
    log("warn", "Cleaning up...");

    if (didSet) {
      log("info", `Restoring ${TUNNEL_URL_ENV} on the Convex deployment...`);
      restoreSiteUrl(previousSiteUrl);
    } else {
      log("info", "DEVELOPMENT_URL was not set automatically — if you set it");
      log("info", "manually, remember to remove it when done:");
      log("info", `  Restore ${TUNNEL_URL_ENV} to ${previousSiteUrl || "https://stars.guide"}.`);
    }

    cloudflared.kill();
    log("ok", "✓ Tunnel closed.");
    process.exit(0);
  };

  process.on("SIGINT", cleanup);
  process.on("SIGTERM", cleanup);

  if (mode === "tunnel") {
    log("ok", "Tunnel is active. Press Ctrl+C to stop and clean up.");
    log("info", "Next steps:");
    log("info", `  1. Add ${tunnelUrl} to Google OAuth Authorized JavaScript origins`);
    log("info", "  2. Start your dev server: pnpm dev");
    log("info", `  3. Open ${tunnelUrl} on your device`);
    // Keep the process alive
    await new Promise(() => {});
  } else {
    // Start Next.js dev server directly
    log("info", "Starting Next.js dev server...");
    console.log();
    // Turbopack currently stalls indefinitely while compiling App Router
    // routes in this workspace. Webpack is slower to start but reliably serves
    // both local requests and the Cloudflare quick tunnel.
    const nextDev = spawn("npx", ["next", "dev", "--webpack", "-p", PORT.toString()], {
      cwd: ROOT,
      stdio: "inherit",
      env: { ...process.env },
    });

    nextDev.on("close", (code) => {
      log("info", `Next.js dev server exited with code ${code}`);
      cleanup();
    });

    nextDev.on("error", (err) => {
      log("err", `Next.js dev server error: ${err.message}`);
      cleanup();
    });

    console.log();
    log("ok", "══════════════════════════════════════════════════════════");
    log("ok", "  🚀 Everything is running!");
    log("ok", "");
    log("ok", `  📱 Open on your device: ${tunnelUrl}`);
    log("ok", "");
    log("ok", "  Press Ctrl+C to stop and clean up");
    log("ok", "══════════════════════════════════════════════════════════");
    console.log();
  }
}

main().catch((err) => {
  log("err", `Fatal error: ${err.message}`);
  process.exit(1);
});
