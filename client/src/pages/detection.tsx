import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useApp } from "@/lib/mock-data";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Bell, X, TrendingUp, Calendar, MessageSquare, Mic, BookOpen, Zap } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import type { IntentPattern } from "@/lib/passive-detection";
import type { SourceType } from "@/lib/input-sources";

export default function DetectionPage() {
  const { 
    user,
    intentPatterns, 
    intentSignals,
    getActivePatterns, 
    dismissPattern, 
    lockInPattern,
    captureSignal,
    syncInputSources 
  } = useApp();
  const [, setLocation] = useLocation();
  const [isSyncing, setIsSyncing] = useState(false);
  const [quickCaptureText, setQuickCaptureText] = useState("");
  const [selectedSource, setSelectedSource] = useState<SourceType>("manual");

  const activePatterns = getActivePatterns();

  // Auto-redirect if pattern is locked in
  useEffect(() => {
    const lockedPattern = intentPatterns.find(p => p.status === "locked");
    if (lockedPattern) {
      setLocation("/lock-in");
    }
  }, [intentPatterns, setLocation]);

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      await syncInputSources();
    } finally {
      setIsSyncing(false);
    }
  };

  const handleQuickCapture = async () => {
    if (!quickCaptureText.trim()) return;
    
    const result = await captureSignal(quickCaptureText, selectedSource);
    setQuickCaptureText("");
    
    if (result?.shouldPrompt && result.urgency === "high") {
      // Auto-redirect to prompt
      setTimeout(() => window.scrollTo({ top: 0, behavior: "smooth" }), 100);
    }
  };

  const getSourceIcon = (source: SourceType) => {
    switch (source) {
      case "voice_note": return <Mic className="w-4 h-4" />;
      case "message": return <MessageSquare className="w-4 h-4" />;
      case "calendar": return <Calendar className="w-4 h-4" />;
      case "journal": return <BookOpen className="w-4 h-4" />;
      default: return <Zap className="w-4 h-4" />;
    }
  };

  const getUrgencyColor = (occurrences: number, days: number) => {
    const density = occurrences / days;
    if (density > 1) return "destructive";
    if (density > 0.5) return "default";
    return "secondary";
  };

  if (!user) {
    setLocation("/");
    return null;
  }

  return (
    <div className="container max-w-4xl mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h1 className="text-4xl font-heading font-bold flex items-center gap-3">
            <Bell className="w-8 h-8" />
            PATTERN DETECTION
          </h1>
          <Button 
            onClick={handleSync} 
            disabled={isSyncing}
            variant="outline"
          >
            {isSyncing ? "Syncing..." : "Sync Sources"}
          </Button>
        </div>
        <p className="text-muted-foreground text-lg">
          Tracking your repeated intentions across all inputs
        </p>
      </div>

      {/* Quick Capture */}
      <Card className="p-6 border-2">
        <div className="space-y-4">
          <h3 className="text-xl font-semibold">Quick Capture</h3>
          <div className="flex gap-2">
            <select
              value={selectedSource}
              onChange={(e) => setSelectedSource(e.target.value as SourceType)}
              className="px-3 py-2 border rounded-md bg-background"
            >
              <option value="manual">Manual</option>
              <option value="voice_note">Voice Note</option>
              <option value="message">Message</option>
              <option value="journal">Journal</option>
            </select>
            <input
              type="text"
              value={quickCaptureText}
              onChange={(e) => setQuickCaptureText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleQuickCapture()}
              placeholder="Type an intent you've been thinking about..."
              className="flex-1 px-4 py-2 border rounded-md bg-background"
            />
            <Button onClick={handleQuickCapture}>
              Capture
            </Button>
          </div>
        </div>
      </Card>

      {/* Active Patterns - These need action */}
      {activePatterns.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-destructive" />
            <h2 className="text-2xl font-heading font-bold">
              PATTERNS DETECTED ({activePatterns.length})
            </h2>
          </div>
          
          <div className="space-y-3">
            {activePatterns.map((pattern) => (
              <PatternCard
                key={pattern.id}
                pattern={pattern}
                onDismiss={() => dismissPattern(pattern.id)}
                onLockIn={() => lockInPattern(pattern.id)}
              />
            ))}
          </div>
        </div>
      )}

      {/* No Active Patterns */}
      {activePatterns.length === 0 && (
        <Card className="p-12 text-center border-dashed">
          <Bell className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
          <h3 className="text-xl font-semibold mb-2">No Patterns Detected Yet</h3>
          <p className="text-muted-foreground">
            Keep capturing your intents. We'll alert you when we detect repeated patterns.
          </p>
        </Card>
      )}

      {/* Recent Signals */}
      <div className="space-y-4">
        <Separator />
        <h3 className="text-xl font-semibold text-muted-foreground">
          Recent Signals ({intentSignals.length})
        </h3>
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {intentSignals.slice(0, 20).map((signal) => (
            <div 
              key={signal.id}
              className="p-3 border rounded-md bg-card text-sm flex items-start gap-3"
            >
              <div className="mt-1">{getSourceIcon(signal.sourceType)}</div>
              <div className="flex-1">
                <p className="text-muted-foreground">{signal.rawText}</p>
                <p className="text-xs text-muted-foreground/60 mt-1">
                  {formatDistanceToNow(new Date(signal.detectedAt), { addSuffix: true })}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function PatternCard({ 
  pattern, 
  onDismiss, 
  onLockIn 
}: { 
  pattern: IntentPattern; 
  onDismiss: () => void; 
  onLockIn: () => void;
}) {
  const urgency = getUrgencyColor(pattern.occurrenceCount, pattern.daySpan);
  
  return (
    <Card className={`p-6 border-2 ${urgency === "destructive" ? "border-destructive" : ""}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 space-y-3">
          <div className="flex items-center gap-3">
            <Badge variant={urgency as any}>
              {pattern.occurrenceCount}x in {pattern.daySpan} days
            </Badge>
            <Badge variant="outline">{pattern.category}</Badge>
          </div>
          
          <div>
            <p className="text-2xl font-semibold mb-2">
              "{pattern.normalizedIntent}"
            </p>
            <p className="text-muted-foreground">
              You've mentioned this {pattern.occurrenceCount} time{pattern.occurrenceCount > 1 ? "s" : ""} over the past {pattern.daySpan} day{pattern.daySpan > 1 ? "s" : ""}.
              {urgency === "destructive" && " Time to put your money where your mouth is."}
            </p>
          </div>
          
          {pattern.suggestedStake && (
            <p className="text-sm text-muted-foreground">
              Suggested stake: <span className="font-semibold">${pattern.suggestedStake}</span>
            </p>
          )}
        </div>
        
        <div className="flex flex-col gap-2">
          <Button onClick={onLockIn} className="whitespace-nowrap">
            LOCK IT IN
          </Button>
          <Button onClick={onDismiss} variant="ghost" size="sm">
            <X className="w-4 h-4 mr-1" />
            Dismiss
          </Button>
        </div>
      </div>
    </Card>
  );
}

function getUrgencyColor(occurrences: number, days: number): "destructive" | "default" | "secondary" {
  const density = occurrences / days;
  if (density > 1) return "destructive";
  if (density > 0.5) return "default";
  return "secondary";
}
