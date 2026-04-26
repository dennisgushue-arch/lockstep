import React from "react";
import { useLocation } from "wouter";
import { useApp } from "@/lib/mock-data";
import { Button } from "@/components/ui/button";

export default function PactAct() {
  const [location] = useLocation();
  const { commitments, completeCommitment } = useApp();

  // extract pact id from URL
  const pactId = location.split("/")[2];

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
    <div className="min-h-screen bg-black text-white flex flex-col justify-center px-6">
      <div className="space-y-6 text-center">
        <div className="text-xs text-zinc-500 uppercase tracking-widest">
          Active Pact
        </div>

        <h1 className="text-3xl font-bold">
          Do this now
        </h1>

        <div className="border border-zinc-800 bg-zinc-950 p-6 space-y-4">
          <div className="text-xl font-bold">
            {pact.actionText || pact.intent?.action || pact.intent?.goal || pact.intent?.text}
          </div>

          <div className="text-zinc-400">
            {minutesLeft} minutes left
          </div>
        </div>

        <div className="space-y-3">
          <Button
            onClick={() => {
              void completeCommitment(pact.id);
            }}
            className="w-full h-14 bg-white text-black font-bold"
          >
            I DID IT
          </Button>

          <Button
            onClick={() => {
              window.location.href = `lockstep://pact/${pact.id}?mode=prove`;
            }}
            className="w-full h-14 bg-zinc-800 text-white"
          >
            PROVE IT
          </Button>
        </div>
      </div>
    </div>
  );
}