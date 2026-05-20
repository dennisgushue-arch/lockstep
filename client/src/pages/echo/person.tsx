import React, { useState } from "react";
import { useRoute, useLocation } from "wouter";
import { EchoLayout } from "@/components/echo-layout";
import { useEcho, type EchoMemory } from "@/lib/echo-context";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  Mic,
  Image,
  Type,
  ChevronDown,
  ChevronUp,
  Search,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

const SOURCE_ICONS: Record<string, React.ElementType> = {
  text: Type,
  voice: Mic,
  screenshot: Image,
  photo: Image,
};

function MemoryCard({ memory }: { memory: EchoMemory }) {
  const [expanded, setExpanded] = useState(false);
  const Icon = SOURCE_ICONS[memory.sourceType] ?? Type;
  const isLong = memory.content.length > 120;

  return (
    <div
      className="border border-border/30 bg-card/20 rounded-xl p-4 hover:border-border/50 transition-all"
      onClick={() => isLong && setExpanded((v) => !v)}
    >
      <div className="flex items-start gap-2.5">
        <Icon className="w-3.5 h-3.5 text-muted-foreground/60 mt-1 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className={`text-sm text-foreground/85 leading-relaxed ${!expanded && isLong ? "line-clamp-3" : ""}`}>
            {memory.content}
          </p>
          {isLong && (
            <button
              className="flex items-center gap-1 text-[11px] text-cyan-500/60 mt-1 hover:text-cyan-400 transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                setExpanded((v) => !v);
              }}
            >
              {expanded ? (
                <>
                  <ChevronUp className="w-3 h-3" /> Less
                </>
              ) : (
                <>
                  <ChevronDown className="w-3 h-3" /> More
                </>
              )}
            </button>
          )}
          <div className="flex items-center gap-1.5 mt-2 flex-wrap">
            {memory.tags.slice(0, 3).map((t) => (
              <Badge
                key={t}
                variant="outline"
                className="text-[10px] border-border/30 text-muted-foreground/60 px-1.5 py-0"
              >
                {t}
              </Badge>
            ))}
            <span className="text-[10px] text-muted-foreground/40 font-mono ml-auto">
              {formatDistanceToNow(new Date(memory.createdAt), { addSuffix: true })}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function EchoPersonPage() {
  const [, setLocation] = useLocation();
  const [match, params] = useRoute<{ name: string }>("/echo/people/:name");
  const { getMemoriesByPerson } = useEcho();

  if (!match) return null;

  const name = decodeURIComponent(params.name ?? "");
  const personMemories = getMemoriesByPerson(name);

  return (
    <EchoLayout>
      <div className="container mx-auto px-4 py-8 max-w-2xl pb-24 md:pb-8">
        {/* Back button */}
        <button
          onClick={() => setLocation("/echo/people")}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          All People
        </button>

        {/* Person header */}
        <div className="flex items-center gap-4 mb-8">
          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-violet-500/25 to-cyan-500/25 border border-border/40 flex items-center justify-center text-xl font-bold text-white">
            {name.charAt(0).toUpperCase()}
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">{name}</h1>
            <p className="text-sm text-muted-foreground">
              {personMemories.length} memory{personMemories.length !== 1 ? "s" : ""} captured
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="ml-auto border-border/40 text-muted-foreground hover:text-foreground gap-1.5 text-xs"
            onClick={() => setLocation(`/echo/recall?q=Tell me about ${encodeURIComponent(name)}`)}
          >
            <Search className="w-3.5 h-3.5" />
            Ask ECHO
          </Button>
        </div>

        {personMemories.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground/60 text-sm">
            No memories found for {name}.
          </div>
        ) : (
          <div className="space-y-3">
            {personMemories.map((m) => (
              <MemoryCard key={m.id} memory={m} />
            ))}
          </div>
        )}
      </div>
    </EchoLayout>
  );
}
