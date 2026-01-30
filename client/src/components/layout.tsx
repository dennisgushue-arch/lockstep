import React from "react";
import { Link, useLocation } from "wouter";
import { useApp } from "@/lib/mock-data";
import { Button } from "@/components/ui/button";
import { DetectionBadge } from "@/components/detection-notifications";

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { user, logout } = useApp();
  
  const isLanding = location === "/";
  const isAuth = location === "/auth";

  if (isAuth) {
    return <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-4">{children}</div>;
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans overflow-x-hidden">
      <div className="noise-bg" />
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur-md">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link href={user ? "/dashboard" : "/"}>
            <span className="text-xl font-heading font-bold tracking-tighter hover:text-primary/80 transition-colors cursor-pointer">
              INTENT.
            </span>
          </Link>

          <nav className="flex items-center gap-4">
            {user ? (
              <>
                <Link href="/dashboard">
                  <span className={`text-sm font-medium transition-colors hover:text-primary cursor-pointer ${location === '/dashboard' ? 'text-primary' : 'text-muted-foreground'}`}>
                    Dashboard
                  </span>
                </Link>
                <Link href="/detection">
                  <span className={`text-sm font-medium transition-colors hover:text-primary cursor-pointer ${location === '/detection' ? 'text-primary' : 'text-muted-foreground'}`}>
                    Detection
                  </span>
                </Link>
                <DetectionBadge />
                <Link href="/capture">
                  <span className={`text-sm font-medium transition-colors hover:text-primary cursor-pointer ${location === '/capture' ? 'text-primary' : 'text-muted-foreground'}`}>
                    New Intent
                  </span>
                </Link>
                <button 
                  onClick={logout}
                  className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors ml-2 cursor-pointer"
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
        </div>
      </header>

      <main className="flex-1 pt-16">
        {children}
      </main>

      {user && (
        <footer className="border-t border-border py-8 mt-auto">
          <div className="container mx-auto px-4 text-center text-xs text-muted-foreground font-mono">
            <p>INTENT SYSTEMS © 2026</p>
            <Link href="/admin">
              <span className="mt-2 inline-block hover:text-foreground hover:underline cursor-pointer">System Admin</span>
            </Link>
          </div>
        </footer>
      )}
    </div>
  );
}
