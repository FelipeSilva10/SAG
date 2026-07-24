import * as React from "react";
import { ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps
  extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  placeholder?: string;
  options: SelectOption[];
}

export function Select({
  label,
  error,
  placeholder,
  options,
  className,
  id,
  disabled,
  ...props
}: SelectProps) {
  const generatedId = React.useId();

  const selectId = id ?? generatedId;

  const errorId = `${selectId}-error`;

  return (
    <div className="space-y-1.5">
      {label && (
        <label
          htmlFor={selectId}
          className="block text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300"
        >
          {label}
        </label>
      )}

      <div className="relative">
        <select
          id={selectId}
          disabled={disabled}
          aria-invalid={!!error}
          aria-describedby={error ? errorId : undefined}
          className={cn(
            "h-10 w-full rounded-lg border bg-white px-3.5 py-2.5 pr-10 text-sm text-slate-900",
            "appearance-none transition-colors duration-200",
            "focus:outline-none focus:ring-2",
            "dark:bg-slate-900 dark:text-slate-100",

            error
              ? "border-red-400 focus:border-red-400 focus:ring-red-400/30"
              : "border-slate-200 hover:border-slate-300 focus:border-[#285a82] focus:ring-[#285a82]/20 dark:border-slate-700 dark:hover:border-slate-600",

            disabled &&
              "cursor-not-allowed bg-slate-50 text-slate-400 dark:bg-slate-800",

            className
          )}
          {...props}
        >
          {placeholder && (
            <option value="" disabled hidden>
              {placeholder}
            </option>
          )}

          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        <ChevronDown
          size={16}
          aria-hidden="true"
          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
        />
      </div>

      {error && (
        <p
          id={errorId}
          className="text-xs text-red-600 dark:text-red-400"
        >
          ⚠ {error}
        </p>
      )}
    </div>
  );
}
