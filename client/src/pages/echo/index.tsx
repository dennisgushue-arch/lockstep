import React, { useState } from "react";
import { useLocation } from "wouter";
import { EchoLayout } from "@/components/echo-layout";
import { useEcho } from "@/lib/echo-context";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Brain,
  Mic,
  Image,
  Type,
  Loader2,
  Search,
  Clock,
  Users,
  RotateCcw,
  ChevronRight,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

const SOURCE_ICONS: Record<string, React.ElementType> = {
  text: Type,
  voice: Mic,
  screenshot: Image,
  photo: Image,
};

const SOURCE_COLORS: Record<string, string> = {
  text: "text-cyan-400",
  voice: "text-violet-400",
  screenshot: "text-amber-400",
  photo: "text-emerald-400",
};

function MemoryCard({ memory }: { memory: ReturnType<typeof useEcho>["memories"][number] }) {
  const [expanded, setExpanded] = useState(false);
  const Icon = SOURCE_ICONS[memory.sourceType] ?? Type;
  const iconColor = SOURCE_COLORS[memory.sourceType] ?? "text-cyan-400";
  const isLong = memory.content.length > 120;

  return (
    <div
      className="group border border-border/40 bg-card/30 rounded-2xl p-4 hover:border-cyan-500/30 hover:bg-card/50 transition-all cursor-pointer"
      onClick={() => isLong && setExpanded((v) => !v)}
    >
      <div className="flex items-start gap-3">
        <div className={`mt-0.5 shrink-0 ${iconColor}`}>
          <Icon className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <p className={`text-sm text-foreground/90 leading-relaxed ${!expanded && isLong ? "line-clamp-2" : ""}`}>
            {memory.content}
          </p>
          {isLong && (
            <span className="text-[11px] text-cyan-500/60 mt-1 inline-block">
              {expanded ? "Show less" : "Show more"}
            </span>
          )}
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            {memory.people.map((p) => (
              <Badge
                key={p}
                variant="outline"
                className="text-[10px] border-cyan-500/30 text-cyan-300 bg-cyan-500/5 px-1.5 py-0"
              >
                {p}
              </Badge>
            ))}
            {memory.tags.slice(0, 3).map((t) => (
              <Badge
                key={t}
                variant="outline"
                className="text-[10px] border-border/40 text-muted-foreground px-1.5 py-0"
              >
                {t}
              </Badge>
            ))}
          </div>
        </div>
        <span className="text-[11px] text-muted-foreground/60 shrink-0 font-mono">
          {formatDistanceToNow(new Date(memory.createdAt), { addSuffix: true })}
        </span>
      </div>
    </div>
  );
}

