import { cn } from "../../lib/utils";
import { formatCurrency } from "../../lib/formatCurrency";
import { ENTRY_KIND, TONE_TEXT, type EntryKind, type Tone } from "../../lib/entry-types";

export interface SummarySegment {
  kind: EntryKind;
  label: string;
  amount: number;
}

interface MonthSummaryProps {
  label: string;
  total: number;
  count: number;
  tone: Tone;
  /** Todos os tipos da natureza, inclusive os zerados (aparecem na legenda). */
  segments: SummarySegment[];
}

export function MonthSummary({ label, total, count, tone, segments }: MonthSummaryProps) {
  return (
    <section
      aria-label="Resumo do mês"
      className="mb-3.5 flex flex-wrap items-center gap-7 rounded-[10px] border border-border bg-surface px-5 py-4"
    >
      <div>
        <div className="text-[11px] font-bold uppercase tracking-[0.06em] text-text-subtle">
          {label}
        </div>
        <div className={cn("text-[26px] font-bold leading-tight tabular-nums", TONE_TEXT[tone])}>
          {formatCurrency(total)}
        </div>
        <div className="text-xs text-text-muted">
          {count} {count === 1 ? "lançamento" : "lançamentos"}
        </div>
      </div>
      <div className="flex min-w-[240px] flex-1 flex-col gap-2.5">
        <div className="flex h-2 gap-0.5 overflow-hidden rounded bg-bg" aria-hidden>
          {segments
            .filter((segment) => segment.amount > 0)
            .map((segment) => (
              <span
                key={segment.kind}
                className={ENTRY_KIND[segment.kind].dotCls}
                style={{ flexGrow: segment.amount }}
              />
            ))}
        </div>
        <ul className="flex flex-wrap gap-[18px] text-[12.5px] text-text-muted">
          {segments.map((segment) => (
            <li key={segment.kind} className="flex items-center">
              <i
                className={cn(
                  "mr-1.5 inline-block h-2 w-2 rounded-sm",
                  ENTRY_KIND[segment.kind].dotCls,
                )}
              />
              {segment.label}
              <b className="ml-1.5 font-semibold text-text">{formatCurrency(segment.amount)}</b>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
