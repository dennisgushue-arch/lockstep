import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useApp } from "@/lib/mock-data";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { 
  Bell, X, TrendingUp, Calendar, MessageSquare, Mic, BookOpen, Zap, 
  ArrowRight, Sparkles, Brain, AlertCircle, CheckCircle2, Clock,
  Flame, Target, Volume2, StopCircle, ShieldAlert
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import type { IntentPattern } from "@/lib/passive-detection";
import type { SourceType } from "@/lib/input-sources";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function DetectionPage() {
  const { 
    user,
    intentPatterns, 
    intentSignals,
    getActivePatterns, 
    dismissPattern, 
    lockInPattern,
    captureSignal,
    loadDemoData,
    syncInputSources,
    behaviorProfile,
    psychProfile,
  } = useApp();
  const [, setLocation] = useLocation();
  const [isSyncing, setIsSyncing] = useState(false);
  const [quickCaptureText, setQuickCaptureText] = useState("");
  const [selectedSource, setSelectedSource] = useState<SourceType>("manual");
  const [isListening, setIsListening] = useState(false);
  const [recentCapture, setRecentCapture] = useState<string | null>(null);

  const activePatterns = getActivePatterns();
  const recentSignals = intentSignals.slice(0, 10);

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
    setRecentCapture(quickCaptureText);
    setQuickCaptureText("");
    
    if (result?.shouldPrompt && result.urgency === "high") {
      setTimeout(() => window.scrollTo({ top: 0, behavior: "smooth" }), 100);
    }
    
    // Clear recent capture after 3 seconds
    setTimeout(() => setRecentCapture(null), 3000);
  };

  const handleVoiceCapture = () => {
    if (isListening) {
      setIsListening(false);
      // In production: stop speech recognition
    } else {
      setIsListening(true);
      // In production: start speech recognition with Web Speech API
      // Mock: simulate voice input after 2 seconds
      setTimeout(() => {
        const mockTranscript = "I really need to start working out consistently, maybe hit the gym three times a week";
        setQuickCaptureText(mockTranscript);
        setSelectedSource("voice_note");
        setIsListening(false);
      }, 2000);
    }
  };

  const handleLockIn = (pattern: IntentPattern) => {
    lockInPattern(pattern.id);
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

  const getUrgencyBadge = (occurrences: number, days: number) => {
    const density = occurrences / Math.max(days, 1);
    
    if (density > 1 || occurrences >= 5) {
      return <Badge variant="destructive" className="gap-1"><Flame className="w-3 h-3" />URGENT</Badge>;
    }
    if (density > 0.5 || occurrences >= 3) {
      return <Badge className="gap-1"><Target className="w-3 h-3" />HIGH</Badge>;
    }
    return <Badge variant="secondary" className="gap-1"><Clock className="w-3 h-3" />MODERATE</Badge>;
  };

  const getCategoryEmoji = (category: string) => {
    const map: Record<string, string> = {
      fitness: "💪",
      work: "💼",
      growth: "📚",
      social: "👥",
      habits: "🚭",
      creative: "🎨",
      finance: "💰",
      other: "🎯"
    };
    return map[category] || "🎯";
  };

  if (!user) {
    setLocation("/");
    return null;
  }

  return (
    <div className="container max-w-6xl mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-heading font-bold flex items-center gap-3">
              <Brain className="w-10 h-10 text-purple-500" />
              INTENT DETECTION
            </h1>
            <p className="text-muted-foreground text-lg mt-2">
              We're listening. Your casual thoughts become commitments.
            </p>
          </div>
          <div className="flex gap-2">
            {activePatterns.length === 0 && (
              <Button 
                onClick={loadDemoData}
                variant="outline"
                className="gap-2"
              >
                <Sparkles className="w-4 h-4" />
                Load Demo
              </Button>
            )}
            <Button 
              onClick={handleSync} 
              disabled={isSyncing}
              variant="outline"
              className="gap-2"
            >
              <Sparkles className="w-4 h-4" />
              {isSyncing ? "Syncing..." : "Sync All Sources"}
            </Button>
          </div>
        </div>

        {/* Stats Bar */}
        <div className="grid grid-cols-3 gap-4">
          <Card className="p-4 bg-purple-500/10 border-purple-500/30">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Detected Patterns</p>
                <p className="text-3xl font-bold text-purple-500">{activePatterns.length}</p>
              </div>
              <Target className="w-8 h-8 text-purple-500/50" />
            </div>
          </Card>
          <Card className="p-4 bg-blue-500/10 border-blue-500/30">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Signals</p>
                <p className="text-3xl font-bold text-blue-500">{intentSignals.length}</p>
              </div>
              <Zap className="w-8 h-8 text-blue-500/50" />
            </div>
          </Card>
          <Card className="p-4 bg-orange-500/10 border-orange-500/30">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Urgent Actions</p>
                <p className="text-3xl font-bold text-orange-500">
                  {activePatterns.filter(p => p.occurrenceCount >= 3).length}
                </p>
              </div>
              <Flame className="w-8 h-8 text-orange-500/50" />
            </div>
          </Card>
        </div>
      </div>

      {/* Quick Capture */}
      <Card className="border-2 border-primary/50 bg-gradient-to-br from-primary/5 to-purple-500/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Quick Capture
          </CardTitle>
          <CardDescription>
            Tell us what's on your mind. Voice, text, or paste from anywhere.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {recentCapture && (
            <Alert className="bg-green-500/10 border-green-500/50">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <AlertDescription className="text-green-500">
                Captured: "{recentCapture.slice(0, 60)}..."
              </AlertDescription>
            </Alert>
          )}

          <div className="flex gap-2">
            <Button
              variant={selectedSource === "manual" ? "default" : "outline"}
              onClick={() => setSelectedSource("manual")}
              className="flex-1"
            >
              <Zap className="w-4 h-4 mr-2" />
              Manual
            </Button>
            <Button
              variant={selectedSource === "voice_note" ? "default" : "outline"}
              onClick={() => setSelectedSource("voice_note")}
              className="flex-1"
            >
              <Mic className="w-4 h-4 mr-2" />
              Voice
            </Button>
            <Button
              variant={selectedSource === "message" ? "default" : "outline"}
              onClick={() => setSelectedSource("message")}
              className="flex-1"
            >
              <MessageSquare className="w-4 h-4 mr-2" />
              Message
            </Button>
            <Button
              variant={selectedSource === "journal" ? "default" : "outline"}
              onClick={() => setSelectedSource("journal")}
              className="flex-1"
            >
              <BookOpen className="w-4 h-4 mr-2" />
              Journal
            </Button>
          </div>

          <Textarea
            value={quickCaptureText}
            onChange={(e) => setQuickCaptureText(e.target.value)}
            placeholder="e.g., 'I really need to start going to the gym more often' or 'Should finally call mom this weekend'"
            className="min-h-[100px] text-base"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && e.metaKey) {
                handleQuickCapture();
              }
            }}
          />

          <div className="flex gap-3">
            <Button 
              onClick={handleVoiceCapture}
              variant={isListening ? "destructive" : "secondary"}
              className="gap-2"
            >
              {isListening ? (
                <>
                  <StopCircle className="w-4 h-4 animate-pulse" />
                  Listening...
                </>
              ) : (
                <>
                  <Volume2 className="w-4 h-4" />
                  Start Voice Input
                </>
              )}
            </Button>
            <Button 
              onClick={handleQuickCapture}
              className="flex-1 gap-2 text-lg font-bold"
              disabled={!quickCaptureText.trim()}
            >
              <Sparkles className="w-4 h-4" />
              Capture Intent
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>

          <p className="text-xs text-muted-foreground text-center">
            Press ⌘ + Enter to capture • Our AI analyzes patterns in real-time
          </p>
        </CardContent>
      </Card>

      {/* Bluff Pattern Alert — from Psych Engine */}
      {behaviorProfile && behaviorProfile.bluffTopics.length > 0 && (
        <Card className="border border-amber-600/40 bg-amber-950/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-amber-300 flex items-center gap-2 text-base">
              <ShieldAlert className="w-4 h-4" />
              Bluff Pattern Detected
            </CardTitle>
            <CardDescription className="text-amber-200/60">
              These topics appear repeatedly in your signals but have never been committed to.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {behaviorProfile.bluffTopics.map((topic) => (
                <Badge key={topic} variant="outline" className="border-amber-600/60 text-amber-300 text-xs">
                  {topic}
                </Badge>
              ))}
            </div>
            <p className="text-xs text-amber-200/70 italic">
              {psychProfile?.pattern_warning ?? behaviorProfile.psych.pattern_warning}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Detected Patterns */}
      {activePatterns.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-heading font-bold flex items-center gap-2">
              <Target className="w-6 h-6" />
              Detected Patterns
              <Badge variant="secondary">{activePatterns.length}</Badge>
            </h2>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {activePatterns.map((pattern) => (
              <Card key={pattern.id} className="relative overflow-hidden border-2 hover:border-primary/50 transition-all">
                <div className="absolute top-0 right-0 text-6xl opacity-10 select-none">
                  {getCategoryEmoji(pattern.category)}
                </div>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="outline" className="uppercase text-xs">
                          {pattern.category}
                        </Badge>
                        {getUrgencyBadge(pattern.occurrenceCount, pattern.daySpan)}
                      </div>
                      <CardTitle className="text-xl leading-tight">
                        {pattern.normalizedIntent}
                      </CardTitle>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pb-3">
                  <div className="grid grid-cols-3 gap-4 mb-4">
                    <div>
                      <p className="text-xs text-muted-foreground">Mentions</p>
                      <p className="text-2xl font-bold">{pattern.occurrenceCount}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Days</p>
                      <p className="text-2xl font-bold">{pattern.daySpan || 1}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Stake</p>
                      <p className="text-2xl font-bold text-yellow-500">
                        {pattern.suggestedStake || 10}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Clock className="w-3 h-3" />
                    First mentioned {formatDistanceToNow(new Date(pattern.firstDetectedAt), { addSuffix: true })}
                  </div>
                </CardContent>
                <CardFooter className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => dismissPattern(pattern.id)}
                    className="flex-1"
                  >
                    <X className="w-4 h-4 mr-1" />
                    Dismiss
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handleLockIn(pattern)}
                    className="flex-1 gap-2 font-bold"
                  >
                    <Zap className="w-4 h-4" />
                    Lock In Now
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {activePatterns.length === 0 && (
        <Card className="p-12 text-center border-dashed">
          <Brain className="w-16 h-16 mx-auto mb-4 text-muted-foreground/50" />
          <h3 className="text-2xl font-heading font-bold mb-2">No Patterns Yet</h3>
          <p className="text-muted-foreground mb-6 max-w-md mx-auto">
            Start capturing your thoughts above. We'll detect patterns as you mention the same intentions repeatedly.
          </p>
          <Button variant="outline" onClick={() => document.querySelector('textarea')?.focus()}>
            Capture Your First Intent
          </Button>
        </Card>
      )}

      {/* Recent Signals */}
      {recentSignals.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-semibold">Recent Signal History</h3>
            <Badge variant="secondary">{recentSignals.length} signals</Badge>
          </div>

          <div className="space-y-2">
            {recentSignals.map((signal) => (
              <Card key={signal.id} className="p-4 bg-muted/30 hover:bg-muted/50 transition-colors">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-background">
                    {getSourceIcon(signal.sourceType)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium line-clamp-2">{signal.rawText}</p>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(signal.detectedAt), { addSuffix: true })}
                      </span>
                      {signal.category && (
                        <Badge variant="outline" className="text-xs">
                          {signal.category}
                        </Badge>
                      )}
                      {signal.confidence && signal.confidence > 0.7 && (
                        <Badge variant="secondary" className="text-xs gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          High confidence
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
