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
          className="block text-xs font-semibold text-slate-600 uppercase tracking-wide"
        >
          {label}
        </label>
      )}

      <div className="relative">
        {leftIcon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
            {leftIcon}
          </div>
        )}
        <input
          id={inputId}
          aria-invalid={!!error}
          aria-describedby={describedBy}
          className={cn(
            "h-10 w-full rounded-lg border bg-white py-2.5 text-sm text-slate-900",
            "placeholder-slate-400 transition-colors duration-150",
            "focus:outline-none focus:ring-2 focus:ring-[#285a82]/15 focus:border-[#285a82]",
            "disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed",
            error
              ? "border-red-400 focus:ring-red-400 focus:border-red-400"
              : "border-slate-200 hover:border-slate-300",
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
