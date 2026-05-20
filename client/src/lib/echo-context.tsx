import React, { createContext, useContext, useState, useCallback } from "react";
import { supabase } from "./supabase";

// ─── Types ────────────────────────────────────────────────────────────────────

export type MemorySourceType = "text" | "voice" | "screenshot" | "photo";
export type EmotionalWeight = "low" | "medium" | "high";

export interface EchoMemory {
  id: string;
  userId: string;
  content: string;
  sourceType: MemorySourceType;
  rawFileUrl?: string;
  tags: string[];
  people: string[];
  emotionalWeight: EmotionalWeight;
  createdAt: string;
  resurface: boolean;
  resurfacedAt?: string;
}

export interface RecallResult {
  answer: string;
  sources: EchoMemory[];
}

export interface EchoContextValue {
  memories: EchoMemory[];
  isLoading: boolean;
  captureMemory: (
    content: string,
    sourceType: MemorySourceType,
    rawFileUrl?: string
  ) => Promise<EchoMemory>;
  recallMemories: (query: string) => Promise<RecallResult>;
  getTodaysForgotten: () => EchoMemory[];
  getPeopleList: () => string[];
  getMemoriesByPerson: (name: string) => EchoMemory[];
  dismissResurface: (id: string) => void;
  markResurfaceAcknowledged: (id: string) => void;
  triggerDailyResurface: () => Promise<void>;
}

// ─── Seed memories ────────────────────────────────────────────────────────────

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
}

