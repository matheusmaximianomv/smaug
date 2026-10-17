"use client";

import { useState } from "react";
import { useExpenseMonth } from "../hooks/useExpenseMonth";
import { useExpenseYearSummary } from "../hooks/useExpenseYearSummary";
import { ExpenseWizard } from "./ExpenseWizard";
import { ExpenseFicha } from "./ExpenseFicha";
import { useLedgerNavigation } from "@/shared/hooks/useCompetenceNavigation";
import { LedgerLayout } from "@/shared/components/lancamentos/LedgerLayout";
import type { CompetenceStatus } from "@/shared/lib/competence";
import type { Category } from "@/features/categorias/types";
import type { ExpenseMonthItem, OneTimeExpenseMonthItem } from "../types";

type ModalState =
  | null
  | { t: "new" }
  | { t: "edit"; item: OneTimeExpenseMonthItem }
  | { t: "item"; item: ExpenseMonthItem; status: CompetenceStatus };

interface DespesasScreenProps {
  /** Vêm da página: hook de outra feature não é importado aqui. */
  categories: Category[];
}

export function DespesasScreen({ categories }: DespesasScreenProps) {
  const [modal, setModal] = useState<ModalState>(null);
  const nav = useLedgerNavigation();
  const month = useExpenseMonth(nav.selected);
  const summary = useExpenseYearSummary(nav.selected.year);
  nav.adoptReference(month.data?.reference ?? summary.data?.reference);

  const close = () => setModal(null);

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
      onNew={() => setModal({ t: "new" })}
      onOpen={(item, status) => setModal({ t: "item", item, status })}
    >
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
          onEdit={(item) => setModal({ t: "edit", item })}
        />
      )}
    </LedgerLayout>
  );
}
