"use client";

import { useState } from "react";
import { Trash2, CircleStop } from "lucide-react";
import { useInstallmentExpense } from "../hooks/useInstallmentExpense";
import { useExpenseMutations } from "../hooks/useExpenseMutations";
import { Modal } from "@/shared/components/Modal";
import { Button } from "@/shared/components/Button";
import { ConfirmDialog } from "@/shared/components/ConfirmDialog";
import { EntryDetailHeader } from "@/shared/components/lancamentos/EntryDetailHeader";
import { FactGrid } from "@/shared/components/lancamentos/FactGrid";
import { ProgressBar } from "@/shared/components/lancamentos/ProgressBar";
import { Legend } from "@/shared/components/lancamentos/Legend";
import { MonthCells, type MonthCellState } from "@/shared/components/lancamentos/MonthCells";
import { FichaPlaceholder } from "@/shared/components/lancamentos/FichaPlaceholder";
import { formatCurrency } from "@/shared/lib/formatCurrency";
import { formatCompetenceShort, type Competence } from "@/shared/lib/competence";
import type { InstallmentExpenseMonthItem, InstallmentStatus } from "../types";

interface InstallmentExpenseFichaProps {
  item: InstallmentExpenseMonthItem;
  reference: Competence;
  onClose: () => void;
}

const CELL_STATE: Record<InstallmentStatus, MonthCellState> = {
  PAID: "paid",
  CURRENT: "current",
  PENDING: "pending",
};

type Confirming = null | "remove" | "terminate";

export function InstallmentExpenseFicha({
  item,
  reference,
  onClose,
}: InstallmentExpenseFichaProps) {
  const detail = useInstallmentExpense(item.installmentExpenseId);
  const [confirming, setConfirming] = useState<Confirming>(null);
  const mutations = useExpenseMutations({
    // Encerrar mantém a Ficha aberta, já atualizada pela invalidação; remover a fecha.
    onSuccess: (action) => (action === "remove" ? onClose() : setConfirming(null)),
  });

  if (!detail.data || !detail.summary) {
    return (
      <FichaPlaceholder
        title={item.description}
        errorMessage={detail.errorMessage}
        onRetry={() => detail.refetch()}
        onClose={onClose}
      />
    );
  }

  const expense = detail.data;
  const summary = detail.summary;
  const remove = () => mutations.remove.mutate({ kind: "parcelada", id: expense.id });
  const terminate = () => mutations.terminateInstallment.mutate(expense.id);

  return (
    <>
      <Modal
        isOpen
        onClose={onClose}
        title={expense.description}
        width="2xl"
        header={
          <EntryDetailHeader
            kind="parcelada"
            title={expense.description}
            subtitle={[expense.category.name]}
            value={formatCurrency(expense.totalAmount)}
            valueCaption={`${expense.installmentCount}× de ${formatCurrency(summary.lastAmount)}`}
            tone="expense"
          />
        }
        footer={
          <>
            {expense.canDelete && (
              <Button
                variant="ghost"
                className="text-red hover:bg-red-light"
                onClick={() => setConfirming("remove")}
              >
                <Trash2 size={14} className="mr-1.5" aria-hidden />
                Remover parcelamento
              </Button>
            )}
            {!expense.canDelete && expense.canTerminate && (
              <span className="text-[12.5px] text-text-subtle">
                Parcelamentos com parcelas já pagas não podem ser removidos; encerre para cancelar
                as parcelas futuras.
              </span>
            )}
            <span className="flex-1" />
            {!expense.canDelete && expense.canTerminate && (
              <Button variant="outline" onClick={() => setConfirming("terminate")}>
                <CircleStop size={14} className="mr-1.5" aria-hidden />
                Encerrar parcelamento
              </Button>
            )}
            <Button variant="ghost" onClick={onClose}>
              Fechar
            </Button>
          </>
        }
      >
        <FactGrid
          columns={4}
          facts={[
            {
              label: "Pago",
              value: formatCurrency(summary.paid.amount),
              caption: summary.paid.label,
            },
            {
              label: "Restante",
              value: formatCurrency(summary.remaining.amount),
              caption: summary.remaining.label,
            },
            {
              label: "Parcela atual",
              value: summary.current,
              caption: formatCompetenceShort(reference),
            },
            { label: "Termina em", value: summary.end, caption: summary.range },
          ]}
        />
        <ProgressBar value={summary.progress} label="Parcelas pagas" className="mb-[18px] h-1.5" />
        <div className="mb-2.5 mt-1 flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-[0.06em] text-text-subtle">
            Parcelas
          </span>
          <Legend
            items={[
              { label: "Paga", swatch: "paid" },
              { label: "Atual", swatch: "current" },
              { label: "Pendente", swatch: "pending" },
            ]}
          />
        </div>
        <MonthCells
          label="Parcelas"
          cells={expense.installments.map((installment) => ({
            key: installment.id,
            top: `${installment.installmentNumber}/${expense.installmentCount}`,
            month: formatCompetenceShort({
              year: installment.competenceYear,
              month: installment.competenceMonth,
            }),
            state: CELL_STATE[installment.status],
            value: formatCurrency(installment.amount).replace("R$", "").trim(),
          }))}
        />
      </Modal>
      <ConfirmDialog
        isOpen={confirming === "remove"}
        onClose={() => setConfirming(null)}
        onConfirm={remove}
        title="Remover parcelamento?"
        message={`Excluir todo o parcelamento "${expense.description}"? Todas as parcelas serão removidas.`}
        confirmLabel="Remover"
        isDanger
        isLoading={mutations.remove.isPending}
      />
      <ConfirmDialog
        isOpen={confirming === "terminate"}
        onClose={() => setConfirming(null)}
        onConfirm={terminate}
        title="Encerrar parcelamento?"
        message={`As parcelas futuras de "${expense.description}" serão removidas. As parcelas já pagas continuam no histórico.`}
        confirmLabel="Encerrar"
        isDanger
        isLoading={mutations.terminateInstallment.isPending}
      />
    </>
  );
}