const SEED_MEMORIES: EchoMemory[] = [
  {
    id: "mem_1",
    userId: "echo_demo_user",
    content:
      "Sarah said she'd love that cashmere cardigan from Anthropologie — dark green, the one near the front of the store. She kept touching it and then put it back.",
    sourceType: "text",
    createdAt: daysAgo(3),
    tags: ["gift", "clothing", "anniversary", "cardigan"],
    people: ["Sarah"],
    emotionalWeight: "high",
    resurface: false,
  },
  {
    id: "mem_2",
    userId: "echo_demo_user",
    content:
      "Dax mentioned wanting a new baseball glove. He specifically said Louisville Slugger, the same brand as his favorite player. Size medium.",
    sourceType: "text",
    createdAt: daysAgo(5),
    tags: ["gift", "baseball", "glove", "sports"],
    people: ["Dax"],
    emotionalWeight: "medium",
    resurface: false,
  },
  {
    id: "mem_3",
    userId: "echo_demo_user",
    content:
      "Business idea: batting cage subscription service near suburban malls. Families pay $80/month for unlimited time slots. Nobody's done this at scale. Could partner with youth leagues.",
    sourceType: "text",
    createdAt: daysAgo(8),
    tags: ["business idea", "batting cage", "subscription", "sports", "family"],
    people: [],
    emotionalWeight: "medium",
    resurface: true,
  },
  {
    id: "mem_4",
    userId: "echo_demo_user",
    content:
      "Emma said her first real sentence today: 'I want more bananas, Daddy.' She looked so proud of herself. I almost cried.",
    sourceType: "text",
    createdAt: daysAgo(12),
    tags: ["milestone", "first sentence", "Emma", "parenting"],
    people: ["Emma"],
    emotionalWeight: "high",
    resurface: false,
  },
  {
    id: "mem_5",
    userId: "echo_demo_user",
    content:
      "I need to follow up with Greg about the partnership proposal he sent. He mentioned a deadline at the end of the month. Don't let this one slip — it could be worth a lot.",
    sourceType: "text",
    createdAt: daysAgo(4),
    tags: ["commitment", "follow up", "business", "partnership"],
    people: ["Greg"],
    emotionalWeight: "high",
    resurface: true,
  },
  {
    id: "mem_6",
    userId: "echo_demo_user",
    content:
      "San Diego trip was incredible. The best meal was at The Waterfront restaurant in Little Italy. Had a clam chowder that still haunts me. Sarah ordered the halibut. We sat outside by the water.",
    sourceType: "photo",
    createdAt: daysAgo(45),
    tags: ["travel", "San Diego", "restaurant", "Little Italy", "vacation"],
    people: ["Sarah"],
    emotionalWeight: "high",
    resurface: false,
  },
  {
    id: "mem_7",
    userId: "echo_demo_user",
    content:
      "Sarah mentioned she's been thinking about pottery classes. She saw a studio downtown — 'Clay & Co' — that does beginner sessions on Saturday mornings. She lit up talking about it.",
    sourceType: "text",
    createdAt: daysAgo(7),
    tags: ["gift idea", "pottery", "hobby", "classes"],
    people: ["Sarah"],
    emotionalWeight: "medium",
    resurface: false,
  },
  {
    id: "mem_8",
    userId: "echo_demo_user",
    content:
      "Training insight: morning runs feel much better when I eat a banana 30 minutes before and do 5 minutes of hip flexor stretching first. Game changer for the first mile.",
    sourceType: "voice",
    createdAt: daysAgo(6),
    tags: ["fitness", "running", "training", "nutrition", "routine"],
    people: [],
    emotionalWeight: "low",
    resurface: false,
  },
  {
    id: "mem_9",
    userId: "echo_demo_user",
    content:
      "Liam asked me at bedtime: 'Dad, why do we have to sleep? What if we miss something important?' He's 6 years old and already worrying about FOMO. I didn't have a good answer.",
    sourceType: "text",
    createdAt: daysAgo(9),
    tags: ["parenting", "bedtime", "funny", "wisdom"],
    people: ["Liam"],
    emotionalWeight: "high",
    resurface: false,
  },
  {
    id: "mem_10",
    userId: "echo_demo_user",
    content:
      "Met Jake at the Wellness Tech conference. He's at Anchor Capital — they write $250k–$2M checks into health and wellness apps. He said to reach out directly: jake@anchorcap.com",
    sourceType: "screenshot",
    createdAt: daysAgo(14),
    tags: ["investor", "networking", "fundraising", "VC", "wellness"],
    people: ["Jake"],
    emotionalWeight: "medium",
    resurface: true,
  },
  {
    id: "mem_11",
    userId: "echo_demo_user",
    content:
      "I promised Mom I'd help her set up her new iPad before her birthday. She's been struggling with the camera app and wants to video call the grandkids. I should do this this weekend.",
    sourceType: "text",
    createdAt: daysAgo(2),
    tags: ["commitment", "family", "promise", "iPad", "tech help"],
    people: ["Mom"],
    emotionalWeight: "high",
    resurface: true,
  },
  {
    id: "mem_12",
    userId: "echo_demo_user",
    content:
      "Marcus told me Bulgarian split squats work way better than regular lunges for knee pain. He's been doing 4 sets of 8 each leg, no added weight yet. My knees have been bad lately — should try this.",
    sourceType: "voice",
    createdAt: daysAgo(10),
    tags: ["fitness", "workout", "knee pain", "exercise"],
    people: ["Marcus"],
    emotionalWeight: "low",
    resurface: false,
  },
  {
    id: "mem_13",
    userId: "echo_demo_user",
    content:
      "Alex recommended 'The Almanack of Naval Ravikant' after we talked about compounding and long-term thinking. He said it changed how he thinks about wealth. Need to order this.",
    sourceType: "text",
    createdAt: daysAgo(11),
    tags: ["book", "recommendation", "reading", "Naval Ravikant"],
    people: ["Alex"],
    emotionalWeight: "medium",
    resurface: false,
  },
  {
    id: "mem_14",
    userId: "echo_demo_user",
    content:
      "Overheard two people at the coffee shop talking about how nobody makes a premium subscription box specifically for senior dogs — older dogs with joint issues, special diets. They were complaining there's nothing good out there.",
    sourceType: "text",
    createdAt: daysAgo(16),
    tags: ["business idea", "dogs", "subscription box", "pet", "senior dogs"],
    people: [],
    emotionalWeight: "medium",
    resurface: false,
  },
  {
    id: "mem_15",
    userId: "echo_demo_user",
    content:
      "Sarah stopped in front of a cedar wood candle at Anthropologie and literally just stood there smelling it for two minutes. She loves that smell. Noted for future.",
    sourceType: "text",
    createdAt: daysAgo(18),
    tags: ["gift idea", "candle", "cedar", "Sarah", "scent"],
    people: ["Sarah"],
    emotionalWeight: "medium",
    resurface: false,
  },
];

// ─── Mock recall engine ────────────────────────────────────────────────────────

function scoreMemory(memory: EchoMemory, queryWords: string[]): number {
  const haystack = [
    memory.content,
    ...memory.tags,
    ...memory.people,
  ]
    .join(" ")
    .toLowerCase();

  let score = 0;
  for (const word of queryWords) {
    if (word.length < 3) continue;
    if (haystack.includes(word)) {
      score += 1;
      // Bonus if it appears in tags or people (more specific)
      if (memory.tags.some((t) => t.toLowerCase().includes(word))) score += 0.5;
      if (memory.people.some((p) => p.toLowerCase().includes(word))) score += 0.5;
    }
  }
  // Boost high emotional weight
  if (memory.emotionalWeight === "high") score += 0.3;
  return score;
}

