"use client";

import { useFixedRevenue } from "../hooks/useFixedRevenue";
import { useRevenueMutations } from "../hooks/useRevenueMutations";
import { MODALITY_LABEL } from "../hooks/useRevenueMonth";
import { fixedVersionSchema, terminateSchema } from "../types/schemas";
import { useSeriesActions, type SeriesModel } from "@/shared/hooks/useSeriesActions";
import { SeriesFicha } from "@/shared/components/lancamentos/SeriesFicha";
import { FichaPlaceholder } from "@/shared/components/lancamentos/FichaPlaceholder";
import { MoneyField } from "@/shared/components/lancamentos/MoneyField";
import { CompetenceSelect } from "@/shared/components/lancamentos/CompetenceSelect";
import { Input } from "@/shared/components/Input";
import { formatCompetenceShort } from "@/shared/lib/competence";
import { seriesRange } from "@/shared/lib/ledger";
import { parseMoneyInput } from "@/shared/lib/money";
import type { FixedRevenueMonthItem, RevenueModality } from "../types";

interface FixedRevenueFichaProps {
  item: FixedRevenueMonthItem;
  onClose: () => void;
}

export function FixedRevenueFicha({ item, onClose }: FixedRevenueFichaProps) {
  const detail = useFixedRevenue(item.id);

  if (!detail.series) {
    return (
      <FichaPlaceholder
        title={item.currentVersion.description}
        errorMessage={detail.errorMessage}
        onRetry={() => detail.refetch()}
        onClose={onClose}
      />
    );
  }
  return (
    <FixedRevenueFichaBody
      id={item.id}
      modality={item.modality}
      series={detail.series}
      onClose={onClose}
    />
  );
}

interface BodyProps {
  id: string;
  modality: RevenueModality;
  series: SeriesModel;
  onClose: () => void;
}

/** Separado da carga: `useSeriesActions` inicializa os formulários com a série já disponível. */
function FixedRevenueFichaBody({ id, modality, series, onClose }: BodyProps) {
  const actions = useSeriesActions({
    series,
    kind: "fixa",
    versionSchema: fixedVersionSchema(series.reference),
    endSchema: terminateSchema(series.start),
  });
  const mutations = useRevenueMutations({
    onSuccess: (action) => (action === "remove" ? onClose() : actions.back()),
  });
  const { current } = actions;
  const notes = [
    ...(modality === "UNALTERABLE"
      ? ["Receita inalterável: o valor fica igual até o encerramento. Por isso não há Nova versão."]
      : []),
    ...(series.isExpired && series.end
      ? [`Encerrada em ${formatCompetenceShort(series.end)} — apenas consulta do histórico.`]
      : []),
  ];

  return (
    <SeriesFicha
      kind="fixa"
      tone="revenue"
      title={current.description}
      subtitle={[MODALITY_LABEL[modality], seriesRange(series.start, series.end)]}
      actions={actions}
      notes={notes}
      hints={{
        version:
          "A nova versão será aplicada a partir do mês selecionado. Meses anteriores preservam o valor antigo.",
        end: "A receita fixa será encerrada ao final do mês selecionado. Meses anteriores permanecem intactos.",
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
            tone="revenue"
            value={actions.version.values.amount}
            onChange={(e) => actions.version.set("amount", e.target.value)}
            error={actions.errors.amount}
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
      endLabel="Encerrar receita"
      confirm={{
        title: "Remover receita?",
        message: `Tem certeza que deseja excluir permanentemente a receita fixa "${current.description}"?`,
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
      onRemove={() => mutations.remove.mutate({ kind: "fixa", id })}
    />
  );
}
