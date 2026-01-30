import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Check if we're in production mode with real Supabase credentials
const USE_REAL_SUPABASE = Boolean(supabaseUrl && supabaseAnonKey);

// Real Supabase client
const realSupabase = USE_REAL_SUPABASE 
  ? createClient(supabaseUrl!, supabaseAnonKey!)
  : null;

// Mock implementation for local development
type MockRow = Record<string, any>;
const mockDatabase: Record<string, MockRow[]> = {
  commitments: []
};

const mockSupabase = {
  functions: {
    invoke: async (name: string, { body }: { body: any }): Promise<{ data: any; error: any }> => {
      console.log(`[Mock Supabase] Invoking function: ${name}`, body);
      await new Promise((resolve) => setTimeout(resolve, 1500));
      
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
      
      // Original analyze_intent logic
      const text = (body.raw_text || "").toLowerCase();
      
      if (text.includes("run") || text.includes("gym") || text.includes("workout")) {
        return {
          data: {
            category: "fitness",
            confidence: 0.99,
            goal: "I want to exercise regularly",
            first_action: "Put on your shoes and walk out the door. No thinking.",
            reflection: "You've been 'planning' this for months. Your body is a temple you've been neglecting while your mind builds elaborate monuments to 'tomorrow.' If you don't lock this in now, your potential will continue to be nothing more than a ghost of what could have been. Are you a runner, or just someone who owns expensive shoes?",
            suggested_stake: 10
          },
          error: null
        };
      }

      if (text.includes("write") || text.includes("novel") || text.includes("book") || text.includes("creative")) {
        return {
          data: {
            category: "work",
            confidence: 0.98,
            goal: "I want to write and complete a creative project",
            first_action: "Write one sentence. The worst one you can think of.",
            reflection: "The world doesn't need another person with a 'great idea' they never wrote down. You're suffocating your talent with perfectionism—which is just a high-end word for cowardice. You're terrified that if you actually try, you might fail. I have news for you: by not writing, you've already failed. Lock it in or admit you're just a dreamer.",
            suggested_stake: 20
          },
          error: null
        };
      }

      if (text.includes("diet") || text.includes("eat") || text.includes("sugar") || text.includes("fasting")) {
        return {
          data: {
            category: "consumption",
            confidence: 0.96,
            goal: "I want to change my eating habits",
            first_action: "Throw away the one thing you know you shouldn't eat.",
            reflection: "You treat your cravings like they're commands. They're not. They're just noise. Every time you give in, you're telling your brain that your temporary pleasure is worth more than your long-term respect. Is a moment on the tongue really worth the weight of another broken promise? Stop negotiating with your impulses.",
            suggested_stake: 15
          },
          error: null
        };
      }

      if (text.includes("money") || text.includes("save") || text.includes("spend") || text.includes("budget")) {
        return {
          data: {
            category: "growth",
            confidence: 0.94,
            goal: "I want to improve my financial habits",
            first_action: "Check your bank balance and stare at it for 60 seconds.",
            reflection: "You spend money to buy a version of yourself that you haven't actually earned yet. You're trading your future freedom for present-day trinkets. This isn't about math; it's about control. Do you own your money, or does your lifestyle own you? Put a real stake on the line and see how quickly your 'needs' become 'wants.'",
            suggested_stake: 25
          },
          error: null
        };
      }

      if (text.includes("quit") || text.includes("stop") || text.includes("smoking") || text.includes("drinking") || text.includes("scroll")) {
        return {
          data: {
            category: "addiction",
            confidence: 0.97,
            goal: "I want to quit a harmful habit",
            first_action: "Delete the app, throw out the pack, pour it down the drain. Now.",
            reflection: "You're not addicted to the thing; you're addicted to avoiding yourself. Every time you reach for your escape, you're choosing numbness over presence. You're letting a chemical or a screen own the driver's seat of your life. This isn't about willpower—it's about whether you believe you deserve freedom. Do you?",
            suggested_stake: 50
          },
          error: null
        };
      }

      return {
        data: {
          category: "other",
          confidence: 0.85,
          goal: body.raw_text || "Complete this goal",
          first_action: "Do the smallest possible version of this goal. Right now.",
          reflection: "You've been thinking about this for how long? Every minute you spend 'preparing' is a minute you're not doing. The only difference between you and the person who succeeds is that they started before they felt ready. Lock this in, or keep living in the fantasy of 'someday.'",
          suggested_stake: 10
        },
        error: null
      };
    }
  },
  from: (table: string) => {
    return {
      select: (columns = "*") => {
        return {
          eq: (column: string, value: any) => {
            return {
              single: async () => {
                console.log(`[Mock Supabase] SELECT ${columns} FROM ${table} WHERE ${column}=${value}`);
                const rows = mockDatabase[table] || [];
                const row = rows.find((r) => r[column] === value);
                return { data: row, error: null };
              }
            };
          },
          order: (column: string, options: { ascending: boolean }) => {
            return {
              execute: async () => {
                console.log(`[Mock Supabase] SELECT ${columns} FROM ${table} ORDER BY ${column} ${options.ascending ? 'ASC' : 'DESC'}`);
                const rows = mockDatabase[table] || [];
                const sorted = [...rows].sort((a, b) => {
                  if (options.ascending) {
                    return a[column] > b[column] ? 1 : -1;
                  }
                  return a[column] < b[column] ? 1 : -1;
                });
                return { data: sorted, error: null };
              }
            };
          }
        };
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

console.log(`[Supabase] Mode: ${USE_REAL_SUPABASE ? 'PRODUCTION (Real)' : 'DEVELOPMENT (Mock)'}`);
