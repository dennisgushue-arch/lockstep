import React, { useState } from "react";
import { useLocation } from "wouter";
import { EchoLayout } from "@/components/echo-layout";
import { useEcho, type EchoMemory } from "@/lib/echo-context";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Clock,
  Mic,
  Image,
  Type,
  ChevronDown,
  ChevronUp,
  Filter,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";

type FilterType = "all" | "text" | "voice" | "screenshot" | "photo";

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

function groupByDate(memories: EchoMemory[]): Array<{ label: string; memories: EchoMemory[] }> {
  const groups = new Map<string, EchoMemory[]>();

  for (const m of memories) {
    const d = new Date(m.createdAt);
    const key = format(d, "yyyy-MM-dd");
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(m);
  }

  return Array.from(groups.entries())
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([key, mems]) => {
      const d = new Date(key);
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      let label: string;
      if (format(d, "yyyy-MM-dd") === format(today, "yyyy-MM-dd")) {
        label = "Today";
      } else if (format(d, "yyyy-MM-dd") === format(yesterday, "yyyy-MM-dd")) {
        label = "Yesterday";
      } else {
        label = format(d, "MMMM d, yyyy");
      }
      return { label, memories: mems };
    });
}

function MemoryRow({ memory }: { memory: EchoMemory }) {
  const [expanded, setExpanded] = useState(false);
  const Icon = SOURCE_ICONS[memory.sourceType] ?? Type;
  const iconColor = SOURCE_COLORS[memory.sourceType] ?? "text-cyan-400";
  const isLong = memory.content.length > 120;

  return (
    <div className="relative pl-8">
      {/* Timeline dot */}
      <div className="absolute left-0 top-3.5 w-3 h-3 rounded-full border-2 border-cyan-500/40 bg-background" />
      {/* Timeline line — rendered by parent */}

      <div
        className="border border-border/30 bg-card/20 rounded-xl p-3.5 hover:border-border/50 hover:bg-card/30 transition-all"
        onClick={() => isLong && setExpanded((v) => !v)}
      >
        <div className="flex items-start gap-2.5">
          <div className={`shrink-0 mt-0.5 ${iconColor}`}>
            <Icon className="w-3.5 h-3.5" />
          </div>
          <div className="flex-1 min-w-0">
            <p
              className={`text-sm text-foreground/85 leading-relaxed ${!expanded && isLong ? "line-clamp-2" : ""}`}
            >
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
              {memory.people.map((p) => (
                <Badge
                  key={p}
                  variant="outline"
                  className="text-[10px] border-cyan-500/25 text-cyan-300/80 px-1.5 py-0"
                >
                  {p}
                </Badge>
              ))}
              {memory.tags.slice(0, 2).map((t) => (
                <Badge
                  key={t}
                  variant="outline"
                  className="text-[10px] border-border/30 text-muted-foreground/60 px-1.5 py-0"
                >
                  {t}
                </Badge>
              ))}
              <span className="text-[10px] text-muted-foreground/40 font-mono ml-auto">
                {format(new Date(memory.createdAt), "h:mm a")}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function EchoTimelinePage() {
  const [, setLocation] = useLocation();
  const { memories } = useEcho();
  const [filter, setFilter] = useState<FilterType>("all");
  const [showFilter, setShowFilter] = useState(false);

  const filtered = filter === "all" ? memories : memories.filter((m) => m.sourceType === filter);
  const grouped = groupByDate(filtered);

  const filterOptions: { id: FilterType; label: string; icon: React.ElementType }[] = [
    { id: "all", label: "All", icon: Clock },
    { id: "text", label: "Text", icon: Type },
    { id: "voice", label: "Voice", icon: Mic },
    { id: "screenshot", label: "Screenshot", icon: Image },
    { id: "photo", label: "Photo", icon: Image },
  ];

  return (
    <EchoLayout>
      <div className="container mx-auto px-4 py-8 max-w-2xl pb-24 md:pb-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              <Clock className="w-5 h-5 text-cyan-400" />
              Memory Timeline
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {memories.length} memories captured
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5 text-xs text-muted-foreground hover:text-foreground"
            onClick={() => setShowFilter((v) => !v)}
          >
            <Filter className="w-3.5 h-3.5" />
            Filter
          </Button>
        </div>

        {/* Filter row */}
        {showFilter && (
          <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
            {filterOptions.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setFilter(id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all whitespace-nowrap ${
                  filter === id
                    ? "border-cyan-500/40 bg-cyan-500/10 text-cyan-300"
                    : "border-border/30 text-muted-foreground hover:border-border hover:text-foreground"
                }`}
              >
                <Icon className="w-3 h-3" />
                {label}
              </button>
            ))}
          </div>
        )}

        {grouped.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground/60 text-sm">
            <Clock className="w-10 h-10 mx-auto mb-3 opacity-30" />
            No memories match this filter.
          </div>
        ) : (
          <div className="space-y-8">
            {grouped.map(({ label, memories: group }) => (
              <div key={label}>
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-xs font-mono uppercase tracking-widest text-muted-foreground/60">
                    {label}
                  </span>
                  <div className="flex-1 h-px bg-border/20" />
                  <span className="text-[11px] text-muted-foreground/40">
                    {group.length}
                  </span>
                </div>
                <div className="relative space-y-3">
                  {/* Vertical timeline line */}
                  <div className="absolute left-[5px] top-0 bottom-0 w-px bg-cyan-500/15" />
                  {group.map((m) => (
                    <MemoryRow key={m.id} memory={m} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </EchoLayout>
  );
}
