import { formatCurrency } from "../../lib/formatCurrency";

interface EntryGroupProps {
  title: string;
  count: number;
  subtotal: number;
  children: React.ReactNode;
}

export function EntryGroup({ title, count, subtotal, children }: EntryGroupProps) {
  return (
    <section aria-label={title} className="mb-3">
      <div className="flex items-center gap-2 px-0.5 py-1 text-[11.5px] font-bold uppercase tracking-[0.06em] text-text-muted">
        <h3>{title}</h3>
        <span className="rounded-[10px] bg-border px-1.5 text-[10.5px]">{count}</span>
        <span className="h-px flex-1 bg-border" />
        <span className="text-[12.5px] normal-case tracking-normal text-text">
          {formatCurrency(subtotal)}
        </span>
      </div>
      {children}
    </section>
  );
}
