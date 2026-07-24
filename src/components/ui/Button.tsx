// ─────────────────────────────────────────────────────────────────────────────
// components/ui/Button.tsx — improved
// ─────────────────────────────────────────────────────────────────────────────
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger" | "ghost" | "purple" | "success";
  size?: "xs" | "sm" | "md" | "lg";
  loading?: boolean;
  fullWidth?: boolean;
}

export default function Button({
  variant = "primary",
  size = "md",
  loading,
  fullWidth,
  className,
  children,
  disabled,
  ...props
}: ButtonProps) {
  const base = [
    "inline-flex items-center justify-center gap-2 rounded-lg font-semibold whitespace-nowrap",
    "transition duration-150 active:scale-[0.98]",
    "disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100",
    "select-none",
  ].join(" ");

  const variants = {
    primary:   "bg-[#285a82] hover:bg-[#204967] text-white shadow-sm focus-visible:ring-[#285a82]",
    secondary: "border border-slate-300 bg-white hover:bg-[#eef4f8] text-slate-700 focus-visible:ring-[#285a82]",
    danger:    "bg-red-600 hover:bg-red-700 text-white shadow-sm focus-visible:ring-red-500",
    ghost:     "bg-transparent hover:bg-slate-100 text-slate-600 focus-visible:ring-[#285a82]",
    purple:    "bg-violet-600 hover:bg-violet-700 text-white shadow-sm focus-visible:ring-violet-500",
    success:   "bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm focus-visible:ring-emerald-500",
  };

  const sizes = {
    xs: "text-[11px] px-2.5 py-1.5 h-7",
    sm: "text-xs px-3 py-2 h-8",
    md: "text-sm px-4 py-2.5 h-10 min-h-[40px]",
    lg: "text-sm px-5 py-3 h-11 min-h-[44px]",
  };

  return (
    <button
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(
        base,
        variants[variant],
        sizes[size],
        fullWidth && "w-full",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1",
        className
      )}
      {...props}
    >
      {loading && <Loader2 size={13} className="animate-spin flex-none" />}
      {children}
    </button>
  );
}
