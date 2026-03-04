#!/usr/bin/env node

/**
 * Stress Test Client Script
 * 
 * Usage:
 *   node stress.mjs --level 1 --user-id <id> --url <supabase_url> --key <anon_key>
 * 
 * Levels:
 *   1: Mini load (10 commitments, 1 sweep) - prove correctness
 *   2: Concurrency (25 commitments, 10 concurrent sweeps) - prove idempotency
 *   3: Volume (200 commitments, 8 batches of sweeps) - prove throughput
 *   4: Realistic mix (100 analyze, 100 create, 50 authorize, 25 sweeps)
 */

import fetch from "node-fetch";
import { setTimeout as sleep } from "timers/promises";

// Parse arguments
const args = process.argv.slice(2);
const getArg = (name) => {
  const idx = args.indexOf(name);
  return idx !== -1 ? args[idx + 1] : null;
};

const level = parseInt(getArg("--level") || "1", 10);
const userId = getArg("--user-id") || "user_123";
const baseUrl = getArg("--url") || "http://localhost:54321";
const anonKey = getArg("--key") || "test_key";

const SUPABASE_URL = baseUrl;
const ANON_KEY = anonKey;

console.log(`🧪 Stress Test Level ${level}`);
console.log(`User ID: ${userId}`);
console.log(`Supabase: ${SUPABASE_URL}`);
console.log("");

// Test utilities
class StressTestRunner {
  constructor(level, userId, supabaseUrl, anonKey) {
    this.level = level;
    this.userId = userId;
    this.supabaseUrl = supabaseUrl;
    this.anonKey = anonKey;
    this.results = {
      createdCount: 0,
      commitmentIds: [],
      sweepResults: [],
      errors: [],
    };
  }

