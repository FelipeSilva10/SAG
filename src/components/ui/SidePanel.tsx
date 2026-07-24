"use client";

import * as React from "react";
import { X } from "lucide-react";

import { cn } from "@/lib/utils";

interface SidePanelProps {
  title: string;
  subtitle?: string;
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  width?: string;
}

export function SidePanel({
  title,
  subtitle,
  open,
  onClose,
  children,
  width = "w-80 sm:w-96",
}: SidePanelProps) {
  const panelRef = React.useRef<HTMLDivElement>(null);
  const onCloseRef = React.useRef(onClose);

  React.useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  React.useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onCloseRef.current();
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    if (!panelRef.current?.contains(document.activeElement)) {
      panelRef.current?.focus();
    }

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  if (!open) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-slate-950/25 md:hidden"
        onClick={onClose}
        aria-hidden="true"
      />

      <aside
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className={cn(
          "fixed inset-y-0 right-0 z-50 flex flex-none flex-col overflow-hidden",
          "max-w-full border-l border-slate-200 bg-white",
          "shadow-xl shadow-slate-900/10 outline-none",
          "md:relative md:inset-auto md:z-auto",
          "dark:border-slate-800 dark:bg-slate-900",
          width
        )}
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-100 px-5 py-4 dark:border-slate-800">
          <div className="min-w-0 pr-3">
            <h3 className="text-sm font-bold leading-tight text-slate-900 dark:text-slate-100">
              {title}
            </h3>

            {subtitle && (
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                {subtitle}
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar painel"
            className={cn(
              "flex-none rounded-lg p-1.5 transition-colors",
              "text-slate-400 hover:bg-slate-100 hover:text-slate-600",
              "focus:outline-none focus:ring-2 focus:ring-indigo-500/30",
              "dark:hover:bg-slate-800 dark:hover:text-slate-300"
            )}
          >
            <X size={15} aria-hidden="true" />
          </button>
        </div>

        {/* Body */}
        <div
          className={cn(
            "flex-1 overflow-y-auto overflow-x-hidden",
            "overscroll-contain",
            "p-5 space-y-4"
          )}
        >
          {children}
        </div>
      </aside>
    </>
  );
}

SidePanel.displayName = "SidePanel";
