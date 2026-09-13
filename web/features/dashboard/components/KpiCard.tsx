import { cn } from "@/shared/lib/utils";
import { formatCurrency } from "@/shared/lib/formatCurrency";

interface KpiCardProps {
  label: string;
  value: number;
  sublabel: string;
  colorScheme: "green" | "red" | "positive" | "negative";
}

const COLOR_MAP: Record<KpiCardProps["colorScheme"], string> = {
  green: "border-l-[3px] border-l-green",
  red: "border-l-[3px] border-l-red",
  positive: "border-l-[3px] border-l-green",
  negative: "border-l-[3px] border-l-red",
};

export function KpiCard({ label, value, sublabel, colorScheme }: KpiCardProps) {
  return (
    <div
      className={cn(
        "rounded-lg border border-border bg-surface p-5 flex flex-col gap-1",
        COLOR_MAP[colorScheme],
      )}
    >
      <span className="text-[11.5px] font-bold uppercase tracking-wide text-text-muted">
        {label}
      </span>
      <span className="text-[22px] font-bold text-text">{formatCurrency(value)}</span>
      <span className="text-xs text-text-subtle">{sublabel}</span>
    </div>
  );
}