function generateMockAnswer(query: string, sources: EchoMemory[]): string {
  if (sources.length === 0) {
    return "I couldn't find any matching memories for that query. Try capturing more moments — even a quick text note is enough for me to remember it later.";
  }

  const q = query.toLowerCase();

  // Gift / what does someone want
  if (
    q.includes("want") ||
    q.includes("gift") ||
    q.includes("birthday") ||
    q.includes("wish")
  ) {
    const giftMem = sources.find(
      (m) => m.tags.includes("gift") || m.tags.includes("gift idea")
    );
    if (giftMem) {
      const person = giftMem.people[0] ?? "them";
      return `Based on your memories, ${person} would love: ${giftMem.content.split(".")[0]}. You captured this ${timeAgo(giftMem.createdAt)}.`;
    }
  }

  // Business ideas
  if (
    q.includes("idea") ||
    q.includes("business") ||
    q.includes("startup") ||
    q.includes("batting")
  ) {
    const bizMem = sources.find((m) => m.tags.includes("business idea"));
    if (bizMem) {
      return `You had a business idea: ${bizMem.content.split(".")[0]}. You captured this ${timeAgo(bizMem.createdAt)}.`;
    }
  }

  // Restaurant / travel
  if (
    q.includes("restaurant") ||
    q.includes("food") ||
    q.includes("san diego") ||
    q.includes("trip") ||
    q.includes("travel")
  ) {
    const travelMem = sources.find((m) => m.tags.includes("travel") || m.tags.includes("restaurant"));
    if (travelMem) {
      return `Here's what you captured about that: ${travelMem.content.split(".")[0]}. Saved ${timeAgo(travelMem.createdAt)}.`;
    }
  }

  // Workouts / fitness
  if (
    q.includes("workout") ||
    q.includes("exercise") ||
    q.includes("run") ||
    q.includes("glute") ||
    q.includes("knee") ||
    q.includes("split squat")
  ) {
    const fitMem = sources.find((m) => m.tags.includes("fitness") || m.tags.includes("workout"));
    if (fitMem) {
      const who = fitMem.people[0];
      const credit = who ? `${who} told you: ` : "You noted: ";
      return `${credit}${fitMem.content.split(".")[0]}. You saved this ${timeAgo(fitMem.createdAt)}.`;
    }
  }

  // Generic response with top result
  const top = sources[0];
  const person = top.people[0];
  const intro = person
    ? `Regarding ${person}, you noted ${timeAgo(top.createdAt)}: `
    : `You captured ${timeAgo(top.createdAt)}: `;
  return `${intro}${top.content.split(".")[0]}.${sources.length > 1 ? ` I also found ${sources.length - 1} related memory${sources.length > 2 ? "s" : ""} below.` : ""}`;
}

function timeAgo(isoDate: string): string {
  const diff = Date.now() - new Date(isoDate).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 7) return `${days} days ago`;
  if (days < 30) return `${Math.floor(days / 7)} week${days >= 14 ? "s" : ""} ago`;
  if (days < 365) return `${Math.floor(days / 30)} month${days >= 60 ? "s" : ""} ago`;
  return `${Math.floor(days / 365)} year${days >= 730 ? "s" : ""} ago`;
}

const ACTION_WORDS = [
  "i should",
  "i need to",
  "i'll",
  "i will",
  "promise",
  "follow up",
  "remind",
  "don't forget",
  "i want to",
  "must",
  "have to",
];

// ─── Context ──────────────────────────────────────────────────────────────────

const EchoContext = createContext<EchoContextValue | null>(null);

const ECHO_MEMORIES_STORAGE_KEY = "echo_memories_v1";

function loadStoredMemories(): EchoMemory[] {
  if (typeof window === "undefined") return SEED_MEMORIES;
  try {
    const raw = localStorage.getItem(ECHO_MEMORIES_STORAGE_KEY);
    if (!raw) return SEED_MEMORIES;
    const stored = JSON.parse(raw) as EchoMemory[];
    // Merge seeds that aren't already in stored list
    const storedIds = new Set(stored.map((m) => m.id));
    const merged = [
      ...stored,
      ...SEED_MEMORIES.filter((m) => !storedIds.has(m.id)),
    ];
    return merged.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  } catch {
    return SEED_MEMORIES;
  }
}

