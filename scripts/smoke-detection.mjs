#!/usr/bin/env node

import { spawn } from "node:child_process";
import process from "node:process";
import { setTimeout as delay } from "node:timers/promises";
import { chromium } from "playwright";

const ROOT_DIR = process.cwd();
const BASE_URL = process.env.LOCKSTEP_BASE_URL || "http://localhost:5000";
const START_TIMEOUT_MS = 60_000;
const POLL_INTERVAL_MS = 500;

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
    if (await isServerReady(url)) {
      return true;
    }

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

  proc.stdout.on("data", (chunk) => {
    process.stdout.write(`[dev] ${chunk}`);
  });

  proc.stderr.on("data", (chunk) => {
    process.stderr.write(`[dev] ${chunk}`);
  });

  const ready = await waitForServer(BASE_URL, START_TIMEOUT_MS);
  if (!ready) {
    proc.kill("SIGTERM");
    throw new Error(`Timed out waiting for dev server at ${BASE_URL}`);
  }

  return { startedHere: true, proc };
}

async function stopServer(proc) {
  if (!proc || proc.killed) {
    return;
  }

  proc.kill("SIGTERM");
  await delay(500);

  if (!proc.killed) {
    proc.kill("SIGKILL");
  }
}

async function runSanity(page) {
  const results = [];

  const pass = (name, detail = "") => results.push({ name, ok: true, detail });
  const fail = (name, detail = "") => results.push({ name, ok: false, detail });

  // Manual
  try {
    await page.getByRole("button", { name: "Manual", exact: true }).click();
    await page.getByPlaceholder(/e\.g\.,/i).fill("I need to finally call mom this weekend.");
    await page.getByRole("button", { name: /Capture Intent/i }).click();
    await page.waitForSelector("text=Captured:", { timeout: 7_000 });
    pass("Manual capture", "Captured alert appeared");
  } catch (e) {
    fail("Manual capture", e.message);
  }

  // Voice
  try {
    await page.getByRole("button", { name: "Voice", exact: true }).click();
    await page.getByRole("button", { name: /Start Voice Input/i }).click();
    await page.waitForSelector("text=Captured:", { timeout: 9_000 });
    pass("Voice capture", "Auto transcript captured");
  } catch (e) {
    fail("Voice capture", e.message);
  }

  // Quick capture (Message)
  try {
    await page.getByRole("button", { name: "Message", exact: true }).click();
    await page.getByPlaceholder(/e\.g\.,/i).fill("I should stop doom scrolling after 10pm.");
    await page.getByRole("button", { name: /Capture Intent/i }).click();
    await page.waitForSelector("text=Captured:", { timeout: 7_000 });
    pass("Quick capture", "Message source captured");
  } catch (e) {
    fail("Quick capture", e.message);
  }

  // Calendar
  try {
    await page.getByRole("button", { name: "Calendar", exact: true }).click();
    const syncEventsButton = page.getByRole("button", { name: "Sync Calendar Events", exact: true });
    const syncEventsCount = await syncEventsButton.count();

    if (syncEventsCount > 0) {
      await syncEventsButton.first().click();
    } else {
      await page.getByRole("button", { name: "Sync Calendar", exact: true }).click();
    }

    await page.waitForSelector("text=Synced", { timeout: 9_000 });
    pass("Calendar sync", "Sync success message appeared");
  } catch (e) {
    fail("Calendar sync", e.message);
  }

  return results;
}

async function main() {
  let server;

  try {
    server = await ensureServer();

    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const page = await context.newPage();

    await page.goto(BASE_URL, { waitUntil: "domcontentloaded" });
    await page.evaluate(() => {
      localStorage.setItem("onboarding_completed_v1", "true");
      localStorage.setItem("passiveDetectionEnabled", "false");
    });

    await page.goto(`${BASE_URL}/detection`, { waitUntil: "networkidle" });
    await page.waitForTimeout(800);

    const results = await runSanity(page);

    await browser.close();

    console.log("\nDetection smoke results:");
    for (const result of results) {
      console.log(`${result.ok ? "PASS" : "FAIL"} - ${result.name}${result.detail ? ` :: ${result.detail}` : ""}`);
    }

    const failed = results.filter((result) => !result.ok);
    if (failed.length > 0) {
      throw new Error(`${failed.length} detection mode check(s) failed`);
    }

    console.log("\n🎉 Detection smoke test passed");
  } catch (error) {
    console.error(`\n❌ Detection smoke test failed: ${error.message}`);
    process.exitCode = 1;
  } finally {
    if (server?.startedHere) {
      await stopServer(server.proc);
    }
  }
}

await main();