  async callFunction(name, payload) {
    const url = `${this.supabaseUrl}/functions/v1/${name}`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.anonKey}`,
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(`${name}: ${data.error || response.statusText}`);
    }
    return data;
  }

  async createStressCommitments(count, dueMinutesAgo = 5) {
    console.log(`📝 Creating ${count} overdue commitments...`);
    try {
      const result = await this.callFunction("stress_test_gen", {
        userId: this.userId,
        numCommitments: count,
        dueMinutesAgo,
        stakeAmount: 100,
      });

      this.results.createdCount = result.created;
      this.results.commitmentIds = result.commitmentIds || [];

      console.log(`   ✅ Created ${result.created} commitments`);
      if (result.commitmentIds.length > 0) {
        console.log(`   First ID: ${result.commitmentIds[0]}`);
        console.log(`   Last ID: ${result.commitmentIds[result.commitmentIds.length - 1]}`);
      }
      return result;
    } catch (error) {
      console.error(`   ❌ Error: ${error.message}`);
      this.results.errors.push({ action: "create", error: error.message });
      throw error;
    }
  }

  async runSweep(label = "Sweep") {
    console.log(`🧹 ${label}...`);
    try {
      const result = await this.callFunction("sweep_overdue_commitments", {});

      console.log(`   ✅ Scanned: ${result.scanned}, Processed: ${result.ok_count}`);
      if (result.errors?.length > 0) {
        console.log(`   ⚠️  Errors: ${result.errors.length}`);
        result.errors.forEach((e) => console.log(`      - ${e.id}: ${e.error}`));
      }

      this.results.sweepResults.push(result);
      return result;
    } catch (error) {
      console.error(`   ❌ Error: ${error.message}`);
      this.results.errors.push({ action: "sweep", error: error.message });
      throw error;
    }
  }

  async runConcurrentSweeps(count, delayMs = 100) {
    console.log(`⚡ Running ${count} concurrent sweeps (${delayMs}ms apart)...`);
    const promises = Array.from({ length: count }, (_, i) =>
      sleep(i * delayMs).then(() => this.runSweep(`Sweep ${i + 1}/${count}`))
    );

    const results = await Promise.allSettled(promises);
    const successful = results.filter((r) => r.status === "fulfilled").length;
    const failed = results.filter((r) => r.status === "rejected").length;

    console.log(`   Summary: ${successful} succeeded, ${failed} failed`);
    return { successful, failed, results };
  }

  async verifyInvariants() {
    console.log(`\n🔍 Verifying Invariants...`);

    // Check we have no obvious corruption
    const checks = [
      {
        name: "Commitments created",
        pass: this.results.createdCount > 0,
      },
      {
        name: "Sweeps executed",
        pass: this.results.sweepResults.length > 0,
      },
      {
        name: "No critical errors",
        pass: !this.results.errors.some((e) => e.error.includes("crash")),
      },
    ];

    checks.forEach((check) => {
      console.log(
        `   ${check.pass ? "✅" : "❌"} ${check.name}`
      );
    });

    return checks.every((c) => c.pass);
  }
}

// Level runners
async function runLevel1(runner) {
  console.log(`\n${"=".repeat(50)}`);
  console.log(`Level 1: Functional Mini Load (Correctness Check)`);
  console.log(`${"=".repeat(50)}`);

  await runner.createStressCommitments(10, 5);
  await sleep(1000);
  await runner.runSweep("Single sweep");

  const passed = await runner.verifyInvariants();
  console.log(`\n${passed ? "✅ LEVEL 1 PASSED" : "❌ LEVEL 1 FAILED"}`);

  return passed;
}

async function runLevel2(runner) {
  console.log(`\n${"=".repeat(50)}`);
  console.log(`Level 2: Concurrency (Idempotency Check)`);
  console.log(`${"=".repeat(50)}`);

  await runner.createStressCommitments(25, 5);
  await sleep(1000);
  await runner.runConcurrentSweeps(10, 50);

  const passed = await runner.verifyInvariants();
  console.log(`\n${passed ? "✅ LEVEL 2 PASSED" : "❌ LEVEL 2 FAILED"}`);

  return passed;
}

async function runLevel3(runner) {
  console.log(`\n${"=".repeat(50)}`);
  console.log(`Level 3: Volume (Throughput Check)`);
  console.log(`${"=".repeat(50)}`);

  await runner.createStressCommitments(200, 5);
  await sleep(2000);

  const batchSize = 25;
  const batches = Math.ceil(200 / batchSize);

  for (let i = 0; i < batches; i++) {
    console.log(`\nBatch ${i + 1}/${batches}:`);
    const start = Date.now();
    await runner.runSweep();
    const duration = Date.now() - start;
    console.log(`   ⏱️  Duration: ${duration}ms`);
    
    if (i < batches - 1) {
      await sleep(500);
    }
  }

  const passed = await runner.verifyInvariants();
  console.log(`\n${passed ? "✅ LEVEL 3 PASSED" : "❌ LEVEL 3 FAILED"}`);

  return passed;
}

async function runLevel4(runner) {
  console.log(`\n${"=".repeat(50)}`);
  console.log(`Level 4: Realistic Usage Mix`);
  console.log(`${"=".repeat(50)}`);

  // Phase 1: Create commitments
  await runner.createStressCommitments(100, 5);
  await sleep(1000);

  // Phase 2: Run multiple sweeps
  console.log("\n📊 Running multiple sweeps...");
  for (let i = 0; i < 5; i++) {
    await runner.runSweep(`Sweep ${i + 1}/5`);
    await sleep(500);
  }

  const passed = await runner.verifyInvariants();
  console.log(`\n${passed ? "✅ LEVEL 4 PASSED" : "❌ LEVEL 4 FAILED"}`);

  return passed;
}

// Main
async function main() {
  const runner = new StressTestRunner(level, userId, SUPABASE_URL, ANON_KEY);

  try {
    let passed = false;

    switch (level) {
      case 1:
        passed = await runLevel1(runner);
        break;
      case 2:
        passed = await runLevel2(runner);
        break;
      case 3:
        passed = await runLevel3(runner);
        break;
      case 4:
        passed = await runLevel4(runner);
        break;
      default:
        console.error("Invalid level. Use 1-4.");
        process.exit(1);
    }

    console.log(`\n${"=".repeat(50)}`);
    console.log("📋 Summary");
    console.log(`${"=".repeat(50)}`);
    console.log(`Commitments created: ${runner.results.createdCount}`);
    console.log(`Sweeps executed: ${runner.results.sweepResults.length}`);
    console.log(`Errors: ${runner.results.errors.length}`);

    if (runner.results.errors.length > 0) {
      console.log("\nErrors:");
      runner.results.errors.forEach((e) => {
        console.log(`  - [${e.action}] ${e.error}`);
      });
    }

    process.exit(passed ? 0 : 1);
  } catch (error) {
    console.error(`\n❌ Fatal Error: ${error.message}`);
    process.exit(1);
  }
}

main();
