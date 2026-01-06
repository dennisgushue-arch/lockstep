// Mock Supabase client for prototype mode
export const supabase = {
  functions: {
    invoke: async (name: string, { body }: { body: any }) => {
      console.log(`[Mock Supabase] Invoking function: ${name}`, body);
      // Simulate network delay
      await new Promise((resolve) => setTimeout(resolve, 1500));
      
      const text = body.raw_text.toLowerCase();
      
      if (text.includes("run") || text.includes("gym")) {
        return {
          data: {
            category: "fitness",
            confidence: 0.95,
            first_action: "Put on your running shoes.",
            reflection: "You've said you'd exercise before. What makes this time different? The couch is comfortable, and your excuses are well-rehearsed."
          },
          error: null
        };
      }
      
      return {
        data: {
          category: "general",
          confidence: 0.8,
          reflection: "That sounds like another vague promise you'll break by lunch. Prove me wrong or keep lying to yourself."
        },
        error: null
      };
    }
  }
};
