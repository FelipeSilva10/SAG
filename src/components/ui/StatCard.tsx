import * as React from "react";

import { cn } from "@/lib/utils";

type StatTone = "accent" | "green" | "amber" | "red" | "gray";

interface StatCardProps {
  label: string;
  value: React.ReactNode;
  icon?: React.ReactNode;
  hint?: string;
  tone?: StatTone;
  className?: string;
}

const toneStyles: Record<StatTone, string> = {
  accent: "bg-[#e8f1f6] text-[#23638c]",
  green: "bg-emerald-50 text-emerald-700",
  amber: "bg-amber-50 text-amber-700",
  red: "bg-red-50 text-red-700",
  gray: "bg-[#f3f7fa] text-[#62798a]",
};

export function StatCard({
  label,
  value,
  icon,
  hint,
  tone = "accent",
  className,
}: StatCardProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-lg border border-[#e3ebf1] bg-white p-4 shadow-card",
        className
      )}
    >
      {icon && (
        <div
          aria-hidden="true"
          className={cn(
            "flex h-10 w-10 flex-none items-center justify-center rounded-lg",
            toneStyles[tone]
          )}
        >
          {icon}
        </div>
      )}
      <div className="min-w-0">
        <p className="text-xs font-bold uppercase tracking-wide text-[#62798a]">
          {label}
        </p>
        <p className="mt-0.5 truncate text-xl font-extrabold text-[#1f2d3a]">
          {value}
        </p>
        {hint && <p className="text-xs text-[#8ea0b0]">{hint}</p>}
      </div>
    </div>
  );
}

StatCard.displayName = "StatCard";
