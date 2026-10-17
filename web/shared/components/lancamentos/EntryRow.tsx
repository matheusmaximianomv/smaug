import { ArrowUp, ChevronRight } from "lucide-react";
import { cn } from "../../lib/utils";
import { formatCurrency } from "../../lib/formatCurrency";
import { ENTRY_KIND, TONE_TEXT, type EntryKind, type Tone } from "../../lib/entry-types";
import { ProgressBar } from "./ProgressBar";

interface EntryRowProps {
  kind: EntryKind;
  title: string;
  /** Partes do subtítulo, unidas por " · ". */
  subtitle: string[];
  amount: number;
  /** "de R$ X" (parcelada) ou "por mês" (séries). */
  amountCaption?: string;
  tone: Tone;
  /** Valor da versão anterior no mês do reajuste; nulo fora dele. */
  previousAmount?: number | null;
  /** Parcela n de N. */
  progress?: { current: number; total: number };
  onClick: () => void;
}

/** A linha inteira é um botão: abre a Ficha por clique, Enter ou Espaço. */
export function EntryRow({
  kind,
  title,
  subtitle,
  amount,
  amountCaption,
  tone,
  previousAmount,
  progress,
  onClick,
}: EntryRowProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group mt-[5px] flex w-full items-center gap-3 rounded-lg border border-border bg-surface px-3.5 py-2.5 text-left text-text",
        "transition-[border-color,box-shadow] hover:border-[#d6d0ca] hover:shadow-[0_2px_8px_rgba(0,0,0,0.04)]",
        "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-red",
      )}
    >
      <span className={cn("h-2 w-2 shrink-0 rounded-full", ENTRY_KIND[kind].dotCls)} aria-hidden />
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="text-[13.5px] font-semibold">
          {title}
          {previousAmount != null && (
            <span className="ml-2 inline-flex items-center gap-[3px] whitespace-nowrap rounded-full border border-border bg-bg px-[7px] py-px align-[1px] text-[10.5px] font-semibold text-text-muted">
              <ArrowUp size={10} aria-hidden />
              reajuste · era {formatCurrency(previousAmount)}
            </span>
          )}
        </span>
        {subtitle.length > 0 && (
          <span className="text-xs text-text-subtle">{subtitle.join(" · ")}</span>
        )}
      </span>
      {progress && (
        <ProgressBar
          value={progress.current / progress.total}
          label={`Parcela ${progress.current} de ${progress.total}`}
          className="w-[90px] shrink-0 max-md:hidden"
        />
      )}
      <span className="flex min-w-[110px] flex-col text-right">
        <span className={cn("text-[13.5px] font-bold tabular-nums", TONE_TEXT[tone])}>
          {formatCurrency(amount)}
        </span>
        {amountCaption && <span className="text-[11px] text-text-subtle">{amountCaption}</span>}
      </span>
      <ChevronRight
        size={16}
        className="shrink-0 text-text-subtle group-hover:text-text"
        aria-hidden
      />
    </button>
  );
}
