import React, { useMemo, useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const ONBOARDING_STORAGE_KEY = "onboarding_completed_v1";

type Step = {
  title: string;
  description: string;
  kicker: string;
};

const steps: Step[] = [
  {
    kicker: "Step 1",
    title: "Say what you'll do",
    description: "Capture the commitment in plain language. No vague promises.",
  },
  {
    kicker: "Step 2",
    title: "We detect patterns",
    description: "Lockstep watches repeated intent signals and flags your real priorities.",
  },
  {
    kicker: "Step 3",
    title: "You put something on the line",
    description: "Set a stake and consequence so your future self can't negotiate it away.",
  },
  {
    kicker: "Step 4",
    title: "You either follow through—or you don't",
    description: "Proof keeps the pact. Miss it, and the consequence executes.",
  },
];

export default function OnboardingPage() {
  const [, setLocation] = useLocation();
  const [index, setIndex] = useState(0);

  const step = useMemo(() => steps[index], [index]);
  const isLast = index === steps.length - 1;

  const completeOnboarding = () => {
    localStorage.setItem(ONBOARDING_STORAGE_KEY, "true");
    setLocation("/dashboard");
  };

  return (
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center px-4 py-8 bg-gradient-to-br from-black via-zinc-950 to-black">
      <Card className="w-full max-w-2xl border-border/60 bg-zinc-950/80 backdrop-blur-sm">
        <CardHeader className="space-y-4">
          <div className="flex items-center justify-between">
            <Badge variant="outline" className="uppercase tracking-widest text-xs">
              {step.kicker}
            </Badge>
            <div className="text-xs text-zinc-400">
              {index + 1} / {steps.length}
            </div>
          </div>
          <CardTitle className="text-3xl md:text-4xl font-heading font-bold leading-tight">
            {step.title}
          </CardTitle>
          <CardDescription className="text-base text-zinc-300">
            {step.description}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="flex gap-2" aria-hidden="true">
            {steps.map((_, i) => (
              <div
                key={i}
                className={`h-1.5 flex-1 rounded-full ${
                  i <= index ? "bg-red-500" : "bg-zinc-800"
                }`}
              />
            ))}
          </div>

          <p className="text-sm text-zinc-500">
            AI responses are for informational purposes only and may not be accurate.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 sm:justify-between">
            <Button
              variant="outline"
              className="rounded-none"
              onClick={completeOnboarding}
            >
              Skip
            </Button>

            <div className="flex gap-3">
              <Button
                variant="secondary"
                className="rounded-none"
                disabled={index === 0}
                onClick={() => setIndex((v) => Math.max(0, v - 1))}
              >
                Back
              </Button>

              <Button
                className="rounded-none font-bold"
                onClick={() => {
                  if (isLast) {
                    completeOnboarding();
                    return;
                  }
                  setIndex((v) => Math.min(steps.length - 1, v + 1));
                }}
              >
                {isLast ? "Get Started" : "Next"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
