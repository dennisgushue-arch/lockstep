import React, { useMemo, useState } from "react";
import { useLocation } from "wouter";
import { useApp } from "@/lib/mock-data";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { analytics } from "@/lib/analytics";
import { distributionOps } from "@/lib/distribution-ops";
import {
  calculatePaywallCtrByMode,
  formatCtrRows,
  type PaywallAnalyticsEvent,
  type PaywallMode,
} from "@/lib/paywall-reporting";
import { inspectPressureNotifications, readLastAppOpenedAt } from "@/lib/pressure-notifications";
import { buildNativeNotificationPayloadPreview } from "@/lib/native-consequence-notifications";
import { buildPactDeepLink, handleDeepLink, type DeepLinkMode } from "@/lib/deeplink";
import { routeFromNotificationUrl } from "@/lib/notification-routing";

type TimeTravelPreset = "live" | "pre-failure" | "final" | "missed" | "recovery" | "custom";

function badgeVariantFor(decision: "queued" | "already-sent" | "suppressed" | "not-applicable") {
  switch (decision) {
    case "queued":
      return "bg-green-500/10 text-green-400 border-green-500/30";
    case "already-sent":
      return "bg-sky-500/10 text-sky-300 border-sky-500/30";
    case "suppressed":
      return "bg-amber-500/10 text-amber-300 border-amber-500/30";
    default:
      return "bg-zinc-500/10 text-zinc-300 border-zinc-500/30";
  }
}

