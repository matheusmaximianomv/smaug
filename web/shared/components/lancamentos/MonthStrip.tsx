import { cn } from "../../lib/utils";
import { formatCompactCurrency } from "../../lib/money";

export interface MonthStripCell {
  month: number;
  /** "Jan", "Fev"… */
  label: string;
  /** Total do mês; zero ou nulo quando não há lançamentos. */
  total: number | null;
  selected: boolean;
  isCurrent: boolean;
}

interface MonthStripProps {
  cells: MonthStripCell[];
  onSelect: (month: number) => void;
}

/** Faixa de 12 meses do ano selecionado; vira rolagem horizontal até 768 px. */
export function MonthStrip({ cells, onSelect }: MonthStripProps) {
  return (
    <div
      role="group"
      aria-label="Meses do ano"
      className="grid grid-cols-12 gap-1 max-md:flex max-md:overflow-x-auto max-md:scrollbar-none"
    >
      {cells.map((cell) => (
        <button
          key={cell.month}
          type="button"
          aria-pressed={cell.selected}
          onClick={() => onSelect(cell.month)}
          className={cn(
            "relative flex flex-col items-center rounded-[7px] border border-transparent py-1.5 max-md:min-w-[56px]",
            "hover:border-border hover:bg-surface focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-red",
            cell.selected && "border-red bg-surface shadow-[0_0_0_2px] shadow-red-light",
          )}
        >
          <span className={cn("text-xs font-bold text-text-muted", cell.selected && "text-red")}>
            {cell.label}
          </span>
          <span className="text-[10.5px] tabular-nums text-text-subtle">
            {cell.total ? formatCompactCurrency(cell.total) : "—"}
          </span>
          {cell.isCurrent && (
            <span className="absolute right-[7px] top-[5px] h-[5px] w-[5px] rounded-full bg-[#2e7d32]">
              <span className="sr-only">(mês atual)</span>
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
