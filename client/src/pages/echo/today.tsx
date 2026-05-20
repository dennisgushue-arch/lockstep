import React, { useState } from "react";
import { useLocation } from "wouter";
import { EchoLayout } from "@/components/echo-layout";
import { useEcho, type EchoMemory } from "@/lib/echo-context";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  RotateCcw,
  CheckCheck,
  X,
  Clock,
  Loader2,
  Brain,
  Mic,
  Image,
  Type,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useToast } from "@/hooks/use-toast";

const CATEGORY_LABELS: Record<string, { label: string; color: string }> = {
  commitment: { label: "Promise / Action", color: "text-amber-400 border-amber-500/30 bg-amber-500/5" },
  high: { label: "Sentimental", color: "text-rose-400 border-rose-500/30 bg-rose-500/5" },
  people: { label: "About Someone", color: "text-cyan-400 border-cyan-500/30 bg-cyan-500/5" },
  resurface: { label: "Flagged", color: "text-violet-400 border-violet-500/30 bg-violet-500/5" },
};

const SOURCE_ICONS: Record<string, React.ElementType> = {
  text: Type,
  voice: Mic,
  screenshot: Image,
  photo: Image,
};

function classifyResurface(memory: EchoMemory): string {
  if (memory.resurface) return "resurface";
  const lower = memory.content.toLowerCase();
  if (
    ["promise", "follow up", "i should", "i need to", "i'll", "i will", "remind"].some((w) =>
      lower.includes(w)
    )
  )
    return "commitment";
  if (memory.emotionalWeight === "high") return "high";
  if (memory.people.length > 0) return "people";
  return "resurface";
}

function ResurfaceCard({
  memory,
  onAcknowledge,
  onDismiss,
}: {
  memory: EchoMemory;
  onAcknowledge: (id: string) => void;
  onDismiss: (id: string) => void;
}) {
  const Icon = SOURCE_ICONS[memory.sourceType] ?? Type;
  const category = classifyResurface(memory);
  const catMeta = CATEGORY_LABELS[category] ?? CATEGORY_LABELS.resurface;

  return (
    <div className="border border-border/40 bg-card/30 rounded-2xl p-4 hover:border-border/60 transition-all">
      <div className="flex items-start gap-3">
        <div className="shrink-0 mt-0.5">
          <Icon className="w-4 h-4 text-muted-foreground/60" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-foreground/90 leading-relaxed mb-2">
            {memory.content}
          </p>
          <div className="flex items-center gap-2 flex-wrap mb-3">
            <Badge
              variant="outline"
              className={`text-[10px] px-1.5 py-0 ${catMeta.color}`}
            >
              {catMeta.label}
            </Badge>
            {memory.people.map((p) => (
              <Badge
                key={p}
                variant="outline"
                className="text-[10px] border-cyan-500/30 text-cyan-300 px-1.5 py-0"
              >
                {p}
              </Badge>
            ))}
            <span className="text-[10px] text-muted-foreground/50 font-mono flex items-center gap-1">
              <Clock className="w-2.5 h-2.5" />
              {formatDistanceToNow(new Date(memory.createdAt), { addSuffix: true })}
            </span>
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 gap-1"
              onClick={() => onAcknowledge(memory.id)}
            >
              <CheckCheck className="w-3 h-3" />
              On it
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 text-xs text-muted-foreground hover:text-foreground gap-1"
              onClick={() => onDismiss(memory.id)}
            >
              <X className="w-3 h-3" />
              Dismiss
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function EchoTodayPage() {
  const { getTodaysForgotten, markResurfaceAcknowledged, dismissResurface, triggerDailyResurface } =
    useEcho();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [triggering, setTriggering] = useState(false);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  const allForgotten = getTodaysForgotten().filter((m) => !dismissed.has(m.id));

  const handleAcknowledge = (id: string) => {
    markResurfaceAcknowledged(id);
    setDismissed((prev) => new Set(Array.from(prev).concat(id)));
    toast({ title: "Marked as handled", description: "Great — one less thing to forget." });
  };

  const handleDismiss = (id: string) => {
    dismissResurface(id);
    setDismissed((prev) => new Set(Array.from(prev).concat(id)));
  };

  const handleTriggerResurface = async () => {
    setTriggering(true);
    try {
      await triggerDailyResurface();
      toast({
        title: "Daily resurface triggered",
        description: "ECHO has queued memories to resurface.",
      });
    } finally {
      setTriggering(false);
    }
  };

  return (
    <EchoLayout>
      <div className="container mx-auto px-4 py-8 max-w-2xl pb-24 md:pb-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <RotateCcw className="w-5 h-5 text-amber-400" />
            <h1 className="text-xl font-bold text-white">Today You Forgot</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            ECHO surfaces what matters before it disappears forever.
          </p>
        </div>

        {allForgotten.length === 0 ? (
          <div className="text-center py-16">
            <Brain className="w-12 h-12 text-cyan-400/30 mx-auto mb-4" />
            <p className="text-muted-foreground text-sm mb-2">
              Nothing to resurface right now.
            </p>
            <p className="text-muted-foreground/60 text-xs mb-6">
              Keep capturing memories and ECHO will surface the important ones.
            </p>
            <Button
              variant="outline"
              size="sm"
              className="border-border/40 text-muted-foreground hover:text-foreground text-xs"
              onClick={() => setLocation("/echo/capture")}
            >
              Capture a Memory
            </Button>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs font-mono uppercase tracking-wide text-muted-foreground/60">
                {allForgotten.length} thing{allForgotten.length !== 1 ? "s" : ""} resurfacing
              </p>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs text-muted-foreground hover:text-foreground gap-1"
                onClick={handleTriggerResurface}
                disabled={triggering}
              >
                {triggering ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <RotateCcw className="w-3 h-3" />
                )}
                Refresh
              </Button>
            </div>

            <div className="space-y-3">
              {allForgotten.map((m) => (
                <ResurfaceCard
                  key={m.id}
                  memory={m}
                  onAcknowledge={handleAcknowledge}
                  onDismiss={handleDismiss}
                />
              ))}
            </div>

            <div className="mt-6 border-t border-border/20 pt-6">
              <p className="text-xs text-muted-foreground/40 text-center">
                ECHO resurfaces commitments, promises, and emotional moments you haven't revisited.
              </p>
            </div>
          </>
        )}
      </div>
    </EchoLayout>
  );
}