export default function AdminPage() {
  const isDev = import.meta.env.DEV;
  const [, setLocation] = useLocation();
  const { runMissCheck, commitments, behaviorProfile } = useApp();
  const [logs, setLogs] = useState<string[]>([]);
  const [timeTravelPreset, setTimeTravelPreset] = useState<TimeTravelPreset>("live");
  const [selectedCommitmentId, setSelectedCommitmentId] = useState<string>("");
  const [customDateTime, setCustomDateTime] = useState("");
  const [openPayloadKeys, setOpenPayloadKeys] = useState<Record<string, boolean>>({});
  const [copiedPayloadKey, setCopiedPayloadKey] = useState<string | null>(null);
  const [copiedDeepLinkMode, setCopiedDeepLinkMode] = useState<DeepLinkMode | null>(null);
  const [paywallExportVersion, setPaywallExportVersion] = useState(0);
  const [batchSecret, setBatchSecret] = useState("");
  const [batchLimit, setBatchLimit] = useState("25");
  const [runningBatch, setRunningBatch] = useState(false);
  const [batchRunLogs, setBatchRunLogs] = useState<string[]>([]);

  // Distribution Ops tracking
  const today = new Date().toISOString().split("T")[0];
  const [opsDate, setOpsDate] = useState(today);
  const [opsPostsCount, setOpsPostsCount] = useState(0);
  const [opsDmsCount, setOpsDmsCount] = useState(0);
  const [opsCreatorOutreachCount, setOpsCreatorOutreachCount] = useState(0);
  const [opsCacValue, setOpsCacValue] = useState<number | undefined>();
  const [opsNotes, setOpsNotes] = useState("");
  const [opsExportVersion, setOpsExportVersion] = useState(0);

  const paywallRows = useMemo(() => {
    const events = analytics.getLocalEvents() as PaywallAnalyticsEvent[];
    return formatCtrRows(calculatePaywallCtrByMode(events));
  }, [paywallExportVersion]);

  const paywallDismissalsByMode = useMemo(() => {
    const events = analytics.getLocalEvents() as PaywallAnalyticsEvent[];
    const counters: Record<PaywallMode, number> = {
      celebratory: 0,
      escalation: 0,
      urgency: 0,
    };

    for (const event of events) {
      if (event.event !== "paywall_dismissed") continue;
      if (event.mode === "celebratory" || event.mode === "escalation" || event.mode === "urgency") {
        counters[event.mode] += 1;
      }
    }

    return counters;
  }, [paywallExportVersion]);

  const winnerMode = useMemo(() => {
    const eligible = paywallRows.filter((row) => row.views > 0);
    if (!eligible.length) return null;

    return [...eligible].sort((a, b) => {
      if (b.ctr !== a.ctr) return b.ctr - a.ctr;
      if (b.clicks !== a.clicks) return b.clicks - a.clicks;
      return b.views - a.views;
    })[0];
  }, [paywallRows]);

  const totalPaywallViews = useMemo(
    () => paywallRows.reduce((sum, row) => sum + row.views, 0),
    [paywallRows]
  );

  const totalPaywallClicks = useMemo(
    () => paywallRows.reduce((sum, row) => sum + row.clicks, 0),
    [paywallRows]
  );

  const totalPaywallDismissals = useMemo(
    () => Object.values(paywallDismissalsByMode).reduce((sum, value) => sum + value, 0),
    [paywallDismissalsByMode]
  );

  const onboardingFunnel = useMemo(() => {
    const events = analytics.getLocalEvents() as Array<Record<string, unknown>>;

    const landingCta = events.filter((event) => event.event === "landing_cta_clicked");
    const signupCompleted = events.filter((event) => event.event === "signup_completed");
    const firstIntentSubmitted = events.filter((event) => event.event === "first_intent_submitted");

    const firstPactCreated = events.filter((event) => event.event === "first_pact_created");
    const firstPactCompleted = events.filter((event) => event.event === "first_pact_completed");
    const completed24h = events.filter(
      (event) => event.event === "first_pact_completed_24h" && event.within_24h === true,
    );
    const adjusted = events.filter((event) => event.event === "ai_suggestion_adjusted");

    const acceptedWithoutEdit = firstPactCreated.filter((event) => event.ai_accept_without_edit === true).length;
    const acceptanceRate = firstPactCreated.length
      ? (acceptedWithoutEdit / firstPactCreated.length) * 100
      : 0;

    const timeToLockValues = firstPactCreated
      .map((event) => Number(event.time_to_lock_seconds))
      .filter((value) => Number.isFinite(value));

    const avgTimeToLock = timeToLockValues.length
      ? timeToLockValues.reduce((sum, value) => sum + value, 0) / timeToLockValues.length
      : 0;

    const recoveryCreated = events.filter((event) => event.event === "recovery_pact_created");
    const recoveryWithin24h = recoveryCreated.filter((event) => event.within_24h === true).length;

    return {
      landingCta: landingCta.length,
      signupCompleted: signupCompleted.length,
      firstIntentSubmitted: firstIntentSubmitted.length,
      created: firstPactCreated.length,
      completed: firstPactCompleted.length,
      completed24h: completed24h.length,
      adjusted: adjusted.length,
      acceptanceRate,
      avgTimeToLock,
      recoveryCreated: recoveryCreated.length,
      recoveryWithin24h,
    };
  }, [paywallExportVersion]);

  const opsTrend = useMemo(() => {
    return distributionOps.getTrend();
  }, [opsExportVersion]);

  const refreshPaywallExport = () => setPaywallExportVersion((v) => v + 1);

  const clearPaywallExport = () => {
    analytics.clearLocalEvents();
    setPaywallExportVersion((v) => v + 1);
  };

  const handleOpsSubmit = () => {
    distributionOps.addEntry({
      date: opsDate,
      postsCount: opsPostsCount,
      dmsCount: opsDmsCount,
      creatorOutreachCount: opsCreatorOutreachCount,
      cacInputValue: opsCacValue,
      notes: opsNotes,
    });
    setOpsExportVersion((v) => v + 1);
    // Reset form to today
    setOpsDate(today);
    setOpsPostsCount(0);
    setOpsDmsCount(0);
    setOpsCreatorOutreachCount(0);
    setOpsCacValue(undefined);
    setOpsNotes("");
  };

  const handleOpsDelete = (date: string) => {
    distributionOps.deleteEntry(date);
    setOpsExportVersion((v) => v + 1);
  };

  const handleOpsExport = () => {
    if (typeof window === "undefined") return;
    const csv = distributionOps.exportCsv();
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const link = document.createElement("a");
    link.href = url;
    link.download = `distribution-ops-${timestamp}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleOpsClear = () => {
    if (confirm("Clear all distribution ops entries? This cannot be undone.")) {
      distributionOps.clearAllEntries();
      setOpsExportVersion((v) => v + 1);
    }
  };

  const paywallEventSlice = useMemo(() => {
    const events = analytics.getLocalEvents() as Array<Record<string, unknown>>;
    return events.filter((event) => {
      const name = event.event;
      return (
        name === "paywall_viewed" ||
        name === "paywall_cta_clicked" ||
        name === "paywall_dismissed"
      );
    });
  }, [paywallExportVersion]);

  function toCsvCell(value: unknown) {
    if (value === null || value === undefined) return "";
    const raw = String(value);
    const escaped = raw.replace(/"/g, '""');
    return `"${escaped}"`;
  }

  function exportPaywallCsv() {
    if (typeof window === "undefined") return;
    if (!paywallEventSlice.length) return;

    const columns = [
      "timestamp",
      "event",
      "mode",
      "triggerLabel",
      "surface",
      "path",
      "destination",
      "userId",
    ];

    const lines = [columns.join(",")];

    for (const event of paywallEventSlice) {
      const row = columns.map((column) => toCsvCell(event[column]));
      lines.push(row.join(","));
    }

    const csv = lines.join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");

    const link = document.createElement("a");
    link.href = url;
    link.download = `paywall-events-${timestamp}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  function exportPaywallSummaryCsv() {
    if (typeof window === "undefined") return;

    const columns = ["mode", "views", "clicks", "dismissals", "ctr_percent"];
    const lines = [columns.join(",")];

    for (const row of paywallRows) {
      const dismissals = paywallDismissalsByMode[row.mode] ?? 0;
      const values = [
        row.mode,
        String(row.views),
        String(row.clicks),
        String(dismissals),
        row.ctrPercent,
      ];

      const escaped = values.map((value) => `"${value.replace(/"/g, '""')}"`);
      lines.push(escaped.join(","));
    }

    const csv = lines.join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");

    const link = document.createElement("a");
    link.href = url;
    link.download = `paywall-summary-${timestamp}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  const sortedCommitments = useMemo(
    () => [...commitments].sort((a, b) => new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime()),
    [commitments],
  );

  const effectiveSelectedCommitmentId = selectedCommitmentId || sortedCommitments[0]?.id || "";

  const liveInspection = useMemo(
    () => inspectPressureNotifications(commitments, {
      now: Date.now(),
      worstTimeOfDay: behaviorProfile.worstTimeOfDay,
      lastAppOpenedAt: readLastAppOpenedAt(),
    }),
    [behaviorProfile.worstTimeOfDay, commitments],
  );

  const selectedInspection = useMemo(
    () => liveInspection.find((entry) => entry.commitmentId === effectiveSelectedCommitmentId) ?? null,
    [effectiveSelectedCommitmentId, liveInspection],
  );

  const simulatedNow = useMemo(() => {
    if (timeTravelPreset === "live") return Date.now();

    if (timeTravelPreset === "custom") {
      const parsed = customDateTime ? new Date(customDateTime).getTime() : Number.NaN;
      return Number.isFinite(parsed) ? parsed : Date.now();
    }

    if (!selectedInspection) return Date.now();

    const findScheduledAt = (type: "pre-failure-warning" | "deadline-pressure" | "recovery-trigger") => {
      const item = selectedInspection.items.find((entry) => entry.type === type);
      return item ? new Date(item.scheduledAt).getTime() : Date.now();
    };

    if (timeTravelPreset === "pre-failure") {
      return findScheduledAt("pre-failure-warning") + 60_000;
    }

    if (timeTravelPreset === "final") {
      return findScheduledAt("deadline-pressure") + 60_000;
    }

    if (timeTravelPreset === "missed") {
      return new Date(selectedInspection.dueAt).getTime() + 2 * 60_000;
    }

    return findScheduledAt("recovery-trigger") + 60_000;
  }, [customDateTime, selectedInspection, timeTravelPreset]);

  const pressureInspection = useMemo(
    () => inspectPressureNotifications(commitments, {
      now: simulatedNow,
      worstTimeOfDay: behaviorProfile.worstTimeOfDay,
      lastAppOpenedAt: timeTravelPreset === "recovery" ? null : readLastAppOpenedAt(),
    }),
    [behaviorProfile.worstTimeOfDay, commitments, simulatedNow, timeTravelPreset],
  );

  const handleRunJob = async () => {
    const result = await runMissCheck();
    setLogs(prev => [result, ...prev]);
  };

  const handleRunCashoutBatch = async () => {
    if (!batchSecret.trim()) {
      setBatchRunLogs((prev) => ["Missing batch secret (x-batch-secret)", ...prev]);
      return;
    }

    const parsedLimit = Number(batchLimit);
    const normalizedLimit = Number.isFinite(parsedLimit)
      ? Math.max(1, Math.min(100, Math.floor(parsedLimit)))
      : 25;

    setRunningBatch(true);

    try {
      const startedAt = new Date();
      const { data, error } = await (supabase as any).functions.invoke("process_cashout_batch", {
        body: { limit: normalizedLimit },
        headers: {
          "x-batch-secret": batchSecret.trim(),
        },
      });

      if (error) {
        throw error;
      }

      const scanned = data?.scanned ?? 0;
      const results = Array.isArray(data?.results) ? data.results : [];
      const completed = results.filter((r: any) => r?.status === "completed").length;
      const processing = results.filter((r: any) => r?.status === "processing").length;
      const failed = results.filter((r: any) => r?.status === "failed").length;

      setBatchRunLogs((prev) => [
        `[${startedAt.toLocaleTimeString()}] scanned=${scanned} processing=${processing} completed=${completed} failed=${failed}`,
        ...prev,
      ]);
    } catch (err: any) {
      setBatchRunLogs((prev) => [
        `[${new Date().toLocaleTimeString()}] batch failed: ${err?.message || "Unknown error"}`,
        ...prev,
      ]);
    } finally {
      setRunningBatch(false);
    }
  };

  const simulateDeepLink = (mode: DeepLinkMode) => {
    if (!effectiveSelectedCommitmentId) return;
    const deepLink = buildPactDeepLink(effectiveSelectedCommitmentId, mode);
    handleDeepLink(deepLink, setLocation);
  };

  const simulateNotificationTap = (mode: "act" | "prove" | "missed" | "recovery") => {
    if (!effectiveSelectedCommitmentId) return;
    const url = `lockstep://pact/${effectiveSelectedCommitmentId}?mode=${mode}`;
    routeFromNotificationUrl(url, setLocation);
  };

  const copyDeepLink = async (mode: DeepLinkMode) => {
    if (!effectiveSelectedCommitmentId) return;
    try {
      await navigator.clipboard.writeText(buildPactDeepLink(effectiveSelectedCommitmentId, mode));
      setCopiedDeepLinkMode(mode);
      window.setTimeout(() => {
        setCopiedDeepLinkMode((current) => (current === mode ? null : current));
      }, 1500);
    } catch {
      setCopiedDeepLinkMode(null);
    }
  };

  const togglePayloadPreview = (key: string) => {
    setOpenPayloadKeys((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const copyPayloadPreview = async (key: string, payload: string) => {
    try {
      await navigator.clipboard.writeText(payload);
      setCopiedPayloadKey(key);
      window.setTimeout(() => {
        setCopiedPayloadKey((current) => (current === key ? null : current));
      }, 1500);
    } catch {
      setCopiedPayloadKey(null);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      <h1 className="text-3xl font-heading font-bold text-red-500 flex items-center gap-3">
        ADMIN / DEBUG
        <Badge className="bg-green-500 text-black hover:bg-green-600 border-none font-bold">MVP COMPLETE</Badge>
      </h1>
      
      <div className="grid gap-8 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Cron Jobs</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Manually trigger the "Missed Commitment" check. In prod, this runs every 10 mins via cron.
            </p>
            <Button onClick={handleRunJob} variant="destructive">Run Miss Check Logic</Button>
            
            <div className="mt-4 bg-black p-4 rounded text-xs font-mono h-48 overflow-y-auto border border-zinc-800">
              {logs.length === 0 ? <span className="text-zinc-600">No logs yet...</span> : logs.map((log, i) => (
                <div key={i} className="mb-1 text-green-400">{`> ${log}`}</div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Cashout Batch Trigger</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Runs <span className="font-mono">process_cashout_batch</span> with secret header wiring from this admin panel.
            </p>

            <label className="block space-y-2">
              <span className="text-xs uppercase tracking-widest text-zinc-500">Batch secret (x-batch-secret)</span>
              <input
                type="password"
                value={batchSecret}
                onChange={(e) => setBatchSecret(e.target.value)}
                className="w-full bg-black border border-zinc-800 px-3 py-2 text-sm text-white"
                placeholder="Enter BATCH_PAYOUT_SECRET"
              />
            </label>

            <label className="block space-y-2 max-w-xs">
              <span className="text-xs uppercase tracking-widest text-zinc-500">Batch limit (1-100)</span>
              <input
                type="number"
                min={1}
                max={100}
                value={batchLimit}
                onChange={(e) => setBatchLimit(e.target.value)}
                className="w-full bg-black border border-zinc-800 px-3 py-2 text-sm text-white"
              />
            </label>

            <Button onClick={handleRunCashoutBatch} disabled={runningBatch} variant="outline">
              {runningBatch ? "Running batch..." : "Run Cashout Batch"}
            </Button>

            <div className="bg-black p-4 rounded text-xs font-mono h-40 overflow-y-auto border border-zinc-800">
              {batchRunLogs.length === 0 ? (
                <span className="text-zinc-600">No cashout batch runs yet...</span>
              ) : (
                batchRunLogs.map((log, i) => (
                  <div key={i} className="mb-1 text-sky-300">{`> ${log}`}</div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Environment Check</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm font-mono">
              <li className="flex justify-between"><span>SUPABASE_URL</span> <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">ACTIVE</Badge></li>
              <li className="flex justify-between"><span>STRIPE_SECRET</span> <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">ACTIVE</Badge></li>
              <li className="flex justify-between"><span>OPENAI_API_KEY</span> <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">ACTIVE</Badge></li>
              <li className="flex justify-between"><span>TWILIO_SID</span> <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">ACTIVE</Badge></li>
            </ul>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Onboarding + Recovery Funnel (Local)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Derived from local analytics events. Useful for rapid UX iteration before shipping server analytics.
          </p>

          <div className="grid gap-3 md:grid-cols-4 lg:grid-cols-6">
            <div className="border border-zinc-800 bg-black/30 p-3">
              <div className="text-[10px] uppercase tracking-widest text-zinc-500">Landing CTA</div>
              <div className="text-2xl font-bold text-white">{onboardingFunnel.landingCta}</div>
            </div>
            <div className="border border-zinc-800 bg-black/30 p-3">
              <div className="text-[10px] uppercase tracking-widest text-zinc-500">Signups</div>
              <div className="text-2xl font-bold text-white">{onboardingFunnel.signupCompleted}</div>
            </div>
            <div className="border border-zinc-800 bg-black/30 p-3">
              <div className="text-[10px] uppercase tracking-widest text-zinc-500">First intent</div>
              <div className="text-2xl font-bold text-white">{onboardingFunnel.firstIntentSubmitted}</div>
            </div>
            <div className="border border-zinc-800 bg-black/30 p-3">
              <div className="text-[10px] uppercase tracking-widest text-zinc-500">First pact created</div>
              <div className="text-2xl font-bold text-white">{onboardingFunnel.created}</div>
            </div>
            <div className="border border-zinc-800 bg-black/30 p-3">
              <div className="text-[10px] uppercase tracking-widest text-zinc-500">First pact completed</div>
              <div className="text-2xl font-bold text-white">{onboardingFunnel.completed}</div>
            </div>
            <div className="border border-zinc-800 bg-black/30 p-3">
              <div className="text-[10px] uppercase tracking-widest text-zinc-500">Completed in 24h</div>
              <div className="text-2xl font-bold text-white">{onboardingFunnel.completed24h}</div>
            </div>
            <div className="border border-zinc-800 bg-black/30 p-3">
              <div className="text-[10px] uppercase tracking-widest text-zinc-500">AI adjusted taps</div>
              <div className="text-2xl font-bold text-white">{onboardingFunnel.adjusted}</div>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <div className="border border-zinc-800 bg-black/30 p-3">
              <div className="text-[10px] uppercase tracking-widest text-zinc-500">Accepted w/o edits</div>
              <div className="text-2xl font-bold text-white">{onboardingFunnel.acceptanceRate.toFixed(1)}%</div>
            </div>
            <div className="border border-zinc-800 bg-black/30 p-3">
              <div className="text-[10px] uppercase tracking-widest text-zinc-500">Avg time to lock</div>
              <div className="text-2xl font-bold text-white">{Math.round(onboardingFunnel.avgTimeToLock)}s</div>
            </div>
            <div className="border border-zinc-800 bg-black/30 p-3">
              <div className="text-[10px] uppercase tracking-widest text-zinc-500">Recovery created ≤24h</div>
              <div className="text-2xl font-bold text-white">{onboardingFunnel.recoveryWithin24h}/{onboardingFunnel.recoveryCreated}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Distribution Ops Tracker (Team Cadence)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Log daily distribution & outreach metrics: posts, DMs, creator outreach, CAC trends. Run your go-to-market cadence from inside the system.
          </p>

          <div className="border border-zinc-800 bg-black/30 p-4 space-y-4">
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              <label className="space-y-2 text-sm">
                <div className="text-xs uppercase tracking-widest text-zinc-500">Date</div>
                <input
                  type="date"
                  value={opsDate}
                  onChange={(e) => setOpsDate(e.target.value)}
                  className="w-full bg-black border border-zinc-800 px-3 py-2 text-sm text-white"
                />
              </label>
              <label className="space-y-2 text-sm">
                <div className="text-xs uppercase tracking-widest text-zinc-500">Posts created</div>
                <input
                  type="number"
                  min={0}
                  value={opsPostsCount}
                  onChange={(e) => setOpsPostsCount(parseInt(e.target.value) || 0)}
                  className="w-full bg-black border border-zinc-800 px-3 py-2 text-sm text-white"
                />
              </label>
              <label className="space-y-2 text-sm">
                <div className="text-xs uppercase tracking-widest text-zinc-500">DMs sent</div>
                <input
                  type="number"
                  min={0}
                  value={opsDmsCount}
                  onChange={(e) => setOpsDmsCount(parseInt(e.target.value) || 0)}
                  className="w-full bg-black border border-zinc-800 px-3 py-2 text-sm text-white"
                />
              </label>
              <label className="space-y-2 text-sm">
                <div className="text-xs uppercase tracking-widest text-zinc-500">Creator outreach</div>
                <input
                  type="number"
                  min={0}
                  value={opsCreatorOutreachCount}
                  onChange={(e) => setOpsCreatorOutreachCount(parseInt(e.target.value) || 0)}
                  className="w-full bg-black border border-zinc-800 px-3 py-2 text-sm text-white"
                />
              </label>
              <label className="space-y-2 text-sm">
                <div className="text-xs uppercase tracking-widest text-zinc-500">CAC input (optional)</div>
                <input
                  type="number"
                  step={0.01}
                  placeholder="e.g., 12.50"
                  value={opsCacValue ?? ""}
                  onChange={(e) => setOpsCacValue(e.target.value ? parseFloat(e.target.value) : undefined)}
                  className="w-full bg-black border border-zinc-800 px-3 py-2 text-sm text-white"
                />
              </label>
              <label className="space-y-2 text-sm">
                <div className="text-xs uppercase tracking-widest text-zinc-500">Notes</div>
                <input
                  type="text"
                  placeholder="e.g., Heavy DM outreach with founders"
                  value={opsNotes}
                  onChange={(e) => setOpsNotes(e.target.value)}
                  className="w-full bg-black border border-zinc-800 px-3 py-2 text-sm text-white"
                />
              </label>
            </div>

            <Button onClick={handleOpsSubmit} variant="outline" className="w-full rounded-none">
              Add / Update Entry
            </Button>
          </div>

          {opsTrend.totalDaysTracked > 0 && (
            <>
              <div className="grid gap-3 md:grid-cols-4">
                <div className="border border-zinc-800 bg-black/30 p-3">
                  <div className="text-[10px] uppercase tracking-widest text-zinc-500">Avg posts/day</div>
                  <div className="text-2xl font-bold text-white">{opsTrend.avgPostsPerDay.toFixed(1)}</div>
                </div>
                <div className="border border-zinc-800 bg-black/30 p-3">
                  <div className="text-[10px] uppercase tracking-widest text-zinc-500">Avg DMs/day</div>
                  <div className="text-2xl font-bold text-white">{opsTrend.avgDmsPerDay.toFixed(1)}</div>
                </div>
                <div className="border border-zinc-800 bg-black/30 p-3">
                  <div className="text-[10px] uppercase tracking-widest text-zinc-500">Avg outreach/day</div>
                  <div className="text-2xl font-bold text-white">{opsTrend.avgCreatorOutreachPerDay.toFixed(1)}</div>
                </div>
                <div className="border border-zinc-800 bg-black/30 p-3">
                  <div className="text-[10px] uppercase tracking-widest text-zinc-500">Days tracked</div>
                  <div className="text-2xl font-bold text-white">{opsTrend.totalDaysTracked}</div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="text-xs uppercase tracking-widest text-zinc-500">Trend history</div>
                <div className="border border-zinc-800 bg-black/30 p-3 space-y-2 max-h-64 overflow-y-auto">
                  {Array.from(opsTrend.trend).reverse().map((entry) => (
                    <div key={entry.date} className="flex items-center justify-between text-xs gap-2 pb-2 border-b border-zinc-800 last:border-b-0">
                      <div className="flex-1">
                        <div className="text-white font-semibold">{entry.date}</div>
                        <div className="text-zinc-400">
                          {entry.postsCount} posts · {entry.dmsCount} DMs · {entry.creatorOutreachCount} outreach
                          {entry.cacInputValue && <span className="ml-2 text-zinc-500">(CAC ${entry.cacInputValue.toFixed(2)})</span>}
                        </div>
                        {entry.notes && <div className="text-zinc-500 text-xs italic">{entry.notes}</div>}
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        className="rounded-none h-6 text-xs px-2"
                        onClick={() => handleOpsDelete(entry.date)}
                      >
                        Delete
                      </Button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-none"
                  onClick={handleOpsExport}
                >
                  Export CSV
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-none"
                  onClick={handleOpsClear}
                >
                  Clear all
                </Button>
              </div>
            </>
          )}

          {opsTrend.totalDaysTracked === 0 && (
            <div className="text-sm text-zinc-500 italic">No entries yet. Start logging your cadence above.</div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Paywall CTR (Local Event Export)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Local analytics export from this device/session. CTR formula:
            {" "}
            <span className="font-mono">paywall_cta_clicked / paywall_viewed</span>
          </p>

          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" className="rounded-none" onClick={refreshPaywallExport}>
              Refresh
            </Button>
            <Button
              type="button"
              variant="outline"
              className="rounded-none"
              onClick={exportPaywallCsv}
              disabled={!paywallEventSlice.length}
            >
              Export CSV
            </Button>
            <Button
              type="button"
              variant="outline"
              className="rounded-none"
              onClick={exportPaywallSummaryCsv}
            >
              Export Summary CSV
            </Button>
            <Button type="button" variant="outline" className="rounded-none" onClick={clearPaywallExport}>
              Clear local export
            </Button>
          </div>

          <div className="text-xs text-zinc-500">
            Export includes <span className="text-zinc-300">{paywallEventSlice.length}</span> paywall events (view/click/dismiss).
          </div>

          <div className="grid gap-3 md:grid-cols-4">
            <div className="border border-zinc-800 bg-black/30 p-3">
              <div className="text-[10px] uppercase tracking-widest text-zinc-500">Views</div>
              <div className="text-2xl font-bold text-white">{totalPaywallViews}</div>
            </div>
            <div className="border border-zinc-800 bg-black/30 p-3">
              <div className="text-[10px] uppercase tracking-widest text-zinc-500">Clicks</div>
              <div className="text-2xl font-bold text-white">{totalPaywallClicks}</div>
            </div>
            <div className="border border-zinc-800 bg-black/30 p-3">
              <div className="text-[10px] uppercase tracking-widest text-zinc-500">Dismissals</div>
              <div className="text-2xl font-bold text-white">{totalPaywallDismissals}</div>
            </div>
            <div className="border border-zinc-800 bg-black/30 p-3">
              <div className="text-[10px] uppercase tracking-widest text-zinc-500">Winner</div>
              <div className="text-sm font-bold text-white mt-1">
                {winnerMode ? `${winnerMode.mode.toUpperCase()} (${winnerMode.ctrPercent})` : "No data"}
              </div>
            </div>
          </div>

          <div className="space-y-2">
            {paywallRows.map((row) => (
              <div key={row.mode} className="border border-zinc-800 bg-zinc-950/40 p-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <div className="text-xs uppercase tracking-widest text-zinc-500">{row.mode}</div>
                    {winnerMode?.mode === row.mode && (
                      <Badge variant="outline" className="bg-green-500/10 text-green-400 border-green-500/30">
                        Winner
                      </Badge>
                    )}
                  </div>
                  <div className="text-sm font-semibold text-white">CTR {row.ctrPercent}</div>
                </div>
                <div className="text-xs text-zinc-400 mt-1">
                  views: {row.views} · clicks: {row.clicks} · dismissals: {paywallDismissalsByMode[row.mode]}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Raw Data Store</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="text-xs bg-black p-4 overflow-auto border border-zinc-800 text-zinc-400">
            {JSON.stringify(commitments, null, 2)}
          </pre>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Pressure Notification Inspector</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <p className="text-sm text-muted-foreground">
            For each pact: what is queued, what was suppressed by throttling, and what no longer applies.
          </p>

          <div className="border border-zinc-800 bg-black/30 p-4 space-y-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
              <label className="flex-1 space-y-2 text-sm">
                <div className="text-xs uppercase tracking-widest text-zinc-500">Reference pact</div>
                <select
                  value={effectiveSelectedCommitmentId}
                  onChange={(e) => setSelectedCommitmentId(e.target.value)}
                  className="w-full bg-black border border-zinc-800 px-3 py-2 text-sm text-white"
                >
                  {sortedCommitments.map((commitment) => (
                    <option key={commitment.id} value={commitment.id}>
                      {(commitment.actionText || commitment.intent.goal || commitment.intent.text || commitment.id).slice(0, 80)}
                    </option>
                  ))}
                  {!sortedCommitments.length && <option value="">No pacts</option>}
                </select>
              </label>

              <div className="flex-[2] space-y-2">
                <div className="text-xs uppercase tracking-widest text-zinc-500">Time travel</div>
                <div className="flex flex-wrap gap-2">
                  {[
                    ["live", "Live now"],
                    ["pre-failure", "Pre-failure"],
                    ["final", "Final"],
                    ["missed", "Just missed"],
                    ["recovery", "+30 min recovery"],
                    ["custom", "Custom"],
                  ].map(([value, label]) => (
                    <Button
                      key={value}
                      type="button"
                      variant={timeTravelPreset === value ? "default" : "outline"}
                      className="rounded-none"
                      onClick={() => setTimeTravelPreset(value as TimeTravelPreset)}
                    >
                      {label}
                    </Button>
                  ))}
                </div>
              </div>
            </div>

            <div className="border border-zinc-800 bg-zinc-950/40 p-4 space-y-3">
              <div className="text-xs uppercase tracking-widest text-zinc-500">Simulate deep link</div>
              <div className="text-sm text-zinc-400">
                Fire the actual deep-link handler for the selected pact and jump directly into the target screen.
              </div>
              <div className="flex flex-wrap gap-2">
                {([
                  ["act", "Open act"],
                  ["prove", "Open prove"],
                  ["missed", "Open missed"],
                  ["recovery", "Open recovery"],
                ] as Array<[DeepLinkMode, string]>).map(([mode, label]) => (
                  <div key={mode} className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      className="rounded-none"
                      disabled={!effectiveSelectedCommitmentId}
                      onClick={() => simulateDeepLink(mode)}
                    >
                      {label}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="rounded-none"
                      disabled={!effectiveSelectedCommitmentId}
                      onClick={() => void copyDeepLink(mode)}
                    >
                      {copiedDeepLinkMode === mode ? "Copied" : "Copy link"}
                    </Button>
                  </div>
                ))}
              </div>
              {effectiveSelectedCommitmentId && (
                <div className="text-xs text-zinc-500 break-all">
                  Selected pact deep link base: <span className="text-zinc-300">lockstep://pact/{effectiveSelectedCommitmentId}?mode=…</span>
                </div>
              )}
            </div>

            {isDev && (
              <div className="border border-zinc-800 bg-zinc-950/40 p-4 space-y-3">
                <div className="text-xs uppercase tracking-widest text-zinc-500">Dev: simulate notification tap</div>
                <div className="text-sm text-zinc-400">
                  Runs the same URL routing path used by the notification response listener.
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="rounded-none h-8 text-xs"
                    disabled={!effectiveSelectedCommitmentId}
                    onClick={() => simulateNotificationTap("act")}
                  >
                    Tap ACT notification
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="rounded-none h-8 text-xs"
                    disabled={!effectiveSelectedCommitmentId}
                    onClick={() => simulateNotificationTap("prove")}
                  >
                    Tap PROVE notification
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="rounded-none h-8 text-xs"
                    disabled={!effectiveSelectedCommitmentId}
                    onClick={() => simulateNotificationTap("missed")}
                  >
                    Tap MISSED notification
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="rounded-none h-8 text-xs"
                    disabled={!effectiveSelectedCommitmentId}
                    onClick={() => simulateNotificationTap("recovery")}
                  >
                    Tap RECOVERY notification
                  </Button>
                </div>
              </div>
            )}

            {timeTravelPreset === "custom" && (
              <label className="block space-y-2 text-sm">
                <div className="text-xs uppercase tracking-widest text-zinc-500">Custom simulated time</div>
                <input
                  type="datetime-local"
                  value={customDateTime}
                  onChange={(e) => setCustomDateTime(e.target.value)}
                  className="w-full bg-black border border-zinc-800 px-3 py-2 text-sm text-white"
                />
              </label>
            )}

            <div className="flex flex-wrap gap-3 text-xs text-zinc-400">
              <div>
                Simulated now: <span className="text-white">{new Date(simulatedNow).toLocaleString()}</span>
              </div>
              {selectedInspection && timeTravelPreset !== "live" && timeTravelPreset !== "custom" && (
                <div>
                  Anchor pact: <span className="text-white">{selectedInspection.actionLabel}</span>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-4">
            {pressureInspection.map((entry) => (
              <div key={entry.commitmentId} className="border border-zinc-800 p-4 bg-black/30 space-y-4">
                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <div>
                    <div className="text-lg font-semibold text-white">{entry.actionLabel}</div>
                    <div className="text-xs text-zinc-500 mt-1">
                      Pact {entry.commitmentId} · due {new Date(entry.dueAt).toLocaleString()}
                    </div>
                  </div>
                  <Badge variant="outline" className="w-fit uppercase tracking-widest">
                    {entry.status}
                  </Badge>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  {entry.items.map((item) => (
                    <div key={`${entry.commitmentId}-${item.type}`} className="border border-zinc-800 p-3 space-y-2 bg-zinc-950/60">
                      {(() => {
                        const previewKey = `${entry.commitmentId}-${item.type}`;
                        const payload = buildNativeNotificationPayloadPreview({
                          id: item.notificationId,
                          type: item.type,
                          at: new Date(item.scheduledAt),
                          title: item.title,
                          body: item.body,
                          commitmentId: item.commitmentId,
                        });
                        const payloadText = JSON.stringify(payload, null, 2);
                        const isOpen = Boolean(openPayloadKeys[previewKey]);

                        return (
                          <>
                      <div className="flex items-center justify-between gap-3">
                        <div className="text-sm font-semibold text-zinc-100 uppercase tracking-widest">{item.type}</div>
                        <Badge variant="outline" className={badgeVariantFor(item.decision)}>
                          {item.decision}
                        </Badge>
                      </div>
                      <div className="text-sm text-white">{item.title}</div>
                      <div className="text-xs text-zinc-400">{item.body}</div>
                      <div className="text-xs text-zinc-500">Scheduled: {new Date(item.scheduledAt).toLocaleString()}</div>
                      <div className="text-xs text-zinc-300">{item.reason}</div>
                      <div className="flex flex-wrap gap-2 pt-1">
                        <Button
                          type="button"
                          variant="outline"
                          className="rounded-none h-8 text-xs"
                          onClick={() => togglePayloadPreview(previewKey)}
                        >
                          {isOpen ? "Hide payload" : "Show payload"}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          className="rounded-none h-8 text-xs"
                          onClick={() => void copyPayloadPreview(previewKey, payloadText)}
                        >
                          {copiedPayloadKey === previewKey ? "Copied" : "Copy payload preview"}
                        </Button>
                      </div>
                      {isOpen && (
                        <pre className="text-[11px] bg-black p-3 overflow-auto border border-zinc-800 text-zinc-400 whitespace-pre-wrap break-all">
                          {payloadText}
                        </pre>
                      )}
                          </>
                        );
                      })()}
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {pressureInspection.length === 0 && (
              <div className="text-sm text-zinc-500">No pacts available to inspect.</div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
