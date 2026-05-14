#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";
import process from "node:process";
import { setTimeout as delay } from "node:timers/promises";
import { chromium } from "playwright";

const ROOT_DIR = process.cwd();
const BASE_URL = process.env.LOCKSTEP_BASE_URL || "http://localhost:5000";
const OUTPUT_DIR = path.join(ROOT_DIR, "release-artifacts", "play-screenshots", "phone", "control");
const START_TIMEOUT_MS = 60_000;
const POLL_INTERVAL_MS = 500;
const MOBILE_CSS_VIEWPORT = { width: 360, height: 640 };
const MOBILE_DPR = 3;

const SHOTS = [
  { file: "01-landing.png", route: "/" },
  { file: "02-capture.png", route: "/capture" },
  { file: "03-lock-in.png", route: "/lock-in" },
  { file: "04-dashboard.png", route: "/dashboard" },
  { file: "05-credits.png", route: "/credits" },
];

async function isServerReady(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 2_000);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      redirect: "follow",
    });
    return response.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

async function waitForServer(url, timeoutMs) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (await isServerReady(url)) return true;
    await delay(POLL_INTERVAL_MS);
  }
  return false;
}

async function ensureServer() {
  if (await isServerReady(BASE_URL)) {
    console.log(`♻️  Reusing existing server at ${BASE_URL}`);
    return { startedHere: false, proc: null };
  }

  console.log(`🚀 Starting dev server at ${BASE_URL}`);
  const proc = spawn("pnpm", ["dev"], {
    cwd: ROOT_DIR,
    env: process.env,
    stdio: ["ignore", "pipe", "pipe"],
  });

  proc.stdout.on("data", (chunk) => process.stdout.write(`[dev] ${chunk}`));
  proc.stderr.on("data", (chunk) => process.stderr.write(`[dev] ${chunk}`));

  const ready = await waitForServer(BASE_URL, START_TIMEOUT_MS);
  if (!ready) {
    proc.kill("SIGTERM");
    throw new Error(`Timed out waiting for dev server at ${BASE_URL}`);
  }

  return { startedHere: true, proc };
}

async function stopServer(proc) {
  if (!proc || proc.killed) return;
  proc.kill("SIGTERM");
  await delay(500);
  if (!proc.killed) proc.kill("SIGKILL");
}

async function captureScreenshots() {
  await fs.mkdir(OUTPUT_DIR, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: MOBILE_CSS_VIEWPORT,
    deviceScaleFactor: MOBILE_DPR,
  });

  await context.addInitScript(() => {
    localStorage.setItem("onboarding_completed_v1", "true");
    localStorage.setItem("passiveDetectionEnabled", "false");
  });

  const page = await context.newPage();

  try {
    for (const shot of SHOTS) {
      const url = `${BASE_URL}${shot.route}`;
      console.log(`📸 Capturing ${shot.file} (${url})`);
      await page.goto(url, { waitUntil: "networkidle", timeout: 30_000 });
      await page.waitForTimeout(800);

      const targetPath = path.join(OUTPUT_DIR, shot.file);
      await page.screenshot({ path: targetPath, fullPage: false });
    }
  } finally {
    await browser.close();
  }
}

async function main() {
  let server;

  try {
    server = await ensureServer();
    await captureScreenshots();

    console.log("\n✅ Play screenshots generated:");
    for (const shot of SHOTS) {
      console.log(`- ${path.join("release-artifacts/play-screenshots/phone/control", shot.file)}`);
    }
  } catch (error) {
    console.error(`\n❌ Screenshot setup failed: ${error.message}`);
    process.exitCode = 1;
  } finally {
    if (server?.startedHere) {
      await stopServer(server.proc);
    }
  }
}

await main();
