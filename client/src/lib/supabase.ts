import { createClient } from '@supabase/supabase-js';

const rawSupabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseUrl = rawSupabaseUrl
  ? rawSupabaseUrl.replace(".supabase.com", ".supabase.co")
  : rawSupabaseUrl;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Check if we're in production mode with real Supabase credentials
const USE_REAL_SUPABASE = Boolean(supabaseUrl && supabaseAnonKey);

if (import.meta.env.DEV) {
  console.log("[Supabase] Init check:", {
    URL_SET: !!supabaseUrl,
    KEY_SET: !!supabaseAnonKey,
    USE_REAL: USE_REAL_SUPABASE,
  });
}

// Real Supabase client
const realSupabase = USE_REAL_SUPABASE 
  ? createClient(supabaseUrl!, supabaseAnonKey!)
  : null;

// Mock implementation for local development
type MockRow = Record<string, any>;
const mockDatabase: Record<string, MockRow[]> = {
  commitments: []
};

function clamp(min: number, value: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function buildProfileAwareReflection(base: string, behaviorProfile?: any): string {
  if (!behaviorProfile?.psych) return base;

  const snippets = [
    behaviorProfile.psych.pattern_warning,
    behaviorProfile.psych.best_leverage_point,
    behaviorProfile.psych.next_pressure_line,
  ].filter(Boolean);

  if (!snippets.length) return base;
  return `${base} ${snippets[0]}`;
}

function applyProfileStake(baseStake: number, behaviorProfile?: any): number {
  const stats = behaviorProfile?.stats;
  if (!stats) return baseStake;

  const completionRate = Number(stats.completion_rate ?? 0);
  const overdue = Number(stats.active_overdue_count ?? 0);

  let adjusted = baseStake;
  if (completionRate < 0.45) adjusted += 5;
  if (completionRate > 0.75) adjusted -= 2;
  if (overdue > 0) adjusted += 3;

  return clamp(5, adjusted, 100);
}

// ─── ECHO mock helpers ────────────────────────────────────────────────────────

function echoExtractTags(content: string): string[] {
  const lower = content.toLowerCase();
  const tagMap: Record<string, string[]> = {
    fitness: ["run", "workout", "gym", "exercise", "training", "squat", "lunge", "yoga"],
    business: ["idea", "startup", "business", "investor", "revenue", "partnership", "pitch", "vc"],
    family: ["mom", "dad", "sister", "brother", "grandma", "grandpa", "family"],
    parenting: ["dax", "liam", "emma", "kids", "son", "daughter", "child", "first word", "bedtime"],
    relationship: ["sarah", "wife", "husband", "anniversary", "date"],
    travel: ["trip", "san diego", "vacation", "hotel", "restaurant", "travel"],
    commitment: ["promise", "follow up", "i should", "i need to", "remind", "deadline"],
    gift: ["gift", "want", "birthday", "christmas", "anniversary"],
    health: ["knee", "pain", "diet", "nutrition", "sleep", "back", "banana"],
    reading: ["book", "recommend", "read", "novel", "almanack"],
  };
  const found = new Set<string>();
  for (const [tag, keywords] of Object.entries(tagMap)) {
    if (keywords.some((kw) => lower.includes(kw))) found.add(tag);
  }
  return Array.from(found);
}

function echoExtractPeople(content: string): string[] {
  const knownPeople = ["Sarah", "Dax", "Emma", "Liam", "Greg", "Jake", "Alex", "Marcus", "Mom", "Dad"];
  return knownPeople.filter((p) => content.includes(p));
}

function echoEmotionalWeight(content: string): "low" | "medium" | "high" {
  const high = ["first", "amazing", "incredible", "love", "cry", "milestone", "promise", "never forget", "important"];
  const low = ["tip", "insight", "note", "reminder", "routine"];
  const lower = content.toLowerCase();
  if (high.some((w) => lower.includes(w))) return "high";
  if (low.some((w) => lower.includes(w))) return "low";
  return "medium";
}

function echoScoreMemory(memory: any, queryWords: string[]): number {
  const haystack = [memory.content, ...(memory.tags ?? []), ...(memory.people ?? [])].join(" ").toLowerCase();
  let score = 0;
  for (const word of queryWords) {
    if (word.length < 3) continue;
    if (haystack.includes(word)) {
      score += 1;
      if ((memory.tags ?? []).some((t: string) => t.toLowerCase().includes(word))) score += 0.5;
      if ((memory.people ?? []).some((p: string) => p.toLowerCase().includes(word))) score += 0.5;
    }
  }
  if (memory.emotionalWeight === "high") score += 0.3;
  return score;
}

function echoGenerateAnswer(query: string, sources: any[]): string {
  if (sources.length === 0) {
    return "I couldn't find matching memories for that query. Try capturing more moments — even a quick text note is enough for me to remember it later.";
  }
  const top = sources[0];
  const q = query.toLowerCase();
  // Gift / want
  if (q.includes("want") || q.includes("gift") || q.includes("birthday") || q.includes("wish")) {
    const giftMem = sources.find((m: any) => (m.tags ?? []).some((t: string) => t.includes("gift")));
    if (giftMem) {
      const person = giftMem.people?.[0] ?? "them";
      return `Based on your memories, ${person} mentioned: "${giftMem.content.split(".")[0]}." You saved this recently.`;
    }
  }
  // Business
  if (q.includes("idea") || q.includes("business") || q.includes("batting")) {
    const biz = sources.find((m: any) => (m.tags ?? []).includes("business"));
    if (biz) return `You had a business idea: "${biz.content.split(".")[0]}." Captured recently.`;
  }
  // Travel
  if (q.includes("restaurant") || q.includes("san diego") || q.includes("trip") || q.includes("vacation")) {
    const travel = sources.find((m: any) => (m.tags ?? []).includes("travel"));
    if (travel) return `Regarding that trip: "${travel.content.split(".")[0]}." You saved this a while back.`;
  }
  const person = top.people?.[0];
  const intro = person ? `Regarding ${person}: ` : "You captured: ";
  return `${intro}"${top.content.split(".")[0]}."${sources.length > 1 ? ` I also found ${sources.length - 1} more related memory${sources.length > 2 ? "s" : ""} below.` : ""}`;
}

// ─────────────────────────────────────────────────────────────────────────────

const mockSupabase = {
  functions: {
    invoke: async (name: string, { body }: { body: any }): Promise<{ data: any; error: any }> => {
      console.log(`[Mock Supabase] Invoking function: ${name}`, body);
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // ── ECHO: ingest_memory ──
      if (name === "ingest_memory") {
        const content: string = body?.content ?? "";
        const tags = echoExtractTags(content);
        const people = echoExtractPeople(content);
        const emotionalWeight = echoEmotionalWeight(content);
        console.log(`[Mock Supabase] ECHO ingest_memory:`, { tags, people, emotionalWeight });
        return { data: { tags, people, emotionalWeight, success: true }, error: null };
      }

      // ── ECHO: recall_memory ──
      if (name === "recall_memory") {
        const query: string = body?.query ?? "";
        const memories: any[] = body?.memories ?? [];
        const queryWords = query.toLowerCase().split(/\s+/).filter((w: string) => w.length >= 2);
        const scored = memories
          .map((m) => ({ memory: m, score: echoScoreMemory(m, queryWords) }))
          .filter((x) => x.score > 0)
          .sort((a, b) => b.score - a.score)
          .slice(0, 8);
        const sources = scored.map((x) => x.memory);
        const answer = echoGenerateAnswer(query, sources);
        console.log(`[Mock Supabase] ECHO recall_memory: found ${sources.length} memories`);
        return { data: { answer, sources }, error: null };
      }

      // ── ECHO: analyze_image ──
      if (name === "analyze_image") {
        const fileUrl: string = body?.fileUrl ?? "";
        const mockDescription = "Image captured and analyzed. Contains visual information that has been logged to your memory.";
        console.log(`[Mock Supabase] ECHO analyze_image:`, fileUrl);
        return { data: { description: mockDescription, extractedText: "", tags: ["photo", "visual"], people: [] }, error: null };
      }

      // ── ECHO: transcribe_audio ──
      if (name === "echo_transcribe_audio") {
        console.log(`[Mock Supabase] ECHO transcribe_audio`);
        return { data: { transcript: body?.mockTranscript ?? "Voice note transcribed successfully." }, error: null };
      }

      // ── ECHO: daily_resurface ──
      if (name === "daily_resurface") {
        console.log(`[Mock Supabase] ECHO daily_resurface triggered`);
        return { data: { success: true, resurfaced: 3, mode: "mock" }, error: null };
      }

      // Handle purchase_credits for credit package checkout flow
      if (name === "purchase_credits") {
        const mockPaymentIntentId = `pi_mock_credits_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
        const mockClientSecret = `${mockPaymentIntentId}_secret_${Math.random().toString(36).substring(2, 15)}`;

        console.log(`[Mock Supabase] Created mock credit purchase intent:`, {
          payment_intent_id: mockPaymentIntentId,
          client_secret: mockClientSecret,
          amount: body?.amount,
          credits: body?.credits,
          userId: body?.userId,
        });

        return {
          data: {
            clientSecret: mockClientSecret,
            paymentIntentId: mockPaymentIntentId,
          },
          error: null,
        };
      }

      // Handle confirm_credit_purchase post-payment acknowledgement
      if (name === "confirm_credit_purchase") {
        console.log(`[Mock Supabase] Confirmed mock credit purchase:`, {
          userId: body?.userId,
          credits: body?.credits,
          paymentIntentId: body?.paymentIntentId,
        });

        return {
          data: {
            success: true,
          },
          error: null,
        };
      }
      
      // Handle create_stake_intent for Stripe payment flow
      if (name === "create_stake_intent") {
        const mockPaymentIntentId = `pi_mock_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
        const mockClientSecret = `${mockPaymentIntentId}_secret_${Math.random().toString(36).substring(2, 15)}`;
        
        console.log(`[Mock Supabase] Created mock payment intent:`, {
          payment_intent_id: mockPaymentIntentId,
          client_secret: mockClientSecret,
          amount_cents: body.amount_cents,
          commitment_id: body.commitment_id
        });
        
        return {
          data: {
            payment_intent_id: mockPaymentIntentId,
            client_secret: mockClientSecret,
          },
          error: null
        };
      }

      // Handle fail_commitment for capturing stakes
      if (name === "fail_commitment") {
        console.log(`[Mock Supabase] Failing commitment:`, body.commitment_id);
        return {
          data: { success: true, captured: true },
          error: null
        };
      }

      // Handle complete_commitment for releasing stakes
      if (name === "complete_commitment") {
        console.log(`[Mock Supabase] Completing commitment:`, body.commitment_id);
        return {
          data: { success: true, released: true },
          error: null
        };
      }

      // Handle process_cashout_batch for admin batch payout trigger
      if (name === "process_cashout_batch") {
        const requestedLimit = Number(body?.limit ?? 25);
        const effectiveLimit = Number.isFinite(requestedLimit)
          ? Math.max(1, Math.min(100, Math.floor(requestedLimit)))
          : 25;

        console.log(`[Mock Supabase] Processing mock cashout batch with limit=${effectiveLimit}`);

        return {
          data: {
            success: true,
            scanned: 0,
            results: [],
            mode: "mock",
          },
          error: null,
        };
      }

      // Response templates with placeholders
      type TemplateConfig = {
        goal: string | ((text: string) => string);
        first_action: string | ((text: string) => string);
        reflection: (rawText: string) => string;
        suggested_stake: number;
      };
      
      const templates: Record<string, TemplateConfig> = {
        fitness: {
          goal: "I want to exercise and build a consistent fitness habit",
          first_action: "Put on your workout gear and step outside right now—no debate.",
          reflection: (rawText: string) => `You say you want to ${rawText.toLowerCase()}. How many times have you said that? Your body doesn't need another promise; it needs proof. The couch will be there tomorrow, but so will your regret. Lock this in or stop wasting mental energy.`,
          suggested_stake: 10
        },
        work: {
          goal: "I want to focus and complete meaningful work",
          first_action: "Close everything except what you need. Write three sentences of your work right now.",
          reflection: (rawText: string) => `"${rawText}" sounds ambitious. But ambition without stakes is just daydreaming. You've had a thousand ideas. How many did you actually execute? This time, put money on it. Make failure cost something.`,
          suggested_stake: 20
        },
        consumption: {
          goal: "I want to change my eating and consumption habits",
          first_action: "Throw away or delete one thing right now that you know sabotages you.",
          reflection: (rawText: string) => `You want to ${rawText.toLowerCase()}? Good intention. But intentions die the moment you're tired or bored. Your habits own you right now. The only way to break free is to make breaking them painful if you fail.`,
          suggested_stake: 15
        },
        growth: {
          goal: "I want to take control of my finances and future",
          first_action: "Check your current balance and write down what you want it to be in 90 days.",
          reflection: (rawText: string) => `"${rawText}" - yet you're still spending like you don't care. Money is a test of your values. What you spend on reveals what you actually believe about yourself. Lock in a stake and prove you mean it.`,
          suggested_stake: 25
        },
        addiction: {
          goal: "I want to break free from this habit",
          first_action: "Delete the app, throw it out, or put it somewhere you can't reach. Do it now.",
          reflection: (rawText: string) => `You're ready to ${rawText.toLowerCase()}. But 'ready' is a feeling, and feelings fade. You need consequences. Real consequences. Money consequences. That's what will keep you honest when your willpower fails at 3 AM.`,
          suggested_stake: 50
        },
        other: {
          goal: (rawText: string) => rawText,
          first_action: "Identify the smallest concrete first step and do it immediately.",
          reflection: (rawText: string) => `You want to ${rawText.toLowerCase()}. But wanting isn't doing. You know that. Everyone knows that. What separates you from everyone else is whether you'll put something on the line to actually make it happen. Will you?`,
          suggested_stake: 10
        }
      };

      // Parse intent from raw text
      const behaviorProfile = body?.behavior_profile;
      const text = (body.raw_text || "").toLowerCase();
      let category: keyof typeof templates = "other";
      let confidence = 0.85;

      if (text.includes("run") || text.includes("gym") || text.includes("workout") || text.includes("exercise") || text.includes("walk")) {
        category = "fitness";
        confidence = 0.99;
      } else if (text.includes("write") || text.includes("code") || text.includes("work") || text.includes("project") || text.includes("build")) {
        category = "work";
        confidence = 0.98;
      } else if (text.includes("diet") || text.includes("eat") || text.includes("sugar") || text.includes("fasting") || text.includes("food")) {
        category = "consumption";
        confidence = 0.96;
      } else if (text.includes("money") || text.includes("save") || text.includes("spend") || text.includes("budget") || text.includes("financial")) {
        category = "growth";
        confidence = 0.94;
      } else if (text.includes("quit") || text.includes("stop") || text.includes("smoking") || text.includes("drinking") || text.includes("scroll") || text.includes("habit")) {
        category = "addiction";
        confidence = 0.97;
      }

      // Generate response from template
      const tmpl = templates[category];
      const goal = typeof tmpl.goal === "function" ? tmpl.goal(body.raw_text) : tmpl.goal;
      const first_action = typeof tmpl.first_action === "function" ? tmpl.first_action(body.raw_text) : tmpl.first_action;
      const reflection = typeof tmpl.reflection === "function" ? tmpl.reflection(body.raw_text) : tmpl.reflection;
      const profileAwareReflection = buildProfileAwareReflection(reflection, behaviorProfile);
      const profileAwareStake = applyProfileStake(tmpl.suggested_stake, behaviorProfile);

      return {
        data: {
          category,
          confidence,
          goal,
          first_action,
          reflection: profileAwareReflection,
          suggested_stake: profileAwareStake
        },
        error: null
      };
    }
  },
  from: (table: string) => {
    return {
      select: (columns = "*") => {
        const state: {
          filters: Array<(row: MockRow) => boolean>;
          orderBy: { column: string; ascending: boolean } | null;
          limit: number | null;
        } = {
          filters: [],
          orderBy: null,
          limit: null,
        };

        const run = () => {
          let rows = [...(mockDatabase[table] || [])];

          for (const filter of state.filters) {
            rows = rows.filter(filter);
          }

          if (state.orderBy) {
            const { column, ascending } = state.orderBy;
            rows.sort((a, b) => {
              if (a[column] === b[column]) return 0;
              if (a[column] == null) return 1;
              if (b[column] == null) return -1;
              return ascending
                ? (a[column] > b[column] ? 1 : -1)
                : (a[column] < b[column] ? 1 : -1);
            });
          }

          if (typeof state.limit === "number") {
            rows = rows.slice(0, state.limit);
          }

          return rows;
        };

        const result = () => {
          const rows = run();
          console.log(`[Mock Supabase] SELECT ${columns} FROM ${table} -> ${rows.length} row(s)`);
          return { data: rows, error: null };
        };

        const builder: any = {
          eq: (column: string, value: any) => {
            state.filters.push((row) => row?.[column] === value);
            return builder;
          },
          is: (column: string, value: any) => {
            if (value === null) {
              state.filters.push((row) => row?.[column] == null);
            } else {
              state.filters.push((row) => row?.[column] === value);
            }
            return builder;
          },
          order: (column: string, options: { ascending: boolean }) => {
            state.orderBy = { column, ascending: options?.ascending ?? true };
            return builder;
          },
          limit: (count: number) => {
            state.limit = count;
            return builder;
          },
          single: async () => {
            const rows = run();
            const row = rows.length > 0 ? rows[0] : null;
            return { data: row, error: null };
          },
          execute: async () => result(),
          then: (resolve: any, reject?: any) => Promise.resolve(result()).then(resolve, reject),
        };

        return builder;
      },
      insert: (rows: MockRow | MockRow[]) => {
        const rowsArray = Array.isArray(rows) ? rows : [rows];
        if (!mockDatabase[table]) {
          mockDatabase[table] = [];
        }
        
        return {
          select: () => {
            const insertedRows = rowsArray.map((row) => {
              const newRow = { ...row, id: `mock_${Date.now()}_${Math.random().toString(36).substring(2, 9)}` };
              mockDatabase[table].push(newRow);
              console.log(`[Mock Supabase] Inserted into ${table}:`, rows);
              return newRow;
            });
            return Promise.resolve({ data: insertedRows, error: null });
          },
          execute: async () => {
            const insertedRows = rowsArray.map((row) => {
              const newRow = { ...row, id: `mock_${Date.now()}_${Math.random().toString(36).substring(2, 9)}` };
              mockDatabase[table].push(newRow);
              return newRow;
            });
            console.log(`[Mock Supabase] Inserted into ${table}:`, rows);
            return { data: insertedRows, error: null };
          }
        };
      },
      update: (data: Record<string, any>) => {
        return {
          eq: (column: string, value: any) => {
            return {
              execute: async () => {
                console.log(`[Mock Supabase] Updated ${table} where ${column}=${value}:`, data);
                const rows = mockDatabase[table] || [];
                const row = rows.find((r) => r[column] === value);
                if (row) {
                  Object.assign(row, data);
                }
                return { data: row, error: null };
              }
            };
          }
        };
      },
      delete: () => {
        return {
          eq: (column: string, value: any) => {
            return {
              execute: async () => {
                console.log(`[Mock Supabase] Deleted from ${table} where ${column}=${value}`);
                if (!mockDatabase[table]) return { data: null, error: null };
                mockDatabase[table] = mockDatabase[table].filter((r) => r[column] !== value);
                return { data: null, error: null };
              }
            };
          }
        };
      }
    };
  }
};

// Export either real or mock client
export const supabase = USE_REAL_SUPABASE ? realSupabase! : mockSupabase as any;

// Helper to check which mode we're in
export const isUsingRealSupabase = USE_REAL_SUPABASE;

if (import.meta.env.DEV) {
  console.log(`[Supabase] Mode: ${USE_REAL_SUPABASE ? 'PRODUCTION (Real)' : 'DEVELOPMENT (Mock)'}`);
}
