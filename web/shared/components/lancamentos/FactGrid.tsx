import { cn } from "../../lib/utils";

export interface Fact {
  label: string;
  value: string;
  caption?: string;
}

interface FactGridProps {
  facts: Fact[];
  columns: 3 | 4;
}

const COLUMNS = { 3: "grid-cols-3", 4: "grid-cols-4" };

/** Cartões de fatos da Ficha; 2 colunas até 768 px. */
export function FactGrid({ facts, columns }: FactGridProps) {
  return (
    <dl className={cn("mb-4 grid gap-2.5 max-md:grid-cols-2", COLUMNS[columns])}>
      {facts.map((fact) => (
        <div key={fact.label} className="flex flex-col gap-0.5 rounded-lg bg-bg px-3 py-2.5">
          <dt className="text-[11px] font-bold uppercase tracking-[0.06em] text-text-subtle">
            {fact.label}
          </dt>
          <dd className="text-[15px] font-bold tabular-nums">{fact.value}</dd>
          {fact.caption && <dd className="text-[11.5px] text-text-subtle">{fact.caption}</dd>}
        </div>
      ))}
    </dl>
  );
}
