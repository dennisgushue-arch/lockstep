import React from "react";
import { Button } from "@/components/ui/button";

export default function Step1Capture({
  input,
  setInput,
  onNext,
  isLoading = false,
}: {
  input: string;
  setInput: (v: string) => void;
  onNext: () => void;
  isLoading?: boolean;
}) {
  return (
    <div className="space-y-8 text-center">
      <div className="text-xs text-zinc-500 uppercase tracking-widest">
        LOCKSTEP
      </div>

      <h1 className="text-3xl font-bold leading-tight">
        What do you keep saying you’ll do?
      </h1>

      <textarea
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="I need to..."
        className="w-full min-h-[120px] bg-black border border-zinc-800 p-4 text-white outline-none resize-none"
      />

      <p className="text-sm text-zinc-500">
        Don’t overthink it. Say it how you normally would.
      </p>

      <Button
        disabled={!input.trim() || isLoading}
        onClick={onNext}
        className="w-full h-14 bg-white text-black font-bold hover:bg-zinc-200"
      >
        {isLoading ? "ANALYZING..." : "CONTINUE"}
      </Button>
    </div>
  );
}
