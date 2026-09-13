import { formatCurrency } from "@/shared/lib/formatCurrency";
import type { CategoryBreakdown } from "../types";

interface ExpenseBreakdownProps {
  categories: CategoryBreakdown[];
}

export function ExpenseBreakdown({ categories }: ExpenseBreakdownProps) {
  if (categories.length === 0) {
    return <p className="text-sm text-text-subtle py-2">Nenhuma despesa registrada neste mês.</p>;
  }

  return (
    <div className="flex flex-col gap-3.5">
      {categories.map((cat) => (
        <div key={cat.categoryId}>
          <div className="flex justify-between mb-1.5 text-sm">
            <span>{cat.categoryName}</span>
            <span className="font-semibold">{formatCurrency(cat.amount)}</span>
          </div>
          <div className="h-1 rounded-sm bg-bg overflow-hidden">
            <div
              className="h-full rounded-sm bg-red transition-all duration-300"
              style={{ width: `${cat.percentage}%` }}
            />
          </div>
          <div className="mt-0.5 text-[11px] text-text-subtle">
            {cat.percentage.toFixed(0)}% das despesas
          </div>
        </div>
      ))}
    </div>
  );
}
