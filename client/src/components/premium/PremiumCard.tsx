import React from "react";

export function PremiumCard({
  children,
  danger = false,
}: {
  children: React.ReactNode;
  danger?: boolean;
}) {
  return (
    <div className={`ls-card p-5 ${danger ? "ls-glow-red" : "ls-glow-purple"}`}>
      {children}
    </div>
  );
}
