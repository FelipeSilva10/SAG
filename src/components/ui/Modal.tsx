"use client";

import { X } from "lucide-react";

interface ModalProps {
  title: string;
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export default function Modal({ title, open, onClose, children, footer }: ModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-[#1f2d3a]/45"
        onClick={onClose}
      />

      {/* Dialog */}
      <div className="relative z-10 flex max-h-[90vh] w-full max-w-md flex-col rounded-xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-[#e3ebf1] px-6 py-4">
          <h2 className="text-sm font-bold text-[#1f2d3a]">{title}</h2>
          <button
            onClick={onClose}
            className="rounded p-1 text-[#8ea0b0] transition hover:bg-[#f3f7fa] hover:text-[#45566a]"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          {children}
        </div>

        {footer && (
          <div className="flex justify-end gap-2 border-t border-[#e3ebf1] px-6 py-4">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
