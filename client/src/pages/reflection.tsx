import React, { useEffect } from "react";
import { useLocation } from "wouter";
import { useApp } from "@/lib/mock-data";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowRight, RotateCcw } from "lucide-react";

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
        <div className="space-y-4">
          <p className="text-sm font-mono text-muted-foreground uppercase tracking-widest">AI Reflection</p>
          <div className="text-xl md:text-2xl leading-relaxed whitespace-pre-line font-serif italic text-foreground/90 border-l-2 border-primary pl-6">
            "{currentIntent.reflection}"
          </div>
        </div>

        <div className="space-y-6 bg-zinc-900/30 p-8 border border-border">
          <div>
            <span className="text-xs text-muted-foreground uppercase tracking-widest">Detected Action</span>
            <h2 className="text-3xl font-heading font-bold mt-2">{currentIntent.action}</h2>
          </div>
          
          <div>
            <span className="text-xs text-muted-foreground uppercase tracking-widest">Category</span>
            <p className="text-lg font-medium mt-1">{currentIntent.category}</p>
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
