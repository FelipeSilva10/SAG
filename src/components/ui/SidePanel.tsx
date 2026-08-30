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
          "max-w-full border-l border-[#d4e1e9] bg-white",
          "shadow-xl outline-none",
          "md:relative md:inset-auto md:z-auto",
          width
        )}
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b border-[#e3ebf1] px-5 py-4">
          <div className="min-w-0 pr-3">
            <h3 className="text-sm font-bold leading-tight text-[#1f2d3a]">
              {title}
            </h3>

            {subtitle && (
              <p className="mt-0.5 text-xs text-[#62798a]">
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
              "text-[#8ea0b0] hover:bg-[#f3f7fa] hover:text-[#45566a]",
              "focus:outline-none focus:ring-2 focus:ring-[#23638c]/30"
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
