import React, { useEffect } from "react";
import { useLocation } from "wouter";
import { useApp } from "@/lib/mock-data";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowRight, RotateCcw, CheckCircle2 } from "lucide-react";

export default function ReflectionPage() {
  const { currentIntent, clearCurrentIntent } = useApp();
  const [, setLocation] = useLocation();

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
          RETRY
        </Button>
        <Button 
          size="lg" 
          className="flex-[2] rounded-none h-16 text-lg font-bold bg-white text-black hover:bg-gray-200"
          onClick={() => setLocation("/lock-in")}
        >
          LOCK IT IN
          <ArrowRight className="w-5 h-5 ml-2" />
        </Button>
      </div>
    </div>
  );
}
