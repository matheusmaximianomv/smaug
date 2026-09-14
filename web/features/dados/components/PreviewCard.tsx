"use client";

import type { ReactNode } from "react";
import { cn } from "@/shared/lib/utils";

export interface PreviewMetaItem {
  label: string;
  value: ReactNode;
}

interface PreviewCardProps {
  title: string;
  count: number;
  countLabel: string;
  meta?: PreviewMetaItem[];
  footer?: ReactNode;
  children?: ReactNode;
  className?: string;
}

export function PreviewCard({
  title,
  count,
  countLabel,
  meta = [],
  footer,
  children,
  className,
}: PreviewCardProps) {
  return (
    <div
      data-testid="preview-card"
      className={cn("rounded-lg border border-border bg-surface p-5 sm:sticky sm:top-4", className)}
    >
      <div className="text-[11px] font-bold uppercase tracking-[0.06em] text-text-muted">
        {title}
      </div>
      <div className="mt-1 text-[34px] font-bold leading-none">{count}</div>
      <div className="mt-1 text-[12.5px] text-text-muted">{countLabel}</div>

      {meta.length > 0 && (
        <dl className="mt-4 space-y-1.5 border-t border-border pt-3">
          {meta.map((item) => (
            <div key={item.label} className="flex items-center justify-between gap-3 text-[13px]">
              <dt className="text-text-muted">{item.label}</dt>
              <dd className="font-semibold">{item.value}</dd>
            </div>
          ))}
        </dl>
      )}

      {children}
      {footer && <p className="mt-3 text-[11.5px] text-text-subtle">{footer}</p>}
    </div>
  );
}
