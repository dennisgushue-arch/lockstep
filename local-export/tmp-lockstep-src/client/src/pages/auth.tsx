import React, { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import { useApp } from "@/lib/mock-data";
import { AlertTriangle, Shield } from "lucide-react";

export default function AuthPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [isMockMode, setIsMockMode] = useState(true);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { login } = useApp();

  // Check if user is already logged in
  useEffect(() => {
    const checkSession = async () => {
      try {
        const auth = (supabase as any)?.auth;
        
        // Determine if we're using real Supabase or mock mode
        const isRealSupabase = auth && typeof auth.getSession === 'function';
        setIsMockMode(!isRealSupabase);
        
        if (isRealSupabase) {
          const { data: { session } } = await auth.getSession();
          if (session) {
            console.log("[Auth] User already logged in, redirecting to dashboard");
            setLocation("/dashboard");
            return;
          }
        }
      } catch (err) {
        console.log("[Auth] Session check error:", err);
        setIsMockMode(true);
      }
      setCheckingSession(false);
    };

    checkSession();

    // Listen for auth state changes (e.g., when clicking magic link)
    const auth = (supabase as any)?.auth;
    if (auth && typeof auth.onAuthStateChange === 'function') {
      const { data: { subscription } } = auth.onAuthStateChange(
        (event: string, session: any) => {
          console.log("[Auth] State changed:", event, !!session);
          if (event === 'SIGNED_IN' && session) {
            console.log("[Auth] User signed in via magic link, redirecting...");
            setLocation("/dashboard");
          }
        }
      );
      return () => subscription?.unsubscribe();
    }
  }, [setLocation]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast({
        title: "Invalid email",
        description: "Please enter a valid email address",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // Check if we have real Supabase configured
      const auth = (supabase as any)?.auth;
      
      if (!auth || typeof auth.signInWithOtp !== 'function') {
        // Mock mode - simulate login
        console.log("[Mock Auth] Simulating login for:", email);
        toast({
          title: "Mock Mode",
          description: "Magic link simulated - auto-logging in...",
        });
        
        // Actually log the user in via mock context
        await login(email);
        
        setLocation("/dashboard");
        setLoading(false);
        return;
      }

      // Real Supabase auth - send magic link
      console.log("[Auth] Attempting to send magic link to:", email);
      console.log("[Auth] Redirect URL:", `${window.location.origin}/dashboard`);
      
      const { data, error } = await auth.signInWithOtp({
        email: email.trim(),
        options: {
          emailRedirectTo: `${window.location.origin}/dashboard`,
        },
      });

      console.log("[Auth] OTP Response:", { 
        success: !error, 
        error: error?.message,
        user: data?.user?.email 
      });

      if (error) {
        console.error("[Auth] OTP Error details:", error);
        
        // Handle specific error messages
        if (error.message?.includes("invalid") || error.message?.includes("not valid")) {
          throw new Error("Please enter a valid email address");
        }
        if (error.message?.includes("rate")) {
          throw new Error("Too many attempts. Please try again later.");
        }
        if (error.message?.includes("disabled")) {
          throw new Error("Email signups are currently disabled. Please check back later.");
        }
        if (error.message?.includes("fetch") || error.message?.includes("Failed to")) {
          throw new Error(
            "Could not connect to auth service. Check that VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set correctly in client/.env.local"
          );
        }
        
        throw new Error(error.message || "Failed to send magic link");
      }

      if (!data?.user) {
        throw new Error("Magic link request failed - no user created");
      }

      console.log("[Auth] Magic link sent successfully to:", data.user.email);
      
      toast({
        title: "✓ Check your email",
        description: `Magic link sent to ${email}. Click the link in your email to continue.`,
      });
      
      // Clear form
      setEmail("");
      
    } catch (error) {
      console.error("[Auth] Exception:", error);
      const errorMsg = error instanceof Error ? error.message : String(error);
      toast({
        title: "⚠️ Could not send magic link",
        description: errorMsg || "Failed to send magic link. Please try again or contact support.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (checkingSession) {
    return (
      <div className="w-full max-w-md mx-auto space-y-8 flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">Checking session...</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md mx-auto space-y-8">
      <div className="text-center space-y-2">
        <h1 className="text-4xl font-heading font-bold tracking-tighter">INTENT.</h1>
        <p className="text-muted-foreground">Enter the arena.</p>
      </div>

      <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
        <CardHeader>
          <div className="flex items-center justify-between gap-2">
            <div>
              <CardTitle>Sign In</CardTitle>
              <CardDescription>Enter your email to receive a magic link.</CardDescription>
            </div>
            {isMockMode && (
              <Badge variant="outline" className="bg-blue-500/20 text-blue-600 border-blue-200">
                <Shield className="w-3 h-3 mr-1" />
                Demo Mode
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isMockMode && (
            <Alert className="mb-4 bg-blue-50 border-blue-200">
              <Shield className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-sm text-blue-800">
                🔐 Using demo authentication. Any email works!
              </AlertDescription>
            </Alert>
          )}
          
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Input
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                required
                className="bg-zinc-900/50 border-zinc-800 focus:border-white h-12"
                data-testid="input-email"
              />
            </div>
            <Button 
              type="submit" 
              className="w-full h-12 rounded-none font-bold text-lg" 
              disabled={loading || !email}
              data-testid="button-submit"
            >
              {loading ? "SENDING..." : "CONTINUE"}
            </Button>
          </form>

          <div className="mt-6 pt-6 border-t border-zinc-800 space-y-3">
            <p className="text-xs text-muted-foreground text-center">
              💡 <strong>Tip:</strong> {isMockMode ? "Demo mode: any email works!" : "Check your spam folder if you don't see the email within 30 seconds."}
            </p>
            <p className="text-xs text-muted-foreground text-center">
              🔗 After clicking the link, you'll be automatically logged in.
            </p>
          </div>
        </CardContent>
      </Card>
      
      <p className="text-center text-xs text-muted-foreground">
        By continuing, you agree to accept the consequences of your actions.
      </p>
    </div>
  );
}
