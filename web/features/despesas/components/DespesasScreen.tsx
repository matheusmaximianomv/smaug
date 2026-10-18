"use client";

import { useState } from "react";
import { useExpenseMonth } from "../hooks/useExpenseMonth";
import { useExpenseYearSummary } from "../hooks/useExpenseYearSummary";
import { ExpenseWizard } from "./ExpenseWizard";
import { ExpenseFicha } from "./ExpenseFicha";
import { useLedgerNavigation } from "@/shared/hooks/useCompetenceNavigation";
import { LedgerLayout } from "@/shared/components/lancamentos/LedgerLayout";
import { ModalGate } from "@/shared/components/Modal";
import type { CompetenceStatus } from "@/shared/lib/competence";
import type { Category } from "@/features/categorias/types";
import type { ExpenseMonthItem, OneTimeExpenseMonthItem } from "../types";

type ModalState =
  | null
  | { t: "new" }
  | { t: "edit"; item: OneTimeExpenseMonthItem }
  | { t: "item"; item: ExpenseMonthItem; status: CompetenceStatus };

interface Layer {
  modal: ModalState;
  isOpen: boolean;
  key: number;
  origin: HTMLElement | null;
}

interface DespesasScreenProps {
  /** Vêm da página: hook de outra feature não é importado aqui. */
  categories: Category[];
}

export function DespesasScreen({ categories }: DespesasScreenProps) {
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
  const month = useExpenseMonth(nav.selected);
  const summary = useExpenseYearSummary(nav.selected.year);
  nav.adoptReference(month.data?.reference ?? summary.data?.reference);

  return (
    <LedgerLayout
      title="Despesas"
      subtitle="Avulsas, parceladas e recorrentes de cada mês"
      noun="despesa"
      emptyHint="Recorrentes e parcelas futuras aparecem aqui automaticamente."
      tone="expense"
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
          <ExpenseWizard
            categories={categories}
            initialCompetence={nav.selected}
            reference={nav.current}
            edit={modal.t === "edit" ? modal.item : undefined}
            onClose={close}
          />
        )}
        {modal?.t === "item" && (
          <ExpenseFicha
            item={modal.item}
            status={modal.status}
            reference={nav.current}
            categories={categories}
            onClose={close}
            onEdit={(item) => show({ t: "edit", item })}
          />
        )}
      </ModalGate>
    </LedgerLayout>
  );
}
