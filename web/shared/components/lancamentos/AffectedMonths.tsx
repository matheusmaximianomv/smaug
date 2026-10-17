import { formatCompetenceShort } from "../../lib/competence";
import { formatCurrency } from "../../lib/formatCurrency";
import { ENTRY_KIND, type EntryKind } from "../../lib/entry-types";
import type { AffectedMonth } from "../../lib/preview";

interface AffectedMonthsProps {
  kind: EntryKind;
  months: AffectedMonth[];
  /** Série sem término: depois das barras vem "continua…". */
  open: boolean;
}

const VISIBLE = 12;

/** "Meses afetados" da Revisão: até 12 barras, depois "+N meses" ou "continua…". */
export function AffectedMonths({ kind, months, open }: AffectedMonthsProps) {
  const hidden = months.length - VISIBLE;
  return (
    <ul aria-label="Meses afetados" className="flex flex-wrap items-end gap-1">
      {months.slice(0, VISIBLE).map(({ competence, amount }) => (
        <li
          key={`${competence.year}-${competence.month}`}
          className="flex w-[50px] flex-col items-center gap-[3px]"
        >
          <span className="text-[10.5px] font-semibold text-text-muted">
            {formatCompetenceShort(competence)}
          </span>
          <span
            className="h-[18px] w-full rounded-[3px]"
            style={{ backgroundColor: ENTRY_KIND[kind].color }}
          />
          <span className="text-[10px] tabular-nums text-text-subtle">
            {formatCurrency(amount).replace("R$", "").trim()}
          </span>
        </li>
      ))}
      {hidden > 0 && (
        <li className="self-center px-1.5 pb-3.5 text-[11.5px] text-text-subtle">
          +{hidden} meses
        </li>
      )}
      {open && (
        <li className="self-center px-1.5 pb-3.5 text-[11.5px] text-text-subtle">continua…</li>
      )}
    </ul>
  );
}
