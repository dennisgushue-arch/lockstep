import React, { useEffect } from "react";
import { useLocation } from "wouter";
import { useApp } from "@/lib/mock-data";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowRight, RotateCcw, CheckCircle2 } from "lucide-react";

export default function ReflectionPage() {
  const { currentIntent, clearCurrentIntent, behaviorProfile } = useApp();
  const [, setLocation] = useLocation();

  const pactSizeBadge =
    currentIntent?.pact_size_level === "tiny"
      ? "border-yellow-500/50 text-yellow-300 bg-yellow-500/10"
      : currentIntent?.pact_size_level === "small"
        ? "border-sky-500/50 text-sky-300 bg-sky-500/10"
        : currentIntent?.pact_size_level === "expanded"
          ? "border-emerald-500/50 text-emerald-300 bg-emerald-500/10"
          : "border-zinc-700 text-zinc-300 bg-zinc-900/50";

  useEffect(() => {
    if (!currentIntent) {
      setLocation("/capture");
    }
  }, [currentIntent, setLocation]);

  if (!currentIntent) return null;

  return (
    <div className="container max-w-3xl mx-auto px-4 py-12 flex flex-col min-h-[calc(100vh-64px)]">
      <div className="flex-1 space-y-12">
        {/* Your Goal */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-primary" />
            <span className="text-xs font-mono text-muted-foreground uppercase tracking-widest">Your Goal</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-heading font-bold leading-tight">
            {currentIntent.goal}
          </h1>
        </div>

        {/* First Action */}
        <div className="space-y-4 bg-primary/10 p-6 border border-primary/30">
          <span className="text-xs font-mono text-muted-foreground uppercase tracking-widest">First Action</span>
          <p className="text-lg md:text-xl font-semibold text-foreground">
            {currentIntent.first_action}
          </p>
        </div>

        {/* AI Reflection */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-muted-foreground uppercase tracking-widest">AI Reflection</span>
            <span className="text-xs font-mono text-muted-foreground/60">({Math.round(currentIntent.confidence * 100)}% confident)</span>
          </div>
          <div className="text-lg md:text-xl leading-relaxed font-serif italic text-foreground/80 border-l-4 border-primary pl-6 py-2">
            "{currentIntent.reflection}"
          </div>
        </div>

        {/* Analysis Summary */}
        <div className="grid grid-cols-2 gap-4 md:gap-6 bg-zinc-900/30 p-6 border border-border rounded-none">
          <div>
            <span className="text-xs text-muted-foreground uppercase tracking-widest font-semibold">Category</span>
            <p className="text-2xl font-bold mt-2 capitalize">{currentIntent.category}</p>
          </div>
          
          <div>
            <span className="text-xs text-muted-foreground uppercase tracking-widest font-semibold">Suggested Stake</span>
            <p className="text-2xl font-bold mt-2 text-red-500">${currentIntent.suggested_stake}</p>
          </div>

          {currentIntent.deadline && (
            <div className="col-span-2 border border-zinc-800 bg-black/30 p-4 space-y-1">
              <span className="text-xs text-muted-foreground uppercase tracking-widest font-semibold">Adaptive Deadline</span>
              <p className="text-base md:text-lg font-semibold">{currentIntent.deadline}</p>
              {currentIntent?.deadline_reason && (
                <div className="text-xs text-zinc-500 mt-2">
                  {currentIntent.deadline_reason}
                </div>
              )}
              {currentIntent?.pact_size_reason && (
                <div className="mt-2 space-y-2">
                  <span className={`inline-flex items-center px-2 py-0.5 text-[10px] uppercase tracking-widest border ${pactSizeBadge}`}>
                    Pact Size: {currentIntent.pact_size_level ?? "standard"}
                  </span>
                  <div className="text-xs text-zinc-500">{currentIntent.pact_size_reason}</div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Behavior Profile + Psych Engine */}
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs font-mono text-muted-foreground uppercase tracking-widest">Psych Engine v1</span>
            <span className="text-xs text-muted-foreground/70">
              Completion rate: {Math.round(behaviorProfile.stats.completion_rate * 100)}%
            </span>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <Card className="rounded-none border border-amber-400/40 bg-amber-500/5">
              <CardContent className="p-4 space-y-2">
                <p className="text-xs uppercase tracking-widest text-amber-300">Pattern Warning</p>
                <p className="text-sm text-amber-100/90 leading-relaxed">{behaviorProfile.psych.pattern_warning}</p>
              </CardContent>
            </Card>

            <Card className="rounded-none border border-sky-400/40 bg-sky-500/5">
              <CardContent className="p-4 space-y-2">
                <p className="text-xs uppercase tracking-widest text-sky-300">Best Leverage Point</p>
                <p className="text-sm text-sky-100/90 leading-relaxed">{behaviorProfile.psych.best_leverage_point}</p>
              </CardContent>
            </Card>

            <Card className="rounded-none border border-purple-400/40 bg-purple-500/5">
              <CardContent className="p-4 space-y-2">
                <p className="text-xs uppercase tracking-widest text-purple-300">Identity Risk</p>
                <p className="text-sm text-purple-100/90 leading-relaxed">{behaviorProfile.psych.identity_risk}</p>
              </CardContent>
            </Card>

            <Card className="rounded-none border border-green-400/40 bg-green-500/5">
              <CardContent className="p-4 space-y-2">
                <p className="text-xs uppercase tracking-widest text-green-300">Next Pressure Line</p>
                <p className="text-sm text-green-100/90 leading-relaxed">{behaviorProfile.psych.next_pressure_line}</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <div className="flex gap-4 pt-12">
        <Button 
          variant="outline" 
          size="lg" 
          className="flex-1 rounded-none h-16 text-lg border-zinc-800 hover:bg-zinc-900"
          onClick={() => {
            clearCurrentIntent();
            setLocation("/capture");
          }}
        >
          <RotateCcw className="w-4 h-4 mr-2" />
          GO BACK
        </Button>
        <Button 
          size="lg" 
          className="flex-[2] rounded-none h-16 text-lg font-bold bg-red-600 text-white hover:bg-red-700"
          onClick={() => setLocation("/lock-in")}
        >
          STAKE IT
          <ArrowRight className="w-5 h-5 ml-2" />
        </Button>
      </div>
    </div>
  );
}
