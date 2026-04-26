import React from "react";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";

export default function Step4Live() {
  const [, setLocation] = useLocation();

  return (
    <div className="space-y-6 text-center">
      <h1 className="text-3xl font-bold">
        This is live now.
      </h1>

      <p className="text-zinc-400">
        You either do it… or you don’t.
      </p>

      <Button
        onClick={() => setLocation("/momentum")}
        className="w-full h-14 bg-white text-black font-bold hover:bg-zinc-200"
      >
        GO TO MOMENTUM
      </Button>
    </div>
  );
}
