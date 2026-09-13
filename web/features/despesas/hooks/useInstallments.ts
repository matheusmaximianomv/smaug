"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DespesasService } from "../services/DespesasService";
import { toast } from "@/shared/hooks/useToast";
import { getApiErrorMessage } from "@/infra/api-error";

const QK = ["expenses", "installment"];

export function useInstallments() {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: QK,
    queryFn: DespesasService.getInstallments,
    staleTime: 30_000,
  });

  const create = useMutation({
    mutationFn: DespesasService.createInstallment,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK });
      toast.success("Parcelamento criado!");
    },
    onError: (error, variables) =>
      toast.error(getApiErrorMessage(error, "Erro ao criar parcelamento."), {
        action: { label: "Tentar novamente", onClick: () => create.mutate(variables) },
      }),
  });

  const remove = useMutation({
    mutationFn: (id: string) => DespesasService.deleteInstallment(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK });
      toast.success("Parcelamento excluído!");
    },
    onError: (error, variables) =>
      toast.error(getApiErrorMessage(error, "Erro ao excluir parcelamento."), {
        action: { label: "Tentar novamente", onClick: () => remove.mutate(variables) },
      }),
  });

  return { ...query, create, remove };
}
