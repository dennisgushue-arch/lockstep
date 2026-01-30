import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.VITE_SUPABASE_URL || "";
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || "";

console.log("Testing analyze_intent function...");
console.log("URL:", supabaseUrl);
console.log("Key exists:", !!supabaseAnonKey);

const client = createClient(supabaseUrl, supabaseAnonKey);

async function test() {
  try {
    console.log("\nCalling analyze_intent...");
    const { data, error } = await client.functions.invoke("analyze_intent", {
      body: { raw_text: "I want to run tomorrow morning" },
    });

    console.log("Response:");
    console.log("  data:", JSON.stringify(data, null, 2));
    console.log("  error:", error);

    if (error) {
      console.error("ERROR:", error);
    }

    if (data) {
      console.log("\nValidation:");
      console.log("  category:", (data as any).category);
      console.log("  confidence:", (data as any).confidence);
      console.log("  goal:", (data as any).goal);
      console.log("  first_action:", (data as any).first_action);
      console.log("  reflection:", (data as any).reflection);
      console.log("  suggested_stake:", (data as any).suggested_stake);
    }
  } catch (err) {
    console.error("Exception:", err);
  }
}

test();
