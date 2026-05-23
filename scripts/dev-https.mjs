#!/usr/bin/env node
/**
 * dev-https.mjs — Start a HTTPS development tunnel for mobile debugging.
 *
 * This script creates an ngrok tunnel to your local Next.js dev server
 * and sets the DEVELOPMENT_URL env var on your Convex deployment so
 * OAuth redirects work correctly when testing on real devices (iPhone, etc).
 *
 * Usage:
 *   pnpm dev:https              # Start tunnel + dev server + auto-configure Convex
 *   pnpm dev:https:tunnel       # Start just the tunnel (no dev server)
 *
 * Prerequisites:
 *   1. Install ngrok:  https://ngrok.com/download
 *      Or via brew:     brew install ngrok
 *      Or via snap:     snap install ngrok
 *
 *   2. Sign up / configure ngrok (free tier works):
 *      ngrok config add-authtoken <YOUR_TOKEN>
 *
 *   3. (Optional) Reserve a free static domain at https://dashboard.ngrok.com/domains
 *      and set NGROK_DOMAIN in your .env.local for a persistent URL.
 *
 * OAuth provider configuration:
 *   The OAuth redirect URIs go through your Convex backend, so they DON'T
 *   need to change. But Google One Tap requires the ngrok URL to be in the
 *   "Authorized JavaScript origins" list:
 *
 *   Google Cloud Console → APIs & Services → Credentials → Your OAuth client
 *     → Authorized JavaScript origins: add https://<your-ngrok-url>
 */

import { execSync, spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

// ── Configuration ────────────────────────────────────────────────────────
const PORT = parseInt(process.env.PORT || "3000", 10);
const NGROK_DOMAIN = process.env.NGROK_DOMAIN || ""; // e.g. "my-dev.ngrok-free.app"

// ── Helpers ──────────────────────────────────────────────────────────────

function log(level, msg) {
  const colors = { info: "\x1b[36m", ok: "\x1b[32m", warn: "\x1b[33m", err: "\x1b[31m" };
  const reset = "\x1b[0m";
  const c = colors[level] || "";
  console.log(`${c}${msg}${reset}`);
}

function checkNgrok() {
  try {
    execSync("ngrok version", { stdio: "pipe" });
    return true;
  } catch {
    return false;
  }
}

/**
 * Parse Convex connection params (url + admin-key) from the project.
 *
 * Priority:
 *  1. CONVEX_SELF_HOSTED_URL + CONVEX_DEPLOY_KEY env vars
 *  2. .env.convex.commands reference file
 *  3. .env.local (CONVEX_DEPLOY_KEY env var)
 */
function getConvexFlags() {
  // Check env vars first (fastest path)
  const envUrl = process.env.CONVEX_SELF_HOSTED_URL;
  const envKey = process.env.CONVEX_DEPLOY_KEY;
  if (envUrl && envKey) {
    return { url: envUrl, adminKey: envKey };
  }

  // Read from .env.local for env vars
  try {
    const envLocal = fs.readFileSync(path.join(ROOT, ".env.local"), "utf-8");
    const parsed = {};
    for (const line of envLocal.split("\n")) {
      const trimmed = line.trim();
      if (trimmed.startsWith("#") || !trimmed.includes("=")) continue;
      const match = trimmed.match(/^([A-Z_]+)\s*=\s*(.+)$/);
      if (match) parsed[match[1]] = match[2].trim();
    }
    const url = parsed.CONVEX_SELF_HOSTED_URL;
    const key = parsed.CONVEX_DEPLOY_KEY;
    if (url && key) return { url, adminKey: key };
  } catch { /* fall through */ }

  // Parse the reference file that the project set up
  try {
    const cmdFile = fs.readFileSync(
      path.join(ROOT, ".env.convex.commands"),
      "utf-8",
    );
    // Extract --url and --admin-key from the file
    const urlMatch = cmdFile.match(/--url\s+(\S+)/);
    const keyMatch = cmdFile.match(/--admin-key\s+("([^"]+)"|(\S+))/);
    if (urlMatch && keyMatch) {
      return {
        url: urlMatch[1],
        adminKey: keyMatch[2] || keyMatch[3],
      };
    }
  } catch { /* fall through */ }

  return null;
}

/**
 * Build the full `npx convex env <subcmd>` string with the right flags.
 */
function convexEnvCmd(subcmd) {
  const flags = getConvexFlags();
  if (flags) {
    // Self-hosted Convex — use --url and --admin-key
    return `npx convex env ${subcmd} --url "${flags.url}" --admin-key "${flags.adminKey}"`;
  }
  // Cloud Convex — try --prod or --deployment flags
  const isProd = isProdDeployment();
  return `npx convex env ${subcmd}${isProd ? " --prod" : ""}`;
}

/**
 * Detect whether the project uses a production Convex deployment.
 * If NEXT_PUBLIC_CONVEX_URL points to a localhost address, it's local;
 * otherwise it's production (or a preview/self-hosted deployment).
 */
function isProdDeployment() {
  try {
    const envLocal = fs.readFileSync(path.join(ROOT, ".env.local"), "utf-8");
    const lines = envLocal.split("\n");
    let convexUrl = "";
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith("#")) continue;
      const match = trimmed.match(/^NEXT_PUBLIC_CONVEX_URL\s*=\s*(.+)$/);
      if (match) convexUrl = match[1].trim();
    }
    if (!convexUrl) return false;
    return !convexUrl.includes("127.0.0.1") && !convexUrl.includes("localhost");
  } catch {
    return false;
  }
}

