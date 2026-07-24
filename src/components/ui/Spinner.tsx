import { Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";

type SpinnerSize = "sm" | "md" | "lg";

interface SpinnerProps {
  className?: string;
  size?: SpinnerSize;
  text?: string;
}

const spinnerSizes: Record<SpinnerSize, number> = {
  sm: 16,
  md: 24,
  lg: 36,
};

export function Spinner({
  className,
  size = "md",
  text,
}: SpinnerProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "flex flex-col items-center justify-center gap-3 py-12",
        className
      )}
    >
      <Loader2
        size={spinnerSizes[size]}
        className="animate-spin text-indigo-500 opacity-80"
        aria-hidden="true"
      />

      {text && (
        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
          {text}
        </p>
      )}

      <span className="sr-only">
        {text || "Carregando"}
      </span>
    </div>
  );
}

Spinner.displayName = "Spinner";
