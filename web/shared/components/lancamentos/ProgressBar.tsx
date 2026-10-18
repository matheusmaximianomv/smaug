import { cn } from "../../lib/utils";

interface ProgressBarProps {
  /** Entre 0 e 1. */
  value: number;
  label: string;
  className?: string;
}

export function ProgressBar({ value, label, className }: ProgressBarProps) {
  const percent = Math.round(Math.min(1, Math.max(0, value)) * 100);
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={percent}
      className={cn("h-1 overflow-hidden rounded-xs bg-bg", className)}
    >
      <span className="block h-full bg-tipo-parcelada" style={{ width: `${percent}%` }} />
    </div>
  );
}
