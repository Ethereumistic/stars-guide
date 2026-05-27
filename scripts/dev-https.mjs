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

import { execSync, spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createInterface } from "node:readline";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

// ── Configuration ────────────────────────────────────────────────────────
const PORT = parseInt(process.env.PORT || "3001", 10);

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
    return `npx convex env ${subcmd} --url "${flags.url}" --admin-key "${flags.adminKey}"`;
  }
  const isProd = isProdDeployment();
  return `npx convex env ${subcmd}${isProd ? " --prod" : ""}`;
}

/**
 * Detect whether the project uses a production Convex deployment.
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
