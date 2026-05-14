import React, { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { useApp } from "@/lib/mock-data";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Mic, ArrowRight, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { analytics } from "@/lib/analytics";

export default function CapturePage() {
  const [location] = useLocation();
  const queryState = useMemo(() => {
    const search = typeof window !== "undefined" ? window.location.search : "";
    const params = new URLSearchParams(search);
    return {
      prefill: params.get("prefill") || "",
      recoveryFrom: params.get("recovery_from") || "",
      missedAt: params.get("missed_at") || "",
      recoveryVariant: params.get("recovery_variant") || "",
    };
  }, [location]);
  const prefill = queryState.prefill;
  const [text, setText] = useState(prefill);
  const [isProcessing, setIsProcessing] = useState(false);
  const { analyzeIntent } = useApp();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const PRESETS = [
    "Start working out",
    "Send one important message",
    "Do 5 minutes of work",
    "Clean something small",
  ];

  useEffect(() => {
    if (prefill) {
      setText(prefill);
    }
  }, [prefill]);

  useEffect(() => {
    if (!queryState.recoveryFrom) return;
    if (typeof window === "undefined") return;

    window.localStorage.setItem(
      "lockstep_recovery_context_v1",
      JSON.stringify({
        fromCommitmentId: queryState.recoveryFrom,
        missedAt: queryState.missedAt || null,
          recoveryVariant: queryState.recoveryVariant || null,
        startedAt: new Date().toISOString(),
      }),
    );
  }, [queryState.missedAt, queryState.recoveryFrom, queryState.recoveryVariant]);

  const handleMicToggle = () => {
    toast({
      title: "Voice recorder",
      description: "Opening voice notes to record your new pact.",
    });
    setLocation("/voice-notes");
  };

  const submitIntent = async (intentText: string) => {
    if (!intentText.trim()) return;

    setIsProcessing(true);
    try {
      if (queryState.recoveryFrom) {
        const missedAtMs = queryState.missedAt ? new Date(queryState.missedAt).getTime() : Number.NaN;
        const within24h = Number.isFinite(missedAtMs)
          ? Date.now() - missedAtMs <= 24 * 60 * 60 * 1000
          : null;

        analytics.track("recovery_pact_started", {
          recovery_from: queryState.recoveryFrom,
          within_24h: within24h,
          recovery_variant: queryState.recoveryVariant || null,
        });
      }

      console.log("Submitting intent:", intentText);
      await analyzeIntent(intentText);
      console.log("Analysis complete, redirecting...");
      setLocation("/reflection");
    } catch (error) {
      console.error("Capture failed - FULL ERROR:", error);
      console.error("Error stack:", error instanceof Error ? error.stack : 'No stack');
      console.error("Error details:", JSON.stringify(error, null, 2));
      const errorMessage = error instanceof Error ? error.message : "Could not understand intent";
      toast({
        title: "Couldn't process that",
        description: errorMessage,
        variant: "destructive",
      });
      setIsProcessing(false);
    }
  };

  const handleSubmit = async () => {
    await submitIntent(text);
  };

  const handlePresetTap = async (preset: string) => {
    setText(preset);
    await submitIntent(preset);
  };

  return (
    <div className="container max-w-2xl mx-auto px-4 py-12 flex flex-col h-[calc(100vh-64px)] justify-center premium-screen">
      <div className="space-y-6">
        <div className="space-y-2">
          <h1 className="text-5xl md:text-6xl premium-headline leading-[0.9]">NAME THE NEXT MOVE.</h1>
          <p className="premium-subtext text-lg">
            {queryState.recoveryFrom ? "Recovery mode. Small move. Right now." : "Say it clearly. Make it real."}
          </p>
        </div>

        {queryState.recoveryFrom && (
          <div className="panel-danger p-4 text-sm text-muted">
            You missed once. Don&apos;t miss twice.
          </div>
        )}

        {/* 1-tap presets */}
        {!text && (
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-widest label-subtle">QUICK START</p>
            <div className="flex flex-wrap gap-2">
              {PRESETS.map((p) => (
                <button
                  key={p}
                  onClick={() => void handlePresetTap(p)}
                  disabled={isProcessing}
                  className={`text-sm px-3 py-2 premium-pill ${text === p ? "premium-pill-active" : ""}`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="relative premium-input-glass p-3 premium-glow-purple overflow-hidden">
          <span className="premium-particle left-8 top-6" />
          <span className="premium-particle right-10 top-10" style={{ animationDelay: "0.9s" }} />
          <span className="premium-particle right-14 bottom-8" style={{ animationDelay: "1.7s" }} />
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="e.g. Write 500 words of my novel..."
            className="min-h-[200px] text-2xl md:text-3xl p-6 bg-transparent border-0 resize-none font-medium leading-relaxed focus-visible:ring-0"
            autoFocus
          />
          <Button 
            size="icon" 
            variant="secondary"
            className="absolute bottom-4 right-4 rounded-full h-12 w-12"
            onClick={handleMicToggle}
            aria-label="Record with voice"
            title="Record with voice"
          >
            <Mic className="w-6 h-6" />
          </Button>
        </div>

        <div className="flex justify-end pt-4">
          <Button 
            size="lg" 
            className="rounded-2xl px-8 py-6 text-xl font-black tracking-wide gap-3 premium-cta premium-breathe"
            onClick={handleSubmit}
            disabled={!text.trim() || isProcessing}
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                PROCESSING
              </>
            ) : (
              <>
                CAPTURE IT
                <ArrowRight className="w-5 h-5" />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
