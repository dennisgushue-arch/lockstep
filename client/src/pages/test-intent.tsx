import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase, isUsingRealSupabase } from "@/lib/supabase";
import { analyzeIntent } from "@/lib/ai";

export default function TestIntentPage() {
  const [text, setText] = useState("I want to run tomorrow");
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [sessionInfo, setSessionInfo] = useState<string>("");

  useEffect(() => {
    const checkSession = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) {
          setSessionInfo(`Auth error: ${error.message}`);
        } else {
          setSessionInfo(`Session: ${data.session ? "YES (has session)" : "NO (anonymous)"}`);
        }
      } catch (e) {
        setSessionInfo(`Exception checking session: ${e instanceof Error ? e.message : String(e)}`);
      }
    };
    checkSession();
  }, []);

  const checkEnvVars = async () => {
    const url = import.meta.env.VITE_SUPABASE_URL;
    const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
    
    setResult({
      url: url ? `Set (length: ${url.length})` : "NOT SET",
      key: key ? `Set (length: ${key.length})` : "NOT SET",
      mode: isUsingRealSupabase ? "PRODUCTION" : "DEVELOPMENT (Mock)",
      raw_url: url,
      raw_key_first_20: key?.substring(0, 20) + "..." || "N/A"
    });
  };

  const testDirect = async () => {
    setLoading(true);
    setError("");
    setResult(null);
    
    try {
      console.log("=== TEST DIRECT SUPABASE INVOKE ===");
      console.log("Using real Supabase:", isUsingRealSupabase);
      console.log("Input text:", text);
      
      const { data, error: err } = await supabase.functions.invoke("test-hello", {});

      console.log("Response data:", data);
      console.log("Response error:", err);

      if (err) {
        setError(`Supabase error: ${JSON.stringify(err)}`);
      } else {
        setResult(data);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error("Exception:", e);
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const testAI = async () => {
    setLoading(true);
    setError("");
    setResult(null);
    
    try {
      console.log("=== TEST AI FUNCTION ===");
      const result = await analyzeIntent(text);
      console.log("AI result:", result);
      setResult(result);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error("AI error:", e);
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container max-w-2xl mx-auto px-4 py-12">
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Test Intent Analysis</h1>
        
        <div className="p-4 bg-blue-50 border border-blue-200 rounded space-y-2">
          <p className="text-sm"><strong>Mode:</strong> {isUsingRealSupabase ? "PRODUCTION (Real Supabase)" : "DEVELOPMENT (Mock)"}</p>
          <p className="text-sm"><strong>Session:</strong> {sessionInfo || "Loading..."}</p>
        </div>

        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Enter intent text..."
          className="min-h-[100px]"
        />

        <div className="flex gap-4">
          <Button onClick={testDirect} disabled={loading}>
            {loading ? "Testing..." : "Test test-hello"}
          </Button>
          <Button onClick={checkEnvVars} disabled={loading} variant="secondary">
            Check Env Vars
          </Button>
          <Button onClick={testAI} disabled={loading} variant="outline">
            {loading ? "Testing..." : "Test AI Function"}
          </Button>
        </div>

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded">
            <p className="text-sm text-red-800"><strong>Error:</strong></p>
            <pre className="text-xs mt-2 overflow-auto max-h-[200px]">{error}</pre>
          </div>
        )}

        {result && (
          <div className="p-4 bg-green-50 border border-green-200 rounded">
            <p className="text-sm text-green-800"><strong>Success!</strong></p>
            <pre className="text-xs mt-2 overflow-auto max-h-[300px]">{JSON.stringify(result, null, 2)}</pre>
          </div>
        )}
      </div>
    </div>
  );
}
