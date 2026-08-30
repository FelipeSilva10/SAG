// components/ui/Input.tsx — improved
import * as React from "react";
import { cn } from "@/lib/utils";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export default function Input({
  label,
  error,
  hint,
  leftIcon,
  rightIcon,
  className,
  id,
  ...props
}: InputProps) {
  const generatedId = React.useId();
  const inputId = id ?? generatedId;
  const errorId = `${inputId}-error`;
  const hintId = `${inputId}-hint`;
  const describedBy =
    [
      error ? errorId : null,
      hint && !error ? hintId : null,
    ]
      .filter(Boolean)
      .join(" ") || undefined;

  return (
    <div className="space-y-1.5">
      {label && (
        <label
          htmlFor={inputId}
          className="block text-xs font-bold text-[#45566a] uppercase tracking-wide"
        >
          {label}
        </label>
      )}

      <div className="relative">
        {leftIcon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[#62798a] pointer-events-none">
            {leftIcon}
          </div>
        )}
        <input
          id={inputId}
          aria-invalid={!!error}
          aria-describedby={describedBy}
          className={cn(
            "h-10 w-full rounded border bg-white py-2.5 text-sm text-[#1f2d3a]",
            "placeholder-[#8ea0b0] transition-colors duration-150",
            "focus:outline-none focus:ring-2 focus:ring-[#23638c]/15 focus:border-[#23638c]",
            "disabled:bg-[#f3f7fa] disabled:text-[#8ea0b0] disabled:cursor-not-allowed",
            error
              ? "border-red-400 focus:ring-red-400 focus:border-red-400"
              : "border-[#d4e1e9] hover:border-[#b9cbd7]",
            leftIcon ? "pl-9 pr-3" : "px-3.5",
            rightIcon ? "pr-9" : "",
            className
          )}
          {...props}
        />
        {rightIcon && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
            {rightIcon}
          </div>
        )}
      </div>

      {error && (
        <p id={errorId} className="text-xs text-red-600 flex items-center gap-1">
          <span className="text-red-500">⚠</span> {error}
        </p>
      )}
      {hint && !error && (
        <p id={hintId} className="text-xs text-slate-400">{hint}</p>
      )}
    </div>
  );
}