export default function EchoHomePage() {
  const [, setLocation] = useLocation();
  const { memories, captureMemory, isLoading, getTodaysForgotten } = useEcho();
  const [quickText, setQuickText] = useState("");
  const [capturing, setCapturing] = useState(false);

  const todaysForgotten = getTodaysForgotten();
  const recentMemories = memories.slice(0, 10);

  const handleQuickCapture = async () => {
    if (!quickText.trim()) return;
    setCapturing(true);
    try {
      await captureMemory(quickText.trim(), "text");
      setQuickText("");
    } finally {
      setCapturing(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      void handleQuickCapture();
    }
  };

  return (
    <EchoLayout>
      <div className="container mx-auto px-4 py-8 max-w-2xl pb-24 md:pb-8">
        {/* Hero tagline */}
        <div className="mb-8 text-center">
          <div className="flex items-center justify-center gap-2 mb-3">
            <Brain className="w-6 h-6 text-cyan-400" />
            <h1 className="text-2xl font-bold text-white tracking-tight">
              Your life, remembered.
            </h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Capture anything. Recall everything.
          </p>
        </div>

        {/* Quick capture */}
        <div className="mb-6">
          <div className="border border-cyan-500/25 bg-card/30 rounded-2xl p-4 focus-within:border-cyan-500/50 transition-all">
            <Textarea
              placeholder="What do you want to remember? A promise, an idea, something someone said…"
              value={quickText}
              onChange={(e) => setQuickText(e.target.value)}
              onKeyDown={handleKeyDown}
              className="bg-transparent border-0 resize-none focus-visible:ring-0 text-sm placeholder:text-muted-foreground/50 p-0 min-h-[72px]"
              rows={3}
            />
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/30">
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground hover:text-violet-400 h-8 px-2"
                  onClick={() => setLocation("/echo/capture")}
                  title="Voice capture"
                >
                  <Mic className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground hover:text-amber-400 h-8 px-2"
                  onClick={() => setLocation("/echo/capture")}
                  title="Upload screenshot or photo"
                >
                  <Image className="w-4 h-4" />
                </Button>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-muted-foreground/50 font-mono hidden sm:inline">
                  ⌘↵ to save
                </span>
                <Button
                  size="sm"
                  onClick={handleQuickCapture}
                  disabled={!quickText.trim() || capturing}
                  className="bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 hover:bg-cyan-500/30 h-8 text-xs"
                  variant="outline"
                >
                  {capturing || isLoading ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    "Remember this"
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Recall search shortcut */}
        <button
          onClick={() => setLocation("/echo/recall")}
          className="w-full mb-6 flex items-center gap-3 px-4 py-3 border border-border/40 bg-card/20 rounded-xl text-muted-foreground hover:border-cyan-500/30 hover:text-cyan-300 hover:bg-cyan-500/5 transition-all text-sm"
        >
          <Search className="w-4 h-4 shrink-0" />
          <span>Ask anything… "What did Sarah say about her birthday?"</span>
          <ChevronRight className="w-4 h-4 ml-auto shrink-0" />
        </button>

        {/* Quick stat cards */}
        <div className="grid grid-cols-3 gap-3 mb-8">
          <button
            onClick={() => setLocation("/echo/today")}
            className="border border-amber-500/25 bg-amber-500/5 rounded-xl p-3 text-center hover:border-amber-500/40 hover:bg-amber-500/10 transition-all"
          >
            <RotateCcw className="w-5 h-5 text-amber-400 mx-auto mb-1" />
            <div className="text-lg font-bold text-white">{todaysForgotten.length}</div>
            <div className="text-[10px] text-muted-foreground font-mono uppercase tracking-wide">Resurfacing</div>
          </button>
          <button
            onClick={() => setLocation("/echo/timeline")}
            className="border border-border/40 bg-card/20 rounded-xl p-3 text-center hover:border-cyan-500/30 hover:bg-cyan-500/5 transition-all"
          >
            <Clock className="w-5 h-5 text-cyan-400 mx-auto mb-1" />
            <div className="text-lg font-bold text-white">{memories.length}</div>
            <div className="text-[10px] text-muted-foreground font-mono uppercase tracking-wide">Memories</div>
          </button>
          <button
            onClick={() => setLocation("/echo/people")}
            className="border border-border/40 bg-card/20 rounded-xl p-3 text-center hover:border-violet-500/30 hover:bg-violet-500/5 transition-all"
          >
            <Users className="w-5 h-5 text-violet-400 mx-auto mb-1" />
            <div className="text-lg font-bold text-white">
              {new Set(memories.flatMap((m) => m.people)).size}
            </div>
            <div className="text-[10px] text-muted-foreground font-mono uppercase tracking-wide">People</div>
          </button>
        </div>

        {/* Today You Forgot teaser */}
        {todaysForgotten.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-amber-400 flex items-center gap-2">
                <RotateCcw className="w-4 h-4" />
                Today You Forgot
              </h2>
              <button
                onClick={() => setLocation("/echo/today")}
                className="text-xs text-muted-foreground hover:text-amber-400 transition-colors"
              >
                See all →
              </button>
            </div>
            <div className="space-y-2">
              {todaysForgotten.slice(0, 2).map((m) => (
                <MemoryCard key={m.id} memory={m} />
              ))}
            </div>
          </div>
        )}

        {/* Recent memories */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Recent Memories
            </h2>
            <button
              onClick={() => setLocation("/echo/timeline")}
              className="text-xs text-muted-foreground hover:text-cyan-400 transition-colors"
            >
              Full timeline →
            </button>
          </div>
          <div className="space-y-2">
            {recentMemories.map((m) => (
              <MemoryCard key={m.id} memory={m} />
            ))}
          </div>
        </div>
      </div>
    </EchoLayout>
  );
}
