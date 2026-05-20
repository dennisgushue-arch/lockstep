import React, { useState, useRef } from "react";
import { EchoLayout } from "@/components/echo-layout";
import { useEcho, type EchoMemory } from "@/lib/echo-context";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, Loader2, Mic, Type, Image, Sparkles, ChevronDown, ChevronUp } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

const EXAMPLE_QUERIES = [
  "What did my wife say she wanted for her birthday?",
  "What idea did I have about batting cages?",
  "When did Dax mention wanting a new glove?",
  "What restaurant did we love in San Diego?",
  "What workouts work best for my knees?",
  "What promise did I make last week?",
  "What did Alex recommend I read?",
  "What did I note about investors?",
];

const SOURCE_ICONS: Record<string, React.ElementType> = {
  text: Type,
  voice: Mic,
  screenshot: Image,
  photo: Image,
};

function SourceCard({
  memory,
  index,
}: {
  memory: EchoMemory;
  index: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const Icon = SOURCE_ICONS[memory.sourceType] ?? Type;
  const isLong = memory.content.length > 100;

  return (
    <div className="border border-border/30 bg-card/20 rounded-xl p-4">
      <div className="flex items-start gap-3">
        <div className="shrink-0 w-6 h-6 rounded-full bg-cyan-500/15 border border-cyan-500/25 flex items-center justify-center text-[11px] font-bold text-cyan-400">
          {index + 1}
        </div>
        <div className="flex-1 min-w-0">
          <p className={`text-sm text-foreground/85 leading-relaxed ${!expanded && isLong ? "line-clamp-2" : ""}`}>
            {memory.content}
          </p>
          {isLong && (
            <button
              className="flex items-center gap-1 text-[11px] text-cyan-500/60 mt-1 hover:text-cyan-400 transition-colors"
              onClick={() => setExpanded((v) => !v)}
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
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            {memory.people.map((p) => (
              <Badge
                key={p}
                variant="outline"
                className="text-[10px] border-cyan-500/30 text-cyan-300 px-1.5 py-0"
              >
                {p}
              </Badge>
            ))}
            <Badge
              variant="outline"
              className="text-[10px] border-border/30 text-muted-foreground px-1.5 py-0 gap-1"
            >
              <Icon className="w-2.5 h-2.5" />
              {memory.sourceType}
            </Badge>
            <span className="text-[10px] text-muted-foreground/50 font-mono">
              {formatDistanceToNow(new Date(memory.createdAt), { addSuffix: true })}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function EchoRecallPage() {
  const { recallMemories, isLoading } = useEcho();
  const [query, setQuery] = useState("");
  const [answer, setAnswer] = useState<string | null>(null);
  const [sources, setSources] = useState<EchoMemory[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const handleRecall = async (q?: string) => {
    const searchQuery = q ?? query;
    if (!searchQuery.trim()) return;

    setAnswer(null);
    setSources([]);
    setHasSearched(true);

    const result = await recallMemories(searchQuery.trim());
    setAnswer(result.answer);
    setSources(result.sources);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      void handleRecall();
    }
  };

  const handleExampleClick = (q: string) => {
    setQuery(q);
    void handleRecall(q);
  };

  return (
    <EchoLayout>
      <div className="container mx-auto px-4 py-8 max-w-2xl pb-24 md:pb-8">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Sparkles className="w-5 h-5 text-cyan-400" />
            <h1 className="text-xl font-bold text-white">Recall Anything</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Ask a question about your life. ECHO searches your memories.
          </p>
        </div>

        {/* Search input */}
        <div className="mb-6">
          <div
            className={`border rounded-2xl bg-card/30 p-4 transition-all ${
              isLoading
                ? "border-cyan-500/40"
                : "border-cyan-500/25 focus-within:border-cyan-500/50"
            }`}
          >
            <div className="flex items-start gap-3">
              <Search className="w-4 h-4 text-cyan-400 mt-1 shrink-0" />
              <textarea
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="What do you want to remember?"
                rows={2}
                className="flex-1 bg-transparent border-0 resize-none focus:outline-none text-sm placeholder:text-muted-foreground/50 text-white leading-relaxed"
                disabled={isLoading}
              />
            </div>
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/30">
              <span className="text-[11px] text-muted-foreground/40 font-mono hidden sm:inline">
                ⌘↵ to search
              </span>
              <Button
                size="sm"
                onClick={() => handleRecall()}
                disabled={!query.trim() || isLoading}
                className="bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 hover:bg-cyan-500/30 h-8 text-xs ml-auto"
                variant="outline"
              >
                {isLoading ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                ) : (
                  <Search className="w-3.5 h-3.5 mr-1.5" />
                )}
                {isLoading ? "Searching…" : "Search"}
              </Button>
            </div>
          </div>
        </div>

        {/* Answer */}
        {answer && !isLoading && (
          <div className="mb-6">
            <div className="border border-cyan-500/25 bg-cyan-500/5 rounded-2xl p-5">
              <div className="flex items-start gap-3">
                <Sparkles className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-mono uppercase tracking-wide text-cyan-500/60 mb-2">
                    ECHO remembers
                  </p>
                  <p className="text-sm text-white leading-relaxed">{answer}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Source memories */}
        {sources.length > 0 && !isLoading && (
          <div className="mb-8">
            <p className="text-xs font-mono uppercase tracking-wide text-muted-foreground/60 mb-3">
              Source memories ({sources.length})
            </p>
            <div className="space-y-2">
              {sources.map((m, i) => (
                <SourceCard key={m.id} memory={m} index={i} />
              ))}
            </div>
          </div>
        )}

        {/* No results */}
        {hasSearched && sources.length === 0 && !isLoading && (
          <div className="text-center py-8 text-muted-foreground/60 text-sm">
            <Search className="w-8 h-8 mx-auto mb-3 opacity-30" />
            No matching memories found.
          </div>
        )}

        {/* Loading state */}
        {isLoading && (
          <div className="text-center py-8">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-cyan-400 mb-3" />
            <p className="text-sm text-muted-foreground">
              Searching your memories…
            </p>
          </div>
        )}

        {/* Example queries */}
        {!hasSearched && (
          <div>
            <p className="text-xs font-mono uppercase tracking-wide text-muted-foreground/60 mb-3">
              Try asking…
            </p>
            <div className="space-y-2">
              {EXAMPLE_QUERIES.map((q) => (
                <button
                  key={q}
                  onClick={() => handleExampleClick(q)}
                  className="w-full text-left px-4 py-3 rounded-xl border border-border/30 text-sm text-muted-foreground hover:border-cyan-500/30 hover:text-cyan-300 hover:bg-cyan-500/5 transition-all"
                >
                  "{q}"
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </EchoLayout>
  );
}
