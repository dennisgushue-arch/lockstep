import React, { useEffect } from "react";
import { useApp } from "@/lib/mock-data";
import { Bell, X } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useLocation } from "wouter";
import type { IntentPattern } from "@/lib/passive-detection";

/**
 * Notification badge that shows number of active patterns
 * Placed in header or dashboard
 */
export function DetectionBadge() {
  const { getActivePatterns } = useApp();
  const [, setLocation] = useLocation();
  const activePatterns = getActivePatterns();

  return (
    <button
      type="button"
      onClick={() => setLocation("/detection")}
      aria-label="Open detection notifications"
      title="Open Detection"
      className="relative p-2 hover:bg-accent rounded-md transition-colors cursor-pointer pointer-events-auto"
    >
      <Bell className="w-5 h-5" />
      {activePatterns.length > 0 && (
        <span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
          {activePatterns.length}
        </span>
      )}
      {activePatterns.length === 0 && (
        <span
          className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-zinc-500/40 animate-pulse"
          aria-hidden="true"
        />
      )}
    </button>
  );
}

/**
 * Inline prompt card that appears when a pattern hits threshold
 */
export function PatternPrompt({ 
  pattern, 
  onDismiss, 
  onLockIn 
}: { 
  pattern: IntentPattern;
  onDismiss: () => void;
  onLockIn: () => void;
}) {
  return (
    <Card className="p-6 border-2 border-destructive bg-destructive/5 animate-in slide-in-from-top">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 space-y-3">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-destructive" />
            <Badge variant="destructive">
              Pattern Detected
            </Badge>
          </div>
          
          <div>
            <p className="text-xl font-semibold mb-1">
              You've mentioned "{pattern.normalizedIntent}"
            </p>
            <p className="text-muted-foreground">
              {pattern.occurrenceCount} times in {pattern.daySpan} days. 
              Ready to lock this in?
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <Button onClick={onLockIn} variant="destructive" className="w-full sm:w-auto h-auto py-2 leading-tight whitespace-normal">
              LOCK IT IN NOW
            </Button>
            <Button onClick={onDismiss} variant="ghost" className="w-full sm:w-auto h-auto py-2 leading-tight whitespace-normal">
              Not yet
            </Button>
          </div>
        </div>
        
        <button 
          onClick={onDismiss}
          className="text-muted-foreground hover:text-foreground"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
    </Card>
  );
}

/**
 * Auto-trigger pattern prompt when high urgency patterns detected
 */
export function PatternDetectionListener() {
  const { getActivePatterns, dismissPattern, lockInPattern } = useApp();
  const [, setLocation] = useLocation();
  const [dismissed, setDismissed] = React.useState<Set<string>>(new Set());
  
  const activePatterns = getActivePatterns();
  const highUrgencyPatterns = activePatterns.filter(p => {
    const density = p.occurrenceCount / p.daySpan;
    return density > 1 && !dismissed.has(p.id);
  });
  
  const handleDismiss = (patternId: string) => {
    setDismissed(prev => new Set(prev).add(patternId));
    dismissPattern(patternId);
  };
  
  const handleLockIn = (patternId: string) => {
    lockInPattern(patternId);
    setLocation("/lock-in");
  };
  
  if (highUrgencyPatterns.length === 0) return null;
  
  return (
    <div className="fixed bottom-6 right-6 max-w-md space-y-3 z-50">
      {highUrgencyPatterns.slice(0, 2).map(pattern => (
        <PatternPrompt
          key={pattern.id}
          pattern={pattern}
          onDismiss={() => handleDismiss(pattern.id)}
          onLockIn={() => handleLockIn(pattern.id)}
        />
      ))}
    </div>
  );
}

/**
 * Dashboard widget showing pattern summary
 */
export function PatternSummaryWidget() {
  const { getActivePatterns, intentSignals } = useApp();
  const [, setLocation] = useLocation();
  const activePatterns = getActivePatterns();
  
  if (activePatterns.length === 0) return null;
  
  return (
    <Card className="p-6 border-2 border-border hover:border-primary transition-colors cursor-pointer" onClick={() => setLocation("/detection")}>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Bell className="w-5 h-5" />
            Active Patterns
          </h3>
          <Badge variant="destructive">{activePatterns.length}</Badge>
        </div>
        
        <div className="space-y-2">
          {activePatterns.slice(0, 3).map(pattern => (
            <div key={pattern.id} className="text-sm">
              <p className="font-medium truncate">"{pattern.normalizedIntent}"</p>
              <p className="text-xs text-muted-foreground">
                {pattern.occurrenceCount}x in {pattern.daySpan} days
              </p>
            </div>
          ))}
        </div>
        
        <Button variant="outline" size="sm" className="w-full">
          View All Patterns →
        </Button>
      </div>
    </Card>
  );
}
