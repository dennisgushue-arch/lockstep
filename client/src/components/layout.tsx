import React, { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useApp } from "@/lib/mock-data";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DetectionBadge } from "@/components/detection-notifications";
import { ConsequenceNotificationCenter } from "@/components/consequence-notification-center";
import { PassiveIntentSuggestion } from "@/components/passive-intent-suggestion";
import { Coins, Settings } from "lucide-react";
import type { IntentPattern } from "@/lib/passive-detection";

export function Layout({ children }: { children: React.ReactNode }) {
  const [location, setLocation] = useLocation();
  const { user, logout, creditBalance, intentPatterns, dismissPattern, lockInPattern } = useApp();
  const [activeSuggestion, setActiveSuggestion] = useState<IntentPattern | null>(null);
  const ONBOARDING_STORAGE_KEY = "onboarding_completed_v1";
  const isDemoUser = Boolean(user && (user.id === "guest_demo_user" || user.email === "guest@lockstep.demo"));
  
  // Watch for high-urgency patterns to show suggestion
  useEffect(() => {
    const highUrgencyPattern = intentPatterns.find(
      (p) => p.status === "active" && p.occurrenceCount >= 3
    );
    
    if (highUrgencyPattern && highUrgencyPattern.id !== activeSuggestion?.id) {
      setActiveSuggestion(highUrgencyPattern);
    }
  }, [intentPatterns, activeSuggestion]);

  useEffect(() => {
    if (!user) return;
    if (location === "/" || location === "/auth" || location === "/onboarding") return;

    const completed = localStorage.getItem(ONBOARDING_STORAGE_KEY) === "true";
    if (!completed) {
      setLocation("/onboarding");
    }
  }, [user, location, setLocation]);
  
  const isLanding = location === "/";
  const isAuth = location === "/auth";
  const isOnboarding = location === "/onboarding";
  const isFocusedDeepLink = /^\/pact\/[^/]+\/(act|prove)$/.test(location) || /^\/recovery\/[^/]+$/.test(location);

  if (isAuth || isOnboarding || isFocusedDeepLink) {
    return <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-4">{children}</div>;
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans overflow-x-hidden">
      <div className="noise-bg" />
      <header
        className="fixed top-0 left-0 right-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur-md"
        style={{ paddingTop: "env(safe-area-inset-top)" }}
      >
        <div className="container mx-auto px-3 sm:px-4 h-16 flex items-center justify-between gap-2">
          <Link href={user ? "/momentum" : "/"}>
            <span className="shrink-0 text-lg sm:text-xl font-heading font-bold tracking-tighter hover:text-primary/80 transition-colors cursor-pointer">
              INTENT.
            </span>
          </Link>

          <div className="flex flex-1 min-w-0 items-center justify-end gap-1 sm:gap-2">
            <nav className="flex flex-1 min-w-0 justify-end max-w-[calc(100vw-7rem)] items-center gap-2 sm:gap-3 md:gap-4 overflow-x-auto whitespace-nowrap [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
              {user ? (
                <>
                  <Link href="/momentum">
                    <span className={`hidden md:inline text-sm font-medium transition-colors hover:text-primary cursor-pointer ${location === '/momentum' ? 'text-primary' : 'text-muted-foreground'}`}>
                      Momentum
                    </span>
                  </Link>
                  <Link href="/dashboard">
                    <span className={`hidden md:inline text-sm font-medium transition-colors hover:text-primary cursor-pointer ${location === '/dashboard' ? 'text-primary' : 'text-muted-foreground'}`}>
                      Dashboard
                    </span>
                  </Link>
                  <Link href="/leaderboard">
                    <span className={`hidden md:inline text-sm font-medium transition-colors hover:text-primary cursor-pointer ${location === '/leaderboard' ? 'text-primary' : 'text-muted-foreground'}`}>
                      Leaderboard
                    </span>
                  </Link>
                  <Link href="/detection">
                    <span className={`hidden md:inline text-sm font-medium transition-colors hover:text-primary cursor-pointer ${location === '/detection' ? 'text-primary' : 'text-muted-foreground'}`}>
                      Detection
                    </span>
                  </Link>
                  <div>
                    <DetectionBadge />
                  </div>
                  <Link href="/capture">
                    <span className={`inline-flex items-center h-8 px-3 rounded-full text-xs font-black tracking-[0.08em] uppercase cursor-pointer transition-all ${location === '/capture' ? 'ls-button-primary text-white shadow-[0_0_18px_rgba(124,58,237,0.45)]' : 'border border-violet-500/40 text-violet-300 hover:text-white hover:border-violet-400 hover:bg-violet-500/20'}`}>
                      New Pact
                    </span>
                  </Link>
                  <Link href="/credits">
                    <Badge variant="outline" className="gap-1 cursor-pointer hover:bg-yellow-500/10 border-yellow-500/50 px-2 py-0.5">
                      <Coins className="w-3 h-3 text-yellow-500" />
                      <span className="text-yellow-500 font-bold text-xs">{creditBalance}</span>
                    </Badge>
                  </Link>
                  {isDemoUser && (
                    <Badge
                      variant="outline"
                      className="hidden lg:inline-flex text-[10px] uppercase tracking-widest border-cyan-500/50 text-cyan-300 bg-cyan-500/10"
                    >
                      Demo User
                    </Badge>
                  )}
                  <button 
                    onClick={logout}
                    className="hidden md:inline text-sm font-medium text-muted-foreground hover:text-primary transition-colors ml-2 cursor-pointer"
                  >
                    Sign Out
                  </button>
                </>
              ) : (
                !isLanding && (
                  <Link href="/auth">
                    <Button variant="ghost" size="sm">Log In</Button>
                  </Link>
                )
              )}
              {!user && isLanding && (
                <Link href="/auth">
                  <Button variant="outline" size="sm" className="rounded-none border-primary/20 hover:bg-primary hover:text-background transition-all">
                    Sign In
                  </Button>
                </Link>
              )}
            </nav>

            {user && (
              <Link href="/settings">
                <Button variant="ghost" size="icon" className="hover:text-primary shrink-0" aria-label="Settings">
                  <Settings className="w-4 h-4" />
                </Button>
              </Link>
            )}
          </div>
        </div>
      </header>

      {user && location !== "/onboarding" && <ConsequenceNotificationCenter />}

      <main className="flex-1 pt-[calc(4rem+env(safe-area-inset-top))]">
        {children}
      </main>

      {user && (
        <footer 
          className="border-t border-border py-8 mt-auto"
          style={{ paddingBottom: "calc(2rem + env(safe-area-inset-bottom))" }}
        >
          <div className="container mx-auto px-4 text-center text-xs text-muted-foreground font-mono">
            <p>INTENT SYSTEMS © 2026</p>
            <div className="mt-2 flex items-center justify-center gap-4">
              <Link href="/admin">
                <span className="hover:text-foreground hover:underline cursor-pointer">System Admin</span>
              </Link>
            </div>
          </div>
        </footer>
      )}

      {/* Passive Intent Suggestion Modal */}
      <PassiveIntentSuggestion
        pattern={activeSuggestion}
        onCapture={(pattern) => {
          lockInPattern(pattern.id);
          setActiveSuggestion(null);
        }}
        onDismiss={(pattern) => {
          dismissPattern(pattern.id);
          setActiveSuggestion(null);
        }}
      />
    </div>
  );
}
