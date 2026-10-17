"use client";

import { useRecurringExpense } from "../hooks/useRecurringExpense";
import { useExpenseMutations } from "../hooks/useExpenseMutations";
import { recurringVersionSchema, terminateSchema } from "../types/schemas";
import { useSeriesActions, type SeriesModel } from "@/shared/hooks/useSeriesActions";
import { SeriesFicha } from "@/shared/components/lancamentos/SeriesFicha";
import { FichaPlaceholder } from "@/shared/components/lancamentos/FichaPlaceholder";
import { MoneyField } from "@/shared/components/lancamentos/MoneyField";
import { CompetenceSelect } from "@/shared/components/lancamentos/CompetenceSelect";
import { Input } from "@/shared/components/Input";
import { Select } from "@/shared/components/Select";
import { formatCompetenceShort } from "@/shared/lib/competence";
import { seriesRange } from "@/shared/lib/ledger";
import { parseMoneyInput } from "@/shared/lib/money";
import type { Category } from "@/features/categorias/types";
import type { RecurringExpenseMonthItem } from "../types";

interface RecurringExpenseFichaProps {
  item: RecurringExpenseMonthItem;
  categories: Category[];
  onClose: () => void;
}

export function RecurringExpenseFicha({ item, categories, onClose }: RecurringExpenseFichaProps) {
  const detail = useRecurringExpense(item.recurringExpenseId);

  if (!detail.series) {
    return (
      <FichaPlaceholder
        title={item.description}
        errorMessage={detail.errorMessage}
        onRetry={() => detail.refetch()}
        onClose={onClose}
      />
    );
  }
  return (
    <RecurringExpenseFichaBody
      id={item.recurringExpenseId}
      series={detail.series}
      categories={categories}
      onClose={onClose}
    />
  );
}

interface BodyProps {
  id: string;
  series: SeriesModel;
  categories: Category[];
  onClose: () => void;
}

/** Separado da carga: `useSeriesActions` inicializa os formulários com a série já disponível. */
function RecurringExpenseFichaBody({ id, series, categories, onClose }: BodyProps) {
  const actions = useSeriesActions({
    series,
    kind: "recorrente",
    versionSchema: recurringVersionSchema(series.reference),
    endSchema: terminateSchema(series.start),
  });
  const mutations = useExpenseMutations({
    onSuccess: (action) => (action === "remove" ? onClose() : actions.back()),
  });
  const { current } = actions;
  const sortedCategories = [...categories].sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
  const notes =
    series.isExpired && series.end
      ? [`Encerrada em ${formatCompetenceShort(series.end)} — apenas consulta do histórico.`]
      : [];

  return (
    <SeriesFicha
      kind="recorrente"
      tone="expense"
      title={current.description}
      subtitle={[current.categoryName ?? "", seriesRange(series.start, series.end)].filter(Boolean)}
      actions={actions}
      notes={notes}
      hints={{
        version:
          "A alteração valerá a partir do mês selecionado. O histórico anterior é preservado.",
        end: "A despesa recorrente será encerrada ao final do mês selecionado.",
      }}
      versionFields={
        <>
          <Input
            label="Nova descrição"
            value={actions.version.values.description}
            onChange={(e) => actions.version.set("description", e.target.value)}
            error={actions.errors.description}
          />
          <MoneyField
            label="Novo valor mensal"
            tone="expense"
            value={actions.version.values.amount}
            onChange={(e) => actions.version.set("amount", e.target.value)}
            error={actions.errors.amount}
          />
          <Select
            label="Categoria"
            options={sortedCategories.map((c) => ({ value: c.id, label: c.name }))}
            value={actions.version.values.categoryId}
            onChange={(e) => actions.version.set("categoryId", e.target.value)}
            error={actions.errors.categoryId}
          />
          <CompetenceSelect
            label="Vigência a partir de"
            value={actions.version.values.from}
            from={actions.minCompetence}
            onChange={(c) => actions.version.set("from", c)}
            error={actions.errors.from}
          />
        </>
      }
      endLabel="Encerrar despesa"
      confirm={{
        title: "Remover despesa?",
        message: `Excluir a despesa recorrente "${current.description}"?`,
      }}
      isPending={
        mutations.addVersion.isPending ||
        mutations.terminate.isPending ||
        mutations.remove.isPending
      }
      onClose={onClose}
      onCreateVersion={() =>
        actions.submitVersion((v) =>
          mutations.addVersion.mutate({
            id,
            description: v.description,
            amount: parseMoneyInput(v.amount),
            categoryId: v.categoryId,
            effectiveYear: v.from.year,
            effectiveMonth: v.from.month,
          }),
        )
      }
      onEnd={() =>
        actions.submitEnd((v) =>
          mutations.terminate.mutate({ id, endYear: v.last.year, endMonth: v.last.month }),
        )
      }
      onRemove={() => mutations.remove.mutate({ kind: "recorrente", id })}
    />
  );
}
