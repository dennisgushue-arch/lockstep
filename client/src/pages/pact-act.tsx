import React, { useMemo } from "react";
import { useLocation } from "wouter";
import { useApp } from "@/lib/mock-data";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { readSourceBanner } from "@/lib/deeplink";

export default function PactAct() {
  const [location, setLocation] = useLocation();
  const { commitments, completeCommitment, confirmTeamMember } = useApp();
  const { toast } = useToast();

  // extract pact id from URL
  const pactId = location.split("/")[2];
  const search = typeof window !== "undefined" ? window.location.search : "";
  const params = new URLSearchParams(search);
  const invitee = params.get("invitee")?.trim() || "";
  const sourceBanner = useMemo(() => readSourceBanner(search), [search]);

  const pact = commitments.find((c) => c.id === pactId);

  if (!pact) {
    return (
      <div className="min-h-screen flex items-center justify-center text-white">
        Pact not found
      </div>
    );
  }

  const deadline = new Date(pact.scheduledDate);
  const timeLeftMs = deadline.getTime() - Date.now();
  const minutesLeft = Math.max(0, Math.floor(timeLeftMs / 60000));

  return (
    <div className="min-h-screen bg-black/95 text-white flex flex-col justify-center px-6">
      <div className="absolute inset-0 bg-gradient-to-b from-black/85 via-black/70 to-black/90 pointer-events-none" />
      <div className="relative space-y-6 text-center max-w-lg mx-auto w-full">
        {sourceBanner && (
          <div className="border border-red-900/40 bg-red-950/10 p-4 text-left">
            <div className="text-xs uppercase tracking-widest text-red-300">{sourceBanner.title}</div>
            <div className="text-sm text-zinc-300 mt-2">{sourceBanner.body}</div>
          </div>
        )}

        <div className="text-xs text-zinc-500 uppercase tracking-widest">
          Active Pact
        </div>

        <h1 className="text-3xl font-bold">
          Do this now
        </h1>

        <div className="border border-zinc-800 bg-zinc-950/90 p-6 space-y-4">
          <div className="text-xl font-bold">
            {pact.actionText || pact.intent?.action || pact.intent?.goal || pact.intent?.text}
          </div>

          <div className="text-zinc-400">
            {minutesLeft} minutes left
          </div>

          <div className="text-sm text-amber-300 font-medium">
            You're close to missing this
          </div>
        </div>

        <div className="space-y-3">
          <Button
            onClick={async () => {
              const completion = await completeCommitment(pact.id, {
                method: "checkin",
                confidence: "low",
                text: invitee ? `Confirmed by ${invitee}` : "I did it.",
                submittedAt: new Date().toISOString(),
              });

              if (completion.status === "completed") {
                setLocation(`/result/${pact.id}`);
                return;
              }

              toast({
                title: "Confirmation saved",
                description: "Waiting on remaining team members.",
              });
            }}
            className="w-full h-14 bg-white text-black font-bold"
          >
            I DID IT
          </Button>

          {invitee && pact.teamChallenge?.enabled && (
            <Button
              variant="outline"
              onClick={async () => {
                const completion = await confirmTeamMember(pact.id, invitee);
                if (completion.status === "completed") {
                  setLocation(`/result/${pact.id}`);
                  return;
                }
                toast({
                  title: `Confirmed for ${invitee}`,
                  description: "Thanks — still waiting on other team members.",
                });
              }}
              className="w-full h-12 font-bold"
            >
              CONFIRM AS {invitee.toUpperCase()}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}