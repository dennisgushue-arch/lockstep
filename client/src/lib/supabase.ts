// Mock Supabase client for prototype mode
// This simulates Supabase Edge Functions and database operations

type MockRow = Record<string, any>;
const mockDatabase: Record<string, MockRow[]> = {
  commitments: []
};

export const supabase = {
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
            first_action: "Put on your shoes and walk out the door. No thinking.",
            reflection: "You've been 'planning' this for months. Your body is a temple you've been neglecting while your mind builds elaborate monuments to 'tomorrow.' If you don't lock this in now, your potential will continue to be nothing more than a ghost of what could have been. Are you a runner, or just someone who owns expensive shoes?"
          },
          error: null
        };
      }

      if (text.includes("write") || text.includes("novel") || text.includes("book") || text.includes("creative")) {
        return {
          data: {
            category: "creative",
            confidence: 0.98,
            first_action: "Write one sentence. The worst one you can think of.",
            reflection: "The world doesn't need another person with a 'great idea' they never wrote down. You're suffocating your talent with perfectionism—which is just a high-end word for cowardice. You're terrified that if you actually try, you might fail. I have news for you: by not writing, you've already failed. Lock it in or admit you're just a dreamer."
          },
          error: null
        };
      }

      if (text.includes("diet") || text.includes("eat") || text.includes("sugar") || text.includes("fasting")) {
        return {
          data: {
            category: "consumption",
            confidence: 0.96,
            first_action: "Throw away the one thing you know you shouldn't eat.",
            reflection: "You treat your cravings like they're commands. They're not. They're just noise. Every time you give in, you're telling your brain that your temporary pleasure is worth more than your long-term respect. Is a moment on the tongue really worth the weight of another broken promise? Stop negotiating with your impulses."
          },
          error: null
        };
      }

      if (text.includes("money") || text.includes("save") || text.includes("spend") || text.includes("budget")) {
        return {
          data: {
            category: "finance",
            confidence: 0.94,
            first_action: "Check your bank balance and stare at it for 60 seconds.",
            reflection: "You spend money to buy a version of yourself that you haven't actually earned yet. You're trading your future freedom for present-day trinkets. This isn't about math; it's about control. Do you own your money, or does your lifestyle own you? Put a real stake on the line and see how quickly your 'needs' become 'wants.'"
          },
          error: null
        };
      }

      if (text.includes("wake") || text.includes("morning") || text.includes("early")) {
        return {
          data: {
            category: "discipline",
            confidence: 0.95,
            first_action: "Set your alarm and put your phone across the room.",
            reflection: "The snooze button is a promise to yourself that you're willing to fail. You claim you want the morning, but you love your dreams more than your reality. Prove it."
          },
          error: null
        };
      }

      if (text.includes("meditate") || text.includes("focus") || text.includes("deep work")) {
        return {
          data: {
            category: "mindset",
            confidence: 0.88,
            first_action: "Close all tabs. Sit down.",
            reflection: "Your attention is being sold to the highest bidder. You're a passenger in your own mind. Find 20 minutes of silence or keep letting the world think for you."
          },
          error: null
        };
      }
      
      return {
        data: {
          category: "general",
          confidence: 0.8,
          reflection: "That sounds like another vague promise you'll break by lunch. Your intent lacks teeth. Either give it some, or stop wasting my time."
        },
        error: null
      };
    }
  },
  
  from: (table: string) => {
    return {
      select: (columns?: string) => ({
        eq: (column: string, value: any) => ({
          single: async () => {
            const rows = mockDatabase[table] || [];
            const row = rows.find(r => r[column] === value);
            return { data: row || null, error: null };
          },
          then: async (resolve: any) => {
            const rows = mockDatabase[table] || [];
            const filtered = rows.filter(r => r[column] === value);
            resolve({ data: filtered, error: null });
          }
        }),
        then: async (resolve: any) => {
          resolve({ data: mockDatabase[table] || [], error: null });
        }
      }),
      insert: (data: MockRow | MockRow[]) => ({
        select: () => ({
          single: async () => {
            const rows = Array.isArray(data) ? data : [data];
            rows.forEach(row => {
              if (!row.id) row.id = `mock_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
              mockDatabase[table] = mockDatabase[table] || [];
              mockDatabase[table].push(row);
            });
            console.log(`[Mock Supabase] Inserted into ${table}:`, rows);
            return { data: rows[0], error: null };
          }
        }),
        then: async (resolve: any) => {
          const rows = Array.isArray(data) ? data : [data];
          rows.forEach(row => {
            if (!row.id) row.id = `mock_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
            mockDatabase[table] = mockDatabase[table] || [];
            mockDatabase[table].push(row);
          });
          console.log(`[Mock Supabase] Inserted into ${table}:`, rows);
          resolve({ data: rows, error: null });
        }
      }),
      update: (data: MockRow) => ({
        eq: (column: string, value: any) => ({
          then: async (resolve: any) => {
            mockDatabase[table] = (mockDatabase[table] || []).map(row => 
              row[column] === value ? { ...row, ...data } : row
            );
            console.log(`[Mock Supabase] Updated ${table} where ${column}=${value}:`, data);
            resolve({ data: null, error: null });
          }
        })
      }),
      delete: () => ({
        eq: (column: string, value: any) => ({
          then: async (resolve: any) => {
            mockDatabase[table] = (mockDatabase[table] || []).filter(row => row[column] !== value);
            console.log(`[Mock Supabase] Deleted from ${table} where ${column}=${value}`);
            resolve({ data: null, error: null });
          }
        })
      })
    };
  }
};
