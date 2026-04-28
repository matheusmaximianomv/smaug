"use client";

import { useDashboard } from "@/features/dashboard/hooks/useDashboard";
import { useMonthNavigation } from "@/features/dashboard/hooks/useMonthNavigation";
import { MonthNavigator } from "@/shared/components/MonthNavigator";
import { KpiCard } from "@/features/dashboard/components/KpiCard";
import { SemesterChart } from "@/features/dashboard/components/SemesterChart";
import { ExpenseBreakdown } from "@/features/dashboard/components/ExpenseBreakdown";
import { Skeleton } from "@/shared/components/Skeleton";
import { formatCurrency } from "@/shared/lib/formatCurrency";

const MONTH_NAMES_SHORT = [
  "Jan",
  "Fev",
  "Mar",
  "Abr",
  "Mai",
  "Jun",
  "Jul",
  "Ago",
  "Set",
  "Out",
  "Nov",
  "Dez",
];

function addMonths(year: number, month: number, n: number) {
  const d = new Date(year, month - 1 + n, 1);
  return { year: d.getFullYear(), month: d.getMonth() + 1 };
}

export default function DashboardPage() {
  const { selected, status, current, navigate, goToCurrent } = useMonthNavigation();
  const { data, isLoading } = useDashboard(selected);

  const isFuture = status === "future";

  // Build semester chart: 3 before current + current + 2 future
  const chartMonths = Array.from({ length: 6 }, (_, i) => {
    const m = addMonths(current.year, current.month, i - 3);
    return {
      year: m.year,
      month: m.month,
      label: `${MONTH_NAMES_SHORT[m.month - 1]}/${String(m.year).slice(-2)}`,
      revenues: 0,
      expenses: 0,
      isFuture: m.year > current.year || (m.year === current.year && m.month > current.month),
    };
  });

  if (isLoading) {
    return (
      <div className="p-4 sm:p-7 max-w-[1100px] space-y-6">
        <Skeleton className="h-16 w-80" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  const kpis = data?.kpis ?? { totalRevenues: 0, totalExpenses: 0, balance: 0 };
  const breakdown = data?.breakdown ?? { categories: [], total: 0 };
  const recentRevenues = data?.recentRevenues ?? [];
  const recentExpenses = data?.recentExpenses ?? [];

  const mergedChart = chartMonths.map((cm) => {
    const found = data?.chart?.months?.find((m) => m.year === cm.year && m.month === cm.month);
    return found ? { ...cm, revenues: found.revenues, expenses: found.expenses } : cm;
  });

  return (
    <div className="p-4 sm:p-7 max-w-[1100px]">
      {/* Month Navigator */}
      <MonthNavigator
        year={selected.year}
        month={selected.month}
        status={status}
        onChange={(y, m) => navigate(m - selected.month + (y - selected.year) * 12)}
        onGoToCurrent={goToCurrent}
        className="mb-6"
      />

      {/* KPI Cards */}
      <div className="mb-6 grid grid-cols-1 gap-3.5 sm:grid-cols-3">
        <KpiCard
          label={isFuture ? "Receitas projetadas" : "Total de receitas"}
          value={kpis.totalRevenues}
          sublabel={`${recentRevenues.length} lançamento${recentRevenues.length !== 1 ? "s" : ""}`}
          colorScheme="green"
        />
        <KpiCard
          label={isFuture ? "Despesas projetadas" : "Total de despesas"}
          value={kpis.totalExpenses}
          sublabel={`${recentExpenses.length} lançamento${recentExpenses.length !== 1 ? "s" : ""}`}
          colorScheme="red"
        />
        <KpiCard
          label="Saldo do mês"
          value={kpis.balance}
          sublabel={kpis.balance >= 0 ? "Superávit" : "Déficit"}
          colorScheme={kpis.balance >= 0 ? "positive" : "negative"}
        />
      </div>

      {/* Chart + Breakdown */}
      <div className="mb-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-lg border border-border bg-surface p-5">
          <h3 className="mb-4 text-[13px] font-bold uppercase tracking-wide text-text-muted">
            Visão semestral
          </h3>
          <SemesterChart
            months={mergedChart}
            selectedYear={selected.year}
            selectedMonth={selected.month}
            onSelectMonth={(y, m) => navigate(m - selected.month + (y - selected.year) * 12)}
          />
        </div>
        <div className="rounded-lg border border-border bg-surface p-5">
          <h3 className="mb-4 text-[13px] font-bold uppercase tracking-wide text-text-muted">
            Despesas por categoria
          </h3>
          <ExpenseBreakdown categories={breakdown.categories} />
        </div>
      </div>

      {/* Detail Tables */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-lg border border-border bg-surface p-5">
          <h3 className="mb-4 text-[13px] font-bold uppercase tracking-wide text-text-muted">
            Receitas do período
          </h3>
          {recentRevenues.length === 0 ? (
            <p className="py-2 text-sm text-text-subtle">Nenhuma receita neste mês.</p>
          ) : (
            <table className="w-full border-collapse">
              <tbody>
                {recentRevenues.map((r) => (
                  <tr key={r.id} className="border-b border-border last:border-0 hover:bg-bg">
                    <td className="py-2 text-[13px]">{r.description}</td>
                    <td className="py-2 text-right text-[13px] font-semibold text-green">
                      {formatCurrency(r.amount)}
                    </td>
                  </tr>
                ))}
                <tr className="border-t-2 border-border font-bold">
                  <td className="pt-2 text-[13.5px]">Total</td>
                  <td className="pt-2 text-right text-[13.5px] font-bold text-green">
                    {formatCurrency(kpis.totalRevenues)}
                  </td>
                </tr>
              </tbody>
            </table>
          )}
        </div>

        <div className="rounded-lg border border-border bg-surface p-5">
          <h3 className="mb-4 text-[13px] font-bold uppercase tracking-wide text-text-muted">
            Despesas do período
          </h3>
          {recentExpenses.length === 0 ? (
            <p className="py-2 text-sm text-text-subtle">Nenhuma despesa neste mês.</p>
          ) : (
            <table className="w-full border-collapse">
              <tbody>
                {recentExpenses.map((e) => (
                  <tr key={e.id} className="border-b border-border last:border-0 hover:bg-bg">
                    <td className="py-2">
                      <div className="text-[13px]">{e.description}</div>
                      {e.categoryName && (
                        <div className="text-[11px] text-text-subtle mt-0.5">{e.categoryName}</div>
                      )}
                    </td>
                    <td className="py-2 text-right text-[13px] font-semibold text-red">
                      {formatCurrency(e.amount)}
                    </td>
                  </tr>
                ))}
                <tr className="border-t-2 border-border font-bold">
                  <td className="pt-2 text-[13.5px]">Total</td>
                  <td className="pt-2 text-right text-[13.5px] font-bold text-red">
                    {formatCurrency(kpis.totalExpenses)}
                  </td>
                </tr>
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
