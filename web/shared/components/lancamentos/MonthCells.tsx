import { Check } from "lucide-react";
import { cn } from "../../lib/utils";

/** `paid/current/pending`: grade de parcelas. `normal/new/cut`: linha do tempo de série. */
export type MonthCellState = "paid" | "current" | "pending" | "normal" | "new" | "cut";

export interface MonthCell {
  key: string;
  /** Mês curto ("Abr/26"). */
  month: string;
  state: MonthCellState;
  /** "1/3" na grade de parcelas. */
  top?: string;
  /** Valor compacto; vazio quando não muda (linha do tempo). */
  value?: string;
  /** Cor de fundo do bloco (tom da versão ou cor do tipo). */
  color?: string;
  /** Mês corrente contornado. */
  isReference?: boolean;
}

interface MonthCellsProps {
  label: string;
  cells: MonthCell[];
  /** Texto final, como "continua…". */
  trailing?: string;
}

const BLOCK: Record<MonthCellState, string> = {
  paid: "bg-tipo-parcelada text-white",
  current: "border-2 border-red bg-white text-red",
  pending: "border border-dashed border-[#d8c3ad] bg-white",
  normal: "",
  new: "bg-stripes",
  cut: "bg-hatch border border-dashed border-[#d0c9c2]",
};

const STATE_LABEL: Partial<Record<MonthCellState, string>> = {
  paid: "paga",
  current: "atual",
  pending: "pendente",
  new: "nova versão",
  cut: "deixa de existir",
};

/** Grade de 12 colunas (6 até 768 px) usada nas parcelas e na linha do tempo. */
export function MonthCells({ label, cells, trailing }: MonthCellsProps) {
  return (
    <div>
      <ul aria-label={label} className="grid grid-cols-12 gap-1 gap-y-3 max-md:grid-cols-6">
        {cells.map((cell) => (
          <li
            key={cell.key}
            aria-current={cell.isReference ? "date" : undefined}
            className="flex flex-col items-center gap-[3px]"
          >
            {cell.top && (
              <span
                className={cn(
                  "text-[10.5px] font-bold text-text-muted",
                  cell.state === "current" && "text-red",
                )}
              >
                {cell.top}
              </span>
            )}
            <span
              className={cn(
                "flex h-[30px] w-full items-center justify-center rounded-[5px]",
                BLOCK[cell.state],
                cell.state === "normal" && !cell.color && "border border-border bg-bg",
                // `[outline-style:solid]`, não `outline`: o tailwind-merge do `cn()` põe
                // `outline` e `outline-2` no mesmo grupo e descartaria o estilo.
                cell.isReference && "[outline-style:solid] outline-2 outline-offset-2 outline-text",
              )}
              style={
                cell.color && cell.state !== "cut" ? { backgroundColor: cell.color } : undefined
              }
            >
              {cell.state === "paid" && <Check size={12} aria-hidden />}
              {cell.state === "current" && (
                <em className="text-[9px] font-extrabold not-italic tracking-[0.04em]">ATUAL</em>
              )}
              {STATE_LABEL[cell.state] && (
                <span className="sr-only">{STATE_LABEL[cell.state]}</span>
              )}
            </span>
            <span
              className={cn(
                "text-[10.5px] font-semibold text-text-muted",
                cell.isReference && "font-extrabold text-text",
                cell.state === "current" && "text-red",
                cell.state === "cut" && "text-text-subtle line-through",
              )}
            >
              {cell.month}
            </span>
            <span
              className={cn(
                "h-[13px] text-[10px] font-bold tabular-nums text-text-muted",
                cell.state === "paid" && "font-normal text-text-subtle",
                cell.state === "new" && "text-text",
              )}
            >
              {cell.value}
            </span>
          </li>
        ))}
      </ul>
      {trailing && <p className="mt-2 text-[11.5px] text-text-subtle">{trailing}</p>}
    </div>
  );
}
