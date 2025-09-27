import type { PropsWithChildren, ReactNode } from "react";
import { cn } from "@/lib/cn";

type CardProps = PropsWithChildren<{
  className?: string;
  header?: ReactNode;
  footer?: ReactNode;
}>;

export function Card({ className, header, children, footer }: CardProps) {
  return (
    <div className={cn("rounded-2xl border border-slate-200 bg-white p-6 shadow-sm", className)}>
      {header && <div className="mb-4 text-sm font-semibold text-slate-900">{header}</div>}
      <div className="space-y-3 text-sm text-slate-700">{children}</div>
      {footer && <div className="mt-4 pt-4 text-xs text-slate-500 border-t border-slate-100">{footer}</div>}
    </div>
  );
}
