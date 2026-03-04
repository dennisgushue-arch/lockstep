import React, { useMemo, useState } from "react";
import { useLocation } from "wouter";
import { useApp } from "@/lib/mock-data";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { formatDistanceToNowStrict } from "date-fns";

const STORAGE_KEY = "intent_checkins";

type CheckInEntry = {
  id: string;
  commitmentId: string;
  note: string;
  proof: string;
  createdAt: string;
};

function loadCheckIns(): CheckInEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as CheckInEntry[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveCheckIns(entries: CheckInEntry[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

export default function JournalPage() {
  const [location, setLocation] = useLocation();
  const { commitments, captureSignal } = useApp();
  const { toast } = useToast();

  const [note, setNote] = useState("");
  const [proof, setProof] = useState("");
  const [saving, setSaving] = useState(false);

  const commitmentId = useMemo(() => {
    const search = typeof window !== "undefined" ? window.location.search : "";
    const params = new URLSearchParams(search);
    return params.get("commitment_id");
  }, [location]);

  const commitment = useMemo(() => {
    if (!commitmentId) return null;
    return commitments.find((c) => c.id === commitmentId) ?? null;
  }, [commitments, commitmentId]);

  const entries = useMemo(() => {
    if (!commitmentId) return [];
    return loadCheckIns().filter((e) => e.commitmentId === commitmentId);
  }, [commitmentId]);

  const handleSave = async () => {
    if (!commitmentId) return;

    if (!note.trim() && !proof.trim()) {
      toast({
        title: "Add something real",
        description: "Leave a note or proof before saving.",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      const next = loadCheckIns();
      const combinedText = [note.trim(), proof.trim()]
        .filter(Boolean)
        .join("\n");

      if (combinedText) {
        try {
          await captureSignal(combinedText, "journal");
        } catch (error) {
          console.error("Journal capture failed:", error);
        }
      }

      next.unshift({
        id: `checkin_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        commitmentId,
        note: note.trim(),
        proof: proof.trim(),
        createdAt: new Date().toISOString(),
      });
      saveCheckIns(next);
      setNote("");
      setProof("");
      toast({
        title: "Check-in saved",
        description: "Momentum logged. Keep going.",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="relative">
      <div className="noise-bg" />

      <div className="container max-w-4xl mx-auto px-4 py-8 space-y-6">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h1 className="text-4xl font-heading font-bold text-glow">
              CHECK-IN
            </h1>
            <p className="text-muted-foreground text-lg">
              {commitment
                ? `Pact: ${commitment.actionText ?? "Pact"}`
                : "Log proof and keep the pact alive."}
            </p>
          </div>

          <Button
            className="rounded-none h-12 px-6 text-lg font-bold"
            onClick={() => setLocation("/dashboard")}
          >
            BACK
          </Button>
        </div>

        <div className="glass-panel p-6 brutal-shadow space-y-4">
          <div className="text-xs uppercase tracking-widest opacity-60">
            Today’s move
          </div>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={4}
            placeholder="What did you do? Be specific."
            className={cn(
              "w-full bg-black/40 border border-zinc-800 p-3 text-sm",
              "focus:outline-none focus:border-white"
            )}
          />

          <div className="text-xs uppercase tracking-widest opacity-60">
            Proof prompt
          </div>
          <input
            value={proof}
            onChange={(e) => setProof(e.target.value)}
            placeholder="Drop a link, screenshot note, or concrete evidence."
            className={cn(
              "w-full bg-black/40 border border-zinc-800 p-3 text-sm",
              "focus:outline-none focus:border-white"
            )}
          />

          <div className="flex gap-3">
            <Button
              className="rounded-none h-12 px-6 text-lg font-bold"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? "SAVING…" : "SAVE CHECK-IN"}
            </Button>
          </div>
        </div>

        <div className="glass-panel p-6 brutal-shadow space-y-4">
          <div className="text-xs uppercase tracking-widest opacity-60">
            Recent check-ins
          </div>

          {!entries.length && (
            <div className="text-sm opacity-70">No check-ins yet.</div>
          )}

          {entries.map((entry) => (
            <div
              key={entry.id}
              className="border border-zinc-800 p-4 bg-black/30"
            >
              <div className="text-xs opacity-60">
                {formatDistanceToNowStrict(new Date(entry.createdAt), {
                  addSuffix: true,
                })}
              </div>
              {entry.note && (
                <div className="text-sm mt-2">{entry.note}</div>
              )}
              {entry.proof && (
                <div className="text-xs opacity-70 mt-2">Proof: {entry.proof}</div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