function saveMemories(memories: EchoMemory[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(ECHO_MEMORIES_STORAGE_KEY, JSON.stringify(memories));
  } catch {
    // ignore storage errors
  }
}

export function EchoProvider({ children }: { children: React.ReactNode }) {
  const [memories, setMemories] = useState<EchoMemory[]>(loadStoredMemories);
  const [isLoading, setIsLoading] = useState(false);

  const captureMemory = useCallback(
    async (
      content: string,
      sourceType: MemorySourceType,
      rawFileUrl?: string
    ): Promise<EchoMemory> => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase.functions.invoke(
          "ingest_memory",
          { body: { content, sourceType, rawFileUrl } }
        );

        if (error) throw error;

        const newMemory: EchoMemory = {
          id: `mem_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          userId: "echo_demo_user",
          content,
          sourceType,
          rawFileUrl,
          tags: data?.tags ?? [],
          people: data?.people ?? [],
          emotionalWeight: (data?.emotionalWeight as EmotionalWeight) ?? "medium",
          createdAt: new Date().toISOString(),
          resurface: false,
        };

        setMemories((prev) => {
          const updated = [newMemory, ...prev];
          saveMemories(updated);
          return updated;
        });

        return newMemory;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const recallMemories = useCallback(
    async (query: string): Promise<RecallResult> => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase.functions.invoke(
          "recall_memory",
          { body: { query, memories } }
        );

        if (error) throw error;

        return {
          answer: data?.answer ?? "",
          sources: (data?.sources as EchoMemory[]) ?? [],
        };
      } finally {
        setIsLoading(false);
      }
    },
    [memories]
  );

  const getTodaysForgotten = useCallback((): EchoMemory[] => {
    const now = Date.now();
    return memories
      .filter((m) => {
        const ageDays = (now - new Date(m.createdAt).getTime()) / 86400000;
        // Action words pattern
        const hasAction = ACTION_WORDS.some((w) =>
          m.content.toLowerCase().includes(w)
        );
        // Old memory with people (≥ 7 days old)
        const oldWithPeople = ageDays >= 7 && m.people.length > 0;
        // Sentimental moment (high emotional weight, ≥ 5 days old)
        const sentimental = m.emotionalWeight === "high" && ageDays >= 5;
        // Explicitly queued for resurface
        const queued = m.resurface;

        return hasAction || oldWithPeople || sentimental || queued;
      })
      .slice(0, 6);
  }, [memories]);

  const getPeopleList = useCallback((): string[] => {
    const people = new Set<string>();
    for (const m of memories) {
      for (const p of m.people) {
        if (p) people.add(p);
      }
    }
    return Array.from(people).sort();
  }, [memories]);

  const getMemoriesByPerson = useCallback(
    (name: string): EchoMemory[] => {
      const lower = name.toLowerCase();
      return memories.filter((m) =>
        m.people.some((p) => p.toLowerCase() === lower)
      );
    },
    [memories]
  );

  const dismissResurface = useCallback((id: string) => {
    setMemories((prev) => {
      const updated = prev.map((m) =>
        m.id === id ? { ...m, resurface: false } : m
      );
      saveMemories(updated);
      return updated;
    });
  }, []);

  const markResurfaceAcknowledged = useCallback((id: string) => {
    setMemories((prev) => {
      const updated = prev.map((m) =>
        m.id === id
          ? { ...m, resurface: false, resurfacedAt: new Date().toISOString() }
          : m
      );
      saveMemories(updated);
      return updated;
    });
  }, []);

  const triggerDailyResurface = useCallback(async () => {
    await supabase.functions.invoke("daily_resurface", {
      body: { userId: "echo_demo_user" },
    });
  }, []);

  return (
    <EchoContext.Provider
      value={{
        memories,
        isLoading,
        captureMemory,
        recallMemories,
        getTodaysForgotten,
        getPeopleList,
        getMemoriesByPerson,
        dismissResurface,
        markResurfaceAcknowledged,
        triggerDailyResurface,
      }}
    >
      {children}
    </EchoContext.Provider>
  );
}

export function useEcho(): EchoContextValue {
  const ctx = useContext(EchoContext);
  if (!ctx) throw new Error("useEcho must be used inside EchoProvider");
  return ctx;
}

// Export for use in mock supabase
export { generateMockAnswer, scoreMemory, ACTION_WORDS };
export type { };
