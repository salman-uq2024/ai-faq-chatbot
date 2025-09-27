import type { PropsWithChildren } from "react";
import { cn } from "@/lib/cn";

type Props = PropsWithChildren<{
  variant?: "info" | "success" | "error";
  title?: string;
  className?: string;
}>;

const variantClasses: Record<NonNullable<Props["variant"]>, string> = {
  info: "bg-blue-50 text-blue-800 border border-blue-100",
  success: "bg-emerald-50 text-emerald-800 border border-emerald-100",
  error: "bg-rose-50 text-rose-800 border border-rose-100",
};

export function Alert({ variant = "info", title, className, children }: Props) {
  return (
    <div className={cn("rounded-xl px-4 py-3 text-sm", variantClasses[variant], className)}>
      {title && <div className="mb-1 font-medium">{title}</div>}
      <div className="leading-relaxed">{children}</div>
    </div>
  );
}
