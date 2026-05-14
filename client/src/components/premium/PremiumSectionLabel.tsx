import React from "react";

export function PremiumSectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-xs uppercase tracking-[0.35em] text-purple-300">
      {children}
    </div>
  );
}
