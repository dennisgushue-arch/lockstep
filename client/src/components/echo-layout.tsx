import React from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Brain, Plus, Search, RotateCcw, Clock, Users } from "lucide-react";

interface EchoLayoutProps {
  children: React.ReactNode;
}

export function EchoLayout({ children }: EchoLayoutProps) {
  const [location] = useLocation();

  const navItems = [
    { href: "/echo", label: "Home", icon: Brain },
    { href: "/echo/recall", label: "Recall", icon: Search },
    { href: "/echo/today", label: "Today", icon: RotateCcw },
    { href: "/echo/timeline", label: "Timeline", icon: Clock },
    { href: "/echo/people", label: "People", icon: Users },
  ];

  const isActive = (href: string) => {
    if (href === "/echo") return location === "/echo";
    return location.startsWith(href);
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans overflow-x-hidden">
      {/* Background gradient — teal/cyan theme to distinguish from Lockstep */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(1200px 500px at 50% -5%, rgba(6,182,212,0.08), transparent 55%), linear-gradient(180deg, #040810 0%, #050505 100%)",
        }}
      />

      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-cyan-500/20 bg-background/80 backdrop-blur-md">
        <div className="container mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/echo">
            <span className="flex items-center gap-2 cursor-pointer group">
              <Brain className="w-5 h-5 text-cyan-400 group-hover:text-cyan-300 transition-colors" />
              <span className="text-lg font-bold tracking-tight text-cyan-100 group-hover:text-white transition-colors">
                ECHO
              </span>
              <span className="hidden sm:inline text-[10px] uppercase tracking-widest text-cyan-500/60 font-mono ml-1">
                memory recovery
              </span>
            </span>
          </Link>

          <div className="flex items-center gap-2">
            <nav className="hidden md:flex items-center gap-1">
              {navItems.map(({ href, label, icon: Icon }) => (
                <Link key={href} href={href}>
                  <span
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer ${
                      isActive(href)
                        ? "bg-cyan-500/15 text-cyan-300 border border-cyan-500/30"
                        : "text-muted-foreground hover:text-cyan-300 hover:bg-cyan-500/10"
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {label}
                  </span>
                </Link>
              ))}
            </nav>

            <Link href="/echo/capture">
              <Button
                size="sm"
                className="bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 hover:bg-cyan-500/30 hover:text-white gap-1.5 text-xs"
                variant="outline"
              >
                <Plus className="w-3.5 h-3.5" />
                Capture
              </Button>
            </Link>

            <Link href="/">
              <span className="hidden md:inline text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer ml-2">
                ← Lockstep
              </span>
            </Link>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 pt-14 relative z-10">{children}</main>

      {/* Mobile bottom nav */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-50 border-t border-cyan-500/20 bg-background/90 backdrop-blur-md md:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="flex items-center justify-around px-2 py-2">
          {navItems.map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href}>
              <span
                className={`flex flex-col items-center gap-1 px-3 py-1 rounded-xl transition-all cursor-pointer ${
                  isActive(href)
                    ? "text-cyan-300"
                    : "text-muted-foreground hover:text-cyan-400"
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-[10px] font-medium">{label}</span>
              </span>
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}
