"use client";

import { useRevenueMutations } from "../hooks/useRevenueMutations";
import { OneTimeFicha } from "@/shared/components/lancamentos/OneTimeFicha";
import { formatCompetenceLong } from "@/shared/lib/competence";
import type { OneTimeRevenue } from "../types";

interface OneTimeRevenueFichaProps {
  item: OneTimeRevenue;
  /** Situação da competência, da consulta mensal de onde a Ficha foi aberta. */
  isPast: boolean;
  onClose: () => void;
  onEdit: (item: OneTimeRevenue) => void;
}

export function OneTimeRevenueFicha({ item, isPast, onClose, onEdit }: OneTimeRevenueFichaProps) {
  const mutations = useRevenueMutations({ onSuccess: onClose });
  const competence = { year: item.competenceYear, month: item.competenceMonth };

  return (
    <OneTimeFicha
      tone="revenue"
      title={item.description}
      subtitle={[]}
      competence={competence}
      amount={item.amount}
      facts={[
        { label: "Competência", value: formatCompetenceLong(competence) },
        { label: "Situação", value: isPast ? "Recebida" : "Prevista" },
      ]}
      isPast={isPast}
      confirm={{
        title: "Remover receita?",
        message: `Tem certeza que deseja excluir a receita "${item.description}"? Esta ação não pode ser desfeita.`,
      }}
      isPending={mutations.remove.isPending}
      onClose={onClose}
      onEdit={() => onEdit(item)}
      onRemove={() => mutations.remove.mutate({ kind: "avulsa", id: item.id })}
    />
  );
}
