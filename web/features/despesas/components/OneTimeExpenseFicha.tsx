"use client";

import { useExpenseMutations } from "../hooks/useExpenseMutations";
import { OneTimeFicha } from "@/shared/components/lancamentos/OneTimeFicha";
import { formatCompetenceLong } from "@/shared/lib/competence";
import type { OneTimeExpenseMonthItem } from "../types";

interface OneTimeExpenseFichaProps {
  item: OneTimeExpenseMonthItem;
  /** Situação da competência, da consulta mensal de onde a Ficha foi aberta. */
  isPast: boolean;
  onClose: () => void;
  onEdit: (item: OneTimeExpenseMonthItem) => void;
}

export function OneTimeExpenseFicha({ item, isPast, onClose, onEdit }: OneTimeExpenseFichaProps) {
  const mutations = useExpenseMutations({ onSuccess: onClose });
  const competence = { year: item.competenceYear, month: item.competenceMonth };

  return (
    <OneTimeFicha
      tone="expense"
      title={item.description}
      subtitle={[item.category.name]}
      competence={competence}
      amount={item.amount}
      facts={[
        { label: "Competência", value: formatCompetenceLong(competence) },
        { label: "Categoria", value: item.category.name },
        { label: "Situação", value: isPast ? "Realizada" : "Prevista" },
      ]}
      isPast={isPast}
      confirm={{ title: "Remover despesa?", message: `Excluir a despesa "${item.description}"?` }}
      isPending={mutations.remove.isPending}
      onClose={onClose}
      onEdit={() => onEdit(item)}
      onRemove={() => mutations.remove.mutate({ kind: "avulsa", id: item.id })}
    />
  );
}
