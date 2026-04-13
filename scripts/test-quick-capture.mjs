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

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function runQuickCaptureSmokeTest() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();

  await context.addInitScript(() => {
    localStorage.clear();
    localStorage.setItem("onboarding_completed_v1", "true");
  });

  const page = await context.newPage();

  try {
    console.log("🧪 Opening /detection directly on a cold load...");
    await page.goto(`${BASE_URL}/detection`, {
      waitUntil: "domcontentloaded",
      timeout: 30_000,
    });

    await page.getByText(/Quick Capture/i).first().waitFor({ timeout: 10_000 });
    assert(page.url().endsWith("/detection"), `Expected to stay on /detection, got ${page.url()}`);
    console.log("✅ Direct cold-load stays on /detection");

    const manualButton = page.getByRole("button", { name: /^Manual$/i });
    const voiceButton = page.getByRole("button", { name: /^Voice$/i });
    const messageButton = page.getByRole("button", { name: /^Message$/i });
    const journalButton = page.getByRole("button", { name: /^Journal$/i });
    const calendarButton = page.getByRole("button", { name: /^Calendar$/i });
    const voiceInputButton = page.getByRole("button", { name: /Start Voice Input/i });
    const captureButton = page.getByRole("button", { name: /Capture Intent/i });
    const textarea = page.getByPlaceholder(/I really need to start going to the gym/i);

    await manualButton.click();
    await textarea.waitFor({ timeout: 5_000 });
    console.log("✅ Manual mode shows the textarea");

    await messageButton.click();
    await textarea.fill("I should really call mom this weekend");
    await captureButton.click();
    await page.getByText(/Captured:/i).waitFor({ timeout: 10_000 });
    console.log("✅ Message capture works");

    await journalButton.click();
    await textarea.fill("I need to journal more consistently");
    await captureButton.click();
    await page.getByText(/Captured:/i).waitFor({ timeout: 10_000 });
    console.log("✅ Journal capture works");

    await voiceButton.click();
    await voiceInputButton.click();
    await page.waitForFunction(() => {
      const element = document.querySelector("textarea");
      return !!element && "value" in element && element.value.includes("start working out consistently");
    }, { timeout: 6_000 });
    await captureButton.click();
    await page.getByText(/Captured:/i).waitFor({ timeout: 10_000 });
    console.log("✅ Voice capture works");

    await calendarButton.click();
    await page.getByRole("button", { name: /Sync Calendar Events/i }).waitFor({ timeout: 5_000 });
    assert((await page.locator("textarea").count()) === 0, "Expected textarea to be hidden in calendar mode");
    await page.getByRole("button", { name: /Sync Calendar Events/i }).click();
    await page.getByText(/Synced .* calendar signal/i).waitFor({ timeout: 10_000 });
    console.log("✅ Calendar sync works");

    await page.getByText(/Recent Signal History/i).waitFor({ timeout: 10_000 });
    console.log("✅ Recent signal history renders after captures");
  } finally {
    await browser.close();
  }
}

async function main() {
  let server;

  try {
    server = await ensureServer();
    await runQuickCaptureSmokeTest();
    console.log("\n🎉 Quick capture smoke test passed");
  } catch (error) {
    console.error(`\n❌ Quick capture smoke test failed: ${error.message}`);
    process.exitCode = 1;
  } finally {
    if (server?.startedHere) {
      await stopServer(server.proc);
    }
  }
}

await main();
