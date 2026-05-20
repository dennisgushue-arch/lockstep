import React from "react";
import { useLocation } from "wouter";
import { EchoLayout } from "@/components/echo-layout";
import { useEcho } from "@/lib/echo-context";
import { Badge } from "@/components/ui/badge";
import { Users, ChevronRight, MessageSquare } from "lucide-react";

const RELATIONSHIP_COLORS: Record<string, string> = {
  spouse: "text-rose-400 border-rose-500/30 bg-rose-500/5",
  child: "text-cyan-400 border-cyan-500/30 bg-cyan-500/5",
  parent: "text-amber-400 border-amber-500/30 bg-amber-500/5",
  friend: "text-emerald-400 border-emerald-500/30 bg-emerald-500/5",
  colleague: "text-violet-400 border-violet-500/30 bg-violet-500/5",
  other: "text-muted-foreground border-border/30",
};

// Simple relationship guesser from memory context
function guessRelationship(name: string, memories: ReturnType<typeof useEcho>["memories"]): string {
  const content = memories
    .filter((m) => m.people.includes(name))
    .map((m) => m.content.toLowerCase())
    .join(" ");

  if (
    content.includes("wife") ||
    content.includes("husband") ||
    content.includes("anniversary") ||
    name.toLowerCase() === "sarah"
  )
    return "spouse";
  if (
    content.includes("son") ||
    content.includes("daughter") ||
    content.includes("kid") ||
    content.includes("first word") ||
    ["dax", "liam", "emma"].includes(name.toLowerCase())
  )
    return "child";
  if (
    content.includes("mom") ||
    content.includes("dad") ||
    content.includes("mother") ||
    content.includes("father") ||
    name.toLowerCase() === "mom" ||
    name.toLowerCase() === "dad"
  )
    return "parent";
  if (
    content.includes("conference") ||
    content.includes("investor") ||
    content.includes("partnership") ||
    content.includes("business") ||
    ["greg", "jake"].includes(name.toLowerCase())
  )
    return "colleague";
  return "friend";
}

export default function EchoPeoplePage() {
  const [, setLocation] = useLocation();
  const { memories, getPeopleList, getMemoriesByPerson } = useEcho();

  const people = getPeopleList();

  if (people.length === 0) {
    return (
      <EchoLayout>
        <div className="container mx-auto px-4 py-16 max-w-2xl text-center pb-24">
          <Users className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
          <p className="text-muted-foreground text-sm">
            No people in your memories yet.
          </p>
          <p className="text-muted-foreground/60 text-xs mt-1">
            Mention someone by name when capturing a memory.
          </p>
        </div>
      </EchoLayout>
    );
  }

  return (
    <EchoLayout>
      <div className="container mx-auto px-4 py-8 max-w-2xl pb-24 md:pb-8">
        <div className="mb-6">
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-violet-400" />
            People
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            People who appear in your memories
          </p>
        </div>

        <div className="space-y-2">
          {people.map((name) => {
            const personMemories = getMemoriesByPerson(name);
            const rel = guessRelationship(name, memories);
            const colorClass = RELATIONSHIP_COLORS[rel] ?? RELATIONSHIP_COLORS.other;
            const latest = personMemories[0];

            return (
              <button
                key={name}
                onClick={() => setLocation(`/echo/people/${encodeURIComponent(name)}`)}
                className="w-full flex items-center gap-4 p-4 border border-border/30 bg-card/20 rounded-2xl hover:border-violet-500/30 hover:bg-violet-500/5 transition-all text-left group"
              >
                {/* Avatar */}
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500/20 to-cyan-500/20 border border-border/40 flex items-center justify-center text-sm font-bold text-white shrink-0">
                  {name.charAt(0).toUpperCase()}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="font-semibold text-white text-sm">{name}</span>
                    <Badge
                      variant="outline"
                      className={`text-[10px] px-1.5 py-0 capitalize ${colorClass}`}
                    >
                      {rel}
                    </Badge>
                  </div>
                  {latest && (
                    <p className="text-xs text-muted-foreground/60 truncate">
                      {latest.content}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <Badge
                    variant="outline"
                    className="border-border/30 text-muted-foreground/60 text-[11px] gap-1"
                  >
                    <MessageSquare className="w-2.5 h-2.5" />
                    {personMemories.length}
                  </Badge>
                  <ChevronRight className="w-4 h-4 text-muted-foreground/40 group-hover:text-violet-400 transition-colors" />
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </EchoLayout>
  );
}
