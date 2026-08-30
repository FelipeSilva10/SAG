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
          className="block text-xs font-bold uppercase tracking-wide text-[#45566a]"
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
            "h-10 w-full rounded border bg-white px-3.5 py-2.5 pr-10 text-sm text-[#1f2d3a]",
            "appearance-none transition-colors duration-200",
            "focus:outline-none focus:ring-2",

            error
              ? "border-red-400 focus:border-red-400 focus:ring-red-400/30"
              : "border-[#d4e1e9] hover:border-[#b9cbd7] focus:border-[#23638c] focus:ring-[#23638c]/20",

            disabled &&
              "cursor-not-allowed bg-[#f3f7fa] text-[#8ea0b0]",

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
          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#62798a]"
        />
      </div>

      {error && (
        <p
          id={errorId}
          className="text-xs text-red-600"
        >
          ⚠ {error}
        </p>
      )}
    </div>
  );
}