/**
 * Wait for ngrok's API to return a tunnel URL.
 * Retries every 500ms for up to 15 seconds.
 */
async function getTunnelUrl() {
  for (let i = 0; i < 30; i++) {
    try {
      const res = await fetch("http://127.0.0.1:4040/api/tunnels");
      const data = await res.json();
      const tunnel = data.tunnels?.find((t) => t.proto === "https");
      if (tunnel?.public_url) return tunnel.public_url;
    } catch {
      // ngrok API not ready yet
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  return null;
}

/**
 * Set DEVELOPMENT_URL on the Convex deployment.
 */
function setDevUrl(url) {
  const cmd = convexEnvCmd(`set DEVELOPMENT_URL "${url}"`);
  try {
    execSync(cmd, { stdio: "pipe", cwd: ROOT });
    log("ok", `✓ Convex DEVELOPMENT_URL set to: ${url}`);
    return true;
  } catch (err) {
    log("err", "✗ Failed to set DEVELOPMENT_URL");
    log("err", `  ${err.stderr?.toString().split("\n")[0] || err.message}`);
    log("info", "");
    log("warn", "  Run manually:");
    log("info", `    ${cmd}`);
    log("info", "");
    log("warn", "  Or set it via the Convex dashboard if the CLI doesn't connect.");
    return false;
  }
}

/**
 * Remove DEVELOPMENT_URL from the Convex deployment.
 */
function removeDevUrl() {
  const cmd = convexEnvCmd("rm DEVELOPMENT_URL");
  try {
    execSync(cmd, { stdio: "pipe", cwd: ROOT });
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

  // ── Step 1: Check ngrok ──────────────────────────────────────────────────
  if (!checkNgrok()) {
    log("err", "✗ ngrok is not installed!");
    console.log();
    log("info", "Install ngrok to create an HTTPS tunnel:");
    console.log();
    console.log("  macOS:  brew install ngrok");
    console.log("  Linux:  snap install ngrok");
    console.log("  Or download from: https://ngrok.com/download");
    console.log();
    console.log("Then configure your auth token:");
    console.log("  ngrok config add-authtoken <YOUR_TOKEN>");
    console.log();
    log("info", "Free accounts get 1 static domain — perfect for dev!");
    process.exit(1);
  }

  log("ok", "✓ ngrok found");

  // ── Step 2: Start ngrok tunnel ──────────────────────────────────────────
  const ngrokArgs = ["http", PORT.toString()];
  if (NGROK_DOMAIN) {
    ngrokArgs.push(`--domain=${NGROK_DOMAIN}`);
  }

  log("info", `Starting ngrok tunnel on port ${PORT}...`);
  const ngrok = spawn("ngrok", ngrokArgs, {
    stdio: "pipe",
    detached: false,
  });

  // Handle ngrok exit
  ngrok.on("error", (err) => {
    log("err", `ngrok error: ${err.message}`);
    process.exit(1);
  });

  ngrok.on("close", (code) => {
    if (code && code !== 0) {
      log("err", `ngrok exited with code ${code}`);
    }
  });

  // ── Step 3: Get tunnel URL ──────────────────────────────────────────────
  log("info", "Waiting for tunnel URL...");
  const tunnelUrl = await getTunnelUrl();

  if (!tunnelUrl) {
    log("err", "✗ Could not get ngrok tunnel URL after 15 seconds.");
    log("info", "  Make sure ngrok is configured: ngrok config add-authtoken <TOKEN>");
    ngrok.kill();
    process.exit(1);
  }

  console.log();
  log("ok", "╔══════════════════════════════════════════════════════════╗");
  log("ok", `║  🔗 HTTPS Tunnel:  ${tunnelUrl.padEnd(38)} ║`);
  log("ok", "╚══════════════════════════════════════════════════════════╝");
  console.log();

  // ── Step 4: Set DEVELOPMENT_URL on Convex ───────────────────────────────
  const convexFlags = getConvexFlags();
  if (convexFlags) {
    log("ok", `✓ Using self-hosted Convex at: ${convexFlags.url}`);
  } else {
    log("warn", "⚠ Could not find Convex connection params.");
    log("info", "  The script will try `npx convex env` with --prod.");
    log("info", "  If that fails, set DEVELOPMENT_URL manually (see below).");
  }

  log("info", "Setting DEVELOPMENT_URL on your Convex deployment...");
  log("info", "(This tells Convex Auth to redirect OAuth callbacks to your tunnel)\n");

  const didSet = setDevUrl(tunnelUrl);

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
    log("warn", "  The script couldn't set DEVELOPMENT_URL automatically.");
    log("warn", "  OAuth redirects will go to the production URL instead of");
    log("warn", "  your tunnel. Please set it manually:");
    console.log();
    const cmd = convexFlags
      ? `npx convex env set DEVELOPMENT_URL "${tunnelUrl}" --url "${convexFlags.url}" --admin-key "${convexFlags.adminKey}"`
      : `npx convex env set DEVELOPMENT_URL "${tunnelUrl}" --prod`;
    log("info", `    ${cmd}`);
    console.log();
    log("warn", "  Don't forget to remove it when done:");
    const rmCmd = convexFlags
      ? `npx convex env rm DEVELOPMENT_URL --url "${convexFlags.url}" --admin-key "${convexFlags.adminKey}"`
      : `npx convex env rm DEVELOPMENT_URL --prod`;
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
      log("info", "Removing DEVELOPMENT_URL from Convex deployment...");
      removeDevUrl();
    } else {
      log("info", "DEVELOPMENT_URL was not set automatically — if you set it");
      log("info", "manually, remember to remove it when done:");
      if (convexFlags) {
        log("info", `  npx convex env rm DEVELOPMENT_URL --url "${convexFlags.url}" --admin-key "${convexFlags.adminKey}"`);
      } else {
        log("info", "  npx convex env rm DEVELOPMENT_URL --prod");
      }
    }

    ngrok.kill();
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
    const nextDev = spawn("npx", ["next", "dev", "-p", PORT.toString()], {
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