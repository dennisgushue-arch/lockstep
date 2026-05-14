import React from "react";

export function PremiumButton({
  children,
  danger = false,
  onClick,
}: {
  children: React.ReactNode;
  danger?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full h-14 font-black ${danger ? "ls-button-danger" : "ls-button-primary"}`}
    >
      {children}
    </button>
  );
}
