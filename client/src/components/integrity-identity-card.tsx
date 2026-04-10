import React from "react";
import type { IntegrityIdentity } from "@/lib/integrity-identity";

export default function IntegrityIdentityCard({
  score,
  identity,
}: {
  score: number;
  identity: IntegrityIdentity;
}) {
  return (
    <div className={`border p-5 space-y-3 ${identity.borderClass}`}>
      <div className="text-xs uppercase tracking-widest text-zinc-500">
        Integrity Identity
      </div>

      <div className="flex items-end justify-between gap-4">
        <div>
          <div className={`text-2xl font-bold ${identity.colorClass}`}>
            {identity.label}
          </div>
          <div className="text-sm text-zinc-300 mt-1">
            {identity.description}
          </div>
        </div>

        <div className="text-right">
          <div className="text-3xl font-bold">{score}</div>
          <div className="text-[10px] uppercase tracking-widest text-zinc-500">
            Score
          </div>
        </div>
      </div>
    </div>
  );
}
