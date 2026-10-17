"use client";

import { useState } from "react";
import { useRevenueMonth } from "../hooks/useRevenueMonth";
import { useRevenueYearSummary } from "../hooks/useRevenueYearSummary";
import { RevenueWizard } from "./RevenueWizard";
import { RevenueFicha } from "./RevenueFicha";
import { useLedgerNavigation } from "@/shared/hooks/useCompetenceNavigation";
import { LedgerLayout } from "@/shared/components/lancamentos/LedgerLayout";
import type { CompetenceStatus } from "@/shared/lib/competence";
import type { OneTimeRevenue, RevenueMonthItem } from "../types";

type ModalState =
  | null
  | { t: "new" }
  | { t: "edit"; item: OneTimeRevenue }
  | { t: "item"; item: RevenueMonthItem; status: CompetenceStatus };

export function ReceitasScreen() {
  const [modal, setModal] = useState<ModalState>(null);
  const nav = useLedgerNavigation();
  const month = useRevenueMonth(nav.selected);
  const summary = useRevenueYearSummary(nav.selected.year);
  nav.adoptReference(month.data?.reference ?? summary.data?.reference);

  const close = () => setModal(null);

  return (
    <LedgerLayout
      title="Receitas"
      subtitle="Avulsas e fixas de cada mês"
      noun="receita"
      emptyHint="Receitas fixas aparecem aqui automaticamente."
      tone="revenue"
      navigation={nav}
      stripTotals={summary.totals}
      ledger={month.ledger}
      errorMessage={month.errorMessage}
      onRetry={() => month.refetch()}
      onNew={() => setModal({ t: "new" })}
      onOpen={(item, status) => setModal({ t: "item", item, status })}
    >
      {(modal?.t === "new" || modal?.t === "edit") && (
        <RevenueWizard
          initialCompetence={nav.selected}
          reference={nav.current}
          edit={modal.t === "edit" ? modal.item : undefined}
          onClose={close}
        />
      )}
      {modal?.t === "item" && (
        <RevenueFicha
          item={modal.item}
          status={modal.status}
          onClose={close}
          onEdit={(item) => setModal({ t: "edit", item })}
        />
      )}
    </LedgerLayout>
  );
}
