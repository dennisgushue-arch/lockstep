import React, { useMemo } from "react";
import { useLocation } from "wouter";
import { AlertTriangle, BellRing, Clock3, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useApp } from "@/lib/mock-data";
import { buildConsequenceNotifications } from "@/lib/engagement";

function iconFor(type: string) {
  switch (type) {
    case "deadline-pressure":
      return <Clock3 className="h-4 w-4" />;
    case "missed-outcome":
      return <AlertTriangle className="h-4 w-4" />;
    case "recovery-trigger":
      return <RotateCcw className="h-4 w-4" />;
    default:
      return <BellRing className="h-4 w-4" />;
  }
}

function badgeLabelFor(type: string) {
  switch (type) {
    case "missed-outcome":
      return "Consequence logged";
    case "recovery-trigger":
      return "Recovery required";
    default:
      return "Consequence approaching";
  }
}

export function ConsequenceNotificationCenter() {
  const { commitments, behaviorProfile } = useApp();
  const [, setLocation] = useLocation();

  const notifications = useMemo(
    () => buildConsequenceNotifications(commitments, { worstTimeOfDay: behaviorProfile.worstTimeOfDay }),
    [behaviorProfile.worstTimeOfDay, commitments],
  );
  const primary = notifications[0];

  if (!primary) return null;

  return (
    <div className="border-b border-red-500/20 bg-red-950/20">
      <div className="container mx-auto px-4 py-3">
        <div className="flex flex-col gap-3 rounded-none border border-red-500/30 bg-black/30 p-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-red-300">
              {iconFor(primary.type)}
              <Badge variant="outline" className="border-red-500/50 text-red-300">
                {badgeLabelFor(primary.type)}
              </Badge>
            </div>
            <div className="text-lg font-bold text-white">{primary.title}</div>
            <div className="text-sm text-zinc-300">{primary.detail}</div>
          </div>

          <div className="flex flex-wrap gap-2">
            {(primary.type === "pre-failure-warning" || primary.type === "deadline-pressure") && (
              <Button className="rounded-none bg-red-600 text-white hover:bg-red-700" onClick={() => setLocation(`/pact/${primary.commitmentId}/act?source=notification`)}>
                Do it now
              </Button>
            )}
            {primary.type === "missed-outcome" && (
              <Button className="rounded-none bg-red-600 text-white hover:bg-red-700" onClick={() => setLocation(`/result/${primary.commitmentId}?source=notification`)}>
                See result
              </Button>
            )}
            {primary.type === "recovery-trigger" && (
              <Button className="rounded-none bg-red-600 text-white hover:bg-red-700" onClick={() => setLocation(`/recovery/${primary.commitmentId}?source=notification`)}>
                Start recovery pact
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
