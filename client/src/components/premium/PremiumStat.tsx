import React from "react";

export function PremiumStat({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="ls-card p-4 space-y-1">
      <div className="text-[10px] uppercase tracking-[0.28em] text-zinc-400">{label}</div>
      <div className="text-2xl font-black">{value}</div>
    </div>
  );
}
