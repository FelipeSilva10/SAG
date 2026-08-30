import * as React from "react";

import { cn } from "@/lib/utils";

type BadgeVariant =
  | "blue"
  | "green"
  | "amber"
  | "red"
  | "gray"
  | "purple"
  | "sky"
  | "rose";

type BadgeSize = "sm" | "md";

interface BadgeProps {
  variant?: BadgeVariant;
  size?: BadgeSize;
  dot?: boolean;
  children: React.ReactNode;
  className?: string;
}

const badgeVariants: Record<BadgeVariant, string> = {
  blue: "border border-blue-200 bg-blue-50 text-blue-700",
  green: "border border-emerald-200 bg-emerald-50 text-emerald-700",
  amber: "border border-amber-200 bg-amber-50 text-amber-700",
  red: "border border-red-200 bg-red-50 text-red-700",
  gray: "border border-[#d4e1e9] bg-[#f3f7fa] text-[#45566a]",
  purple: "border border-violet-200 bg-violet-50 text-violet-700",
  sky: "border border-[#bcdcec] bg-[#e8f1f6] text-[#23638c]",
  rose: "border border-rose-200 bg-rose-50 text-rose-700",
};

const dotColors: Record<BadgeVariant, string> = {
  blue: "bg-blue-500",
  green: "bg-emerald-500",
  amber: "bg-amber-500",
  red: "bg-red-500",
  gray: "bg-slate-400",
  purple: "bg-violet-500",
  sky: "bg-sky-500",
  rose: "bg-rose-500",
};

const sizeVariants: Record<BadgeSize, string> = {
  sm: "px-2 py-0.5 text-[10px]",
  md: "px-2.5 py-1 text-xs",
};

export function Badge({
  variant = "gray",
  size = "sm",
  dot = false,
  children,
  className,
}: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex flex-none items-center gap-1.5 rounded-full font-semibold whitespace-nowrap transition-colors",
        badgeVariants[variant],
        sizeVariants[size],
        className
      )}
    >
      {dot && (
        <span
          aria-hidden="true"
          className={cn(
            "h-1.5 w-1.5 rounded-full flex-none",
            dotColors[variant]
          )}
        />
      )}

      {children}
    </span>
  );
}

Badge.displayName = "Badge";