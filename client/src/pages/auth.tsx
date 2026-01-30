import React, { useState } from "react";
import { useLocation } from "wouter";
import { useApp } from "@/lib/mock-data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

export default function AuthPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useApp();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setLoading(true);
    try {
      await login(email);
      toast({
        title: "Magic link sent",
        description: "Check your email (simulating auto-login...)",
      });
      // Delay to show toast before redirect
      setTimeout(() => {
        setLocation("/dashboard");
      }, 1000);
    } catch (error) {
      console.error("Auth failed - FULL ERROR:", error);
      console.error("Error stack:", error instanceof Error ? error.stack : 'No stack');
      console.error("Error details:", JSON.stringify(error, null, 2));
      toast({
        title: "Error",
        description: "Failed to login. Please try again.",
        variant: "destructive",
      });
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto space-y-8">
      <div className="text-center space-y-2">
        <h1 className="text-4xl font-heading font-bold tracking-tighter">INTENT.</h1>
        <p className="text-muted-foreground">Enter the arena.</p>
      </div>

      <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
        <CardHeader>
          <CardTitle>Sign In</CardTitle>
          <CardDescription>Enter your email to receive a magic link.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Input
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="bg-zinc-900/50 border-zinc-800 focus:border-white h-12"
                data-testid="input-email"
              />
            </div>
            <Button 
              type="submit" 
              className="w-full h-12 rounded-none font-bold text-lg" 
              disabled={loading}
              data-testid="button-submit"
            >
              {loading ? "SENDING..." : "CONTINUE"}
            </Button>
          </form>
        </CardContent>
      </Card>
      
      <p className="text-center text-xs text-muted-foreground">
        By continuing, you agree to accept the consequences of your actions.
      </p>
    </div>
  );
}
