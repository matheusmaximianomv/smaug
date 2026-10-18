"use client";

import { useState } from "react";
import { useRevenueMonth } from "../hooks/useRevenueMonth";
import { useRevenueYearSummary } from "../hooks/useRevenueYearSummary";
import { RevenueWizard } from "./RevenueWizard";
import { RevenueFicha } from "./RevenueFicha";
import { useLedgerNavigation } from "@/shared/hooks/useCompetenceNavigation";
import { LedgerLayout } from "@/shared/components/lancamentos/LedgerLayout";
import { ModalGate } from "@/shared/components/Modal";
import type { CompetenceStatus } from "@/shared/lib/competence";
import type { OneTimeRevenue, RevenueMonthItem } from "../types";

type ModalState =
  | null
  | { t: "new" }
  | { t: "edit"; item: OneTimeRevenue }
  | { t: "item"; item: RevenueMonthItem; status: CompetenceStatus };

interface Layer {
  modal: ModalState;
  isOpen: boolean;
  key: number;
  origin: HTMLElement | null;
}

export function ReceitasScreen() {
  // A camada fica montada depois de fechada para animar a saída (ver `ModalGate`);
  // `key` nova a cada abertura descarta o estado da Ficha/assistente anterior.
  const [layer, setLayer] = useState<Layer>({ modal: null, isOpen: false, key: 0, origin: null });
  const show = (modal: ModalState) => {
    const origin = document.activeElement as HTMLElement | null;
    setLayer((l) => ({ modal, isOpen: true, key: l.key + 1, origin }));
  };
  const close = () => setLayer((l) => ({ ...l, isOpen: false }));
  const { modal } = layer;
  const nav = useLedgerNavigation();
  const month = useRevenueMonth(nav.selected);
  const summary = useRevenueYearSummary(nav.selected.year);
  nav.adoptReference(month.data?.reference ?? summary.data?.reference);

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
      onNew={() => show({ t: "new" })}
      onOpen={(item, status) => show({ t: "item", item, status })}
    >
      <ModalGate key={layer.key} isOpen={layer.isOpen} origin={layer.origin}>
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
            onEdit={(item) => show({ t: "edit", item })}
          />
        )}
      </ModalGate>
    </LedgerLayout>
  );
}
