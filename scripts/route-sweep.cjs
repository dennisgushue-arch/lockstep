const fs = require("fs");
const { chromium } = require("playwright");

const BASE_URL = process.env.BASE_URL || "http://localhost:5000";

const routes = [
	"/",
	"/auth",
	"/dashboard",
	"/capture",
	"/detection",
	"/reflection",
	"/lock-in",
	"/credits",
	"/stakes",
	"/settings",
	"/voice-notes",
	"/history",
	"/connected-sources",
	"/recommendations",
	"/journal",
	"/missed",
	"/test-intent",
	"/debug",
	"/stake-test",
	"/admin",
];

async function runSweep() {
	const browser = await chromium.launch({ headless: true });
	const context = await browser.newContext();
	const page = await context.newPage();

	const results = [];

	for (const route of routes) {
		const url = `${BASE_URL}${route}`;
		const consoleErrors = [];
		const pageErrors = [];
		const requestFailures = [];

		const onConsole = (msg) => {
			if (msg.type() === "error") {
				consoleErrors.push(msg.text());
			}
		};

		const onPageError = (error) => {
			pageErrors.push(error.message);
		};

		const onRequestFailed = (request) => {
			requestFailures.push({
				url: request.url(),
				method: request.method(),
				errorText: request.failure()?.errorText || "unknown",
			});
		};

		page.on("console", onConsole);
		page.on("pageerror", onPageError);
		page.on("requestfailed", onRequestFailed);

		let status = null;
		let navigationError = null;

		try {
			const response = await page.goto(url, {
				waitUntil: "networkidle",
				timeout: 30_000,
			});
			status = response?.status() ?? null;
			await page.waitForTimeout(500);
		} catch (error) {
			navigationError = error instanceof Error ? error.message : String(error);
		}

		page.off("console", onConsole);
		page.off("pageerror", onPageError);
		page.off("requestfailed", onRequestFailed);

		const hasIssue =
			!!navigationError ||
			(status !== null && status >= 400) ||
			consoleErrors.length > 0 ||
			pageErrors.length > 0 ||
			requestFailures.length > 0;

		results.push({
			route,
			url,
			status,
			pass: !hasIssue,
			navigationError,
			consoleErrors,
			pageErrors,
			requestFailures,
		});
	}

	await browser.close();

	const report = {
		baseUrl: BASE_URL,
		routesTested: routes.length,
		routesPassed: results.filter((r) => r.pass).length,
		routesFailed: results.filter((r) => !r.pass).length,
		results,
	};

	fs.writeFileSync("/tmp/route-sweep-report.json", JSON.stringify(report, null, 2));

	console.log(`base_url=${report.baseUrl}`);
	console.log(`routes_tested=${report.routesTested}`);
	console.log(`routes_passed=${report.routesPassed}`);
	console.log(`routes_failed=${report.routesFailed}`);

	for (const result of results) {
		console.log(`${result.pass ? "PASS" : "FAIL"} ${result.route} status=${result.status ?? "NA"}`);
	}
}

runSweep().catch((error) => {
	console.error("route sweep failed", error);
	process.exit(1);
});
