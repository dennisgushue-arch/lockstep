#!/usr/bin/env node

/**
 * Test script to verify all routes and pages render correctly.
 * Automatically starts and stops a dev server if one isn't already running.
 */

import http from 'node:http';
import https from 'node:https';
import { spawn } from 'node:child_process';

const PORT = 5000;
const BASE_URL = `http://localhost:${PORT}`;
const SERVER_READY_TIMEOUT_MS = 30_000;
const SERVER_POLL_INTERVAL_MS = 300;

/** Returns true if something is already listening on PORT */
function isServerRunning() {
  return new Promise((resolve) => {
    http
      .get(BASE_URL, () => resolve(true))
      .on('error', () => resolve(false));
  });
}

/** Polls until the server responds or times out */
function waitForServer(timeoutMs = SERVER_READY_TIMEOUT_MS) {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const interval = setInterval(async () => {
      const up = await isServerRunning();
      if (up) {
        clearInterval(interval);
        resolve();
      } else if (Date.now() - start > timeoutMs) {
        clearInterval(interval);
        reject(new Error(`Server did not start within ${timeoutMs}ms`));
      }
    }, SERVER_POLL_INTERVAL_MS);
  });
}

const routes = [
  '/',
  '/auth',
  '/dashboard',
  '/capture',
  '/detection',
  '/reflection',
  '/lock-in',
  '/credits',
  '/stakes',
  '/settings',
  '/voice-notes',
  '/history',
  '/connected-sources',
  '/recommendations',
  '/journal',
  '/missed',
  '/admin',
  '/test-intent',
  '/debug',
  '/stake-test',
  '/not-found-test-404',
];

async function testRoute(url) {
  return new Promise((resolve) => {
    const fullUrl = new URL(url, BASE_URL);
    const protocol = fullUrl.protocol === 'https:' ? https : http;

    protocol
      .get(fullUrl, (res) => {
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });
        res.on('end', () => {
          // Check if HTML was returned and doesn't contain error indicators
          const hasError =
            data.includes('Cannot GET') ||
            data.includes('404') ||
            data.includes('[ERR_MODULE_NOT_FOUND]');

          resolve({
            url,
            status: res.statusCode,
            contentType: res.headers['content-type'],
            hasError: hasError || res.statusCode >= 400,
            success: res.statusCode === 200 && !hasError,
            length: data.length,
          });
        });
      })
      .on('error', (err) => {
        resolve({
          url,
          status: -1,
          error: err.message,
          success: false,
        });
      });
  });
}

async function runTests() {
  // --- Server lifecycle ---
  let serverProc = null;
  const alreadyRunning = await isServerRunning();

  if (!alreadyRunning) {
    console.log(`⚡ No server on port ${PORT} — starting dev server…\n`);
    serverProc = spawn(
      'pnpm',
      ['vite', '--config', 'vite.config.ts', '--host', '0.0.0.0', '--port', String(PORT)],
      { stdio: 'ignore', detached: false }
    );
    serverProc.on('error', (err) => {
      console.error('Failed to start dev server:', err.message);
      process.exit(1);
    });
    try {
      await waitForServer();
      console.log(`✅ Dev server ready at ${BASE_URL}\n`);
    } catch (err) {
      console.error(err.message);
      serverProc.kill();
      process.exit(1);
    }
  } else {
    console.log(`✅ Using existing server at ${BASE_URL}\n`);
  }

  const stopServer = () => {
    if (serverProc) {
      serverProc.kill();
      serverProc = null;
    }
  };

  // Ensure server is cleaned up on unhandled exits
  process.on('exit', stopServer);
  process.on('SIGINT', () => { stopServer(); process.exit(130); });
  process.on('SIGTERM', () => { stopServer(); process.exit(143); });

  // --- Route checks ---
  console.log('🧪 Testing Lockstep App Routes\n');
  console.log(`Base URL: ${BASE_URL}\n`);

  const results = [];
  let passed = 0;
  let failed = 0;

  for (const route of routes) {
    const result = await testRoute(route);
    results.push(result);

    if (result.success) {
      console.log(`✅ ${result.url.padEnd(25)} - ${result.status} OK`);
      passed++;
    } else {
      console.log(
        `❌ ${result.url.padEnd(25)} - ${result.status || 'ERROR'} ${result.error || ''}`
      );
      failed++;
    }
  }

  console.log(`\n📊 Summary: ${passed}/${routes.length} routes working\n`);

  if (failed > 0) {
    console.log('⚠️  Failed routes:');
    results.filter(r => !r.success).forEach(r => {
      console.log(`  - ${r.url}`);
    });
  }

  stopServer();
  process.exit(failed === 0 ? 0 : 1);
}

await runTests();
