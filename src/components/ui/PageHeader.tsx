"use client";

import * as React from "react";
import { Search } from "lucide-react";

import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  actions?: React.ReactNode;
  className?: string;
}

export function PageHeader({
  title,
  subtitle,
  searchValue,
  onSearchChange,
  searchPlaceholder = "Buscar…",
  actions,
  className,
}: PageHeaderProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 border-b border-[#e3ebf1] bg-white px-4 py-4",
        "sm:flex-row sm:items-center sm:justify-between sm:px-6",
        className
      )}
    >
      <div className="min-w-0">
        <h1 className="truncate text-lg font-extrabold text-[#1f2d3a]">{title}</h1>
        {subtitle && (
          <p className="mt-0.5 text-sm text-[#62798a]">{subtitle}</p>
        )}
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        {onSearchChange && (
          <div className="relative w-full sm:w-64">
            <Search
              size={15}
              aria-hidden="true"
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#8ea0b0]"
            />
            <input
              type="text"
              value={searchValue}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder={searchPlaceholder}
              className={cn(
                "h-10 w-full rounded border border-[#d4e1e9] bg-white pl-9 pr-3 text-sm text-[#1f2d3a]",
                "placeholder-[#8ea0b0] transition-colors",
                "focus:border-[#23638c] focus:outline-none focus:ring-2 focus:ring-[#23638c]/15"
              )}
            />
          </div>
        )}

        {actions && (
          <div className="flex flex-none flex-wrap items-center gap-2">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}

PageHeader.displayName = "PageHeader";
