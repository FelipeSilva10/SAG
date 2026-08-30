import * as React from "react";
import { Inbox } from "lucide-react";

import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon?: React.ReactNode;
  emoji?: string;
  title?: string;
  message?: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({
  icon,
  emoji,
  title = "Nenhum registro",
  message,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "flex flex-col items-center justify-center",
        "px-4 py-16 text-center",
        className
      )}
    >
      <div
        aria-hidden="true"
        className={cn(
          "mb-4 flex h-12 w-12 items-center justify-center",
          "rounded-lg bg-[#f3f7fa] text-[#8ea0b0]"
        )}
      >
        {icon ?? (emoji ? <span className="text-2xl">{emoji}</span> : <Inbox size={22} />)}
      </div>

      <h3 className="text-sm font-bold text-[#1f2d3a]">
        {title}
      </h3>

      {message && (
        <p className="mt-1 max-w-xs text-xs leading-relaxed text-[#62798a]">
          {message}
        </p>
      )}

      {action && (
        <div className="mt-5 flex items-center justify-center">
          {action}
        </div>
      )}
    </div>
  );
}

EmptyState.displayName = "EmptyState";
