import { cn } from "../../lib/utils";
import { TONE_TEXT, type Tone } from "../../lib/entry-types";

export interface VersionHistoryRow {
  key: string;
  /** "A partir de Jan/26". */
  from: string;
  description: string;
  /** Categoria, em despesa. */
  detail?: string;
  isCurrent: boolean;
  /** "R$ 150,00/mês". */
  amount: string;
}

interface VersionHistoryListProps {
  rows: VersionHistoryRow[];
  tone: Tone;
}

/** Aba Histórico: da versão mais recente para a mais antiga; 2 colunas até 768 px. */
export function VersionHistoryList({ rows, tone }: VersionHistoryListProps) {
  return (
    <ul aria-label="Histórico de versões" className="flex flex-col">
      {rows.map((row) => (
        <li
          key={row.key}
          className={cn(
            "grid grid-cols-[140px_minmax(0,1fr)_auto_130px] items-center gap-3.5 border-b border-border py-3 text-[13.5px]",
            "max-md:grid-cols-[1fr_auto]",
            !row.isCurrent && "text-text-subtle",
          )}
        >
          <span className="text-[12.5px] font-bold">{row.from}</span>
          <span>
            {row.description}
            {row.detail && (
              <small className="block text-[11.5px] text-text-subtle">{row.detail}</small>
            )}
          </span>
          <span>
            {row.isCurrent ? (
              <span className="rounded-full bg-red px-2 py-px text-[10.5px] font-bold text-white">
                Vigente
              </span>
            ) : (
              <span className="rounded-full border border-border bg-bg px-2 py-px text-[10.5px] font-bold text-text-subtle">
                Anterior
              </span>
            )}
          </span>
          <span
            className={cn("text-right font-bold tabular-nums", row.isCurrent && TONE_TEXT[tone])}
          >
            {row.amount}
          </span>
        </li>
      ))}
    </ul>
  );
}
