import type { ButtonHTMLAttributes } from "react";
import { forwardRef } from "react";
import { cn } from "@/lib/cn";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost";
  loading?: boolean;
};

const variantClasses: Record<NonNullable<Props["variant"]>, string> = {
  primary:
    "bg-blue-600 text-white hover:bg-blue-500 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-600",
  secondary:
    "bg-slate-100 text-slate-900 hover:bg-slate-200 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-slate-300",
  ghost:
    "bg-transparent text-slate-700 hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-slate-300",
};

export const Button = forwardRef<HTMLButtonElement, Props>(
  ({ className, children, variant = "primary", loading = false, disabled, ...props }, ref) => {
    const isDisabled = disabled ?? loading;
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:opacity-60 disabled:cursor-not-allowed",
          variantClasses[variant],
          className,
        )}
        disabled={isDisabled}
        {...props}
      >
        {loading && <span className="mr-2 h-3 w-3 animate-spin rounded-full border-2 border-white/40 border-t-white" />}
        {children}
      </button>
    );
  },
);

Button.displayName = "Button";
