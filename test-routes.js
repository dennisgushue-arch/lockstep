#!/usr/bin/env node

/**
 * Test script to verify all routes and pages render correctly
 */

import http from 'node:http';
import https from 'node:https';

const BASE_URL = 'http://localhost:5000';

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

  process.exit(failed === 0 ? 0 : 1);
}

await runTests();
