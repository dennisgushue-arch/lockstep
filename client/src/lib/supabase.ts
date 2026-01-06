// Mock Supabase client for prototype mode
export const supabase = {
  functions: {
    invoke: async (name: string, { body }: { body: any }) => {
      console.log(`[Mock Supabase] Invoking function: ${name}`, body);
      // Simulate network delay
      await new Promise((resolve) => setTimeout(resolve, 1500));
      
      const text = body.raw_text.toLowerCase();
      
      if (text.includes("run") || text.includes("gym") || text.includes("workout")) {
        return {
          data: {
            category: "fitness",
            confidence: 0.98,
            first_action: "Put on your shoes. Now.",
            reflection: "You've said you'd exercise before. What makes this time different? The couch is comfortable, and your excuses are well-rehearsed. If you don't lock this in, we both know you'll stay seated."
          },
          error: null
        };
      }

      if (text.includes("write") || text.includes("novel") || text.includes("book")) {
        return {
          data: {
            category: "productivity",
            confidence: 0.92,
            first_action: "Open your editor and delete your distractions.",
            reflection: "Procrastination is a slow death for your ambitions. You're waiting for 'inspiration' while your discipline rots. Write the words or admit you're a pretender."
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
  }
};
