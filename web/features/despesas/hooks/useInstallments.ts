"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DespesasService } from "../services/DespesasService";
import { toast } from "@/shared/hooks/useToast";

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
    onError: () => toast.error("Erro ao criar parcelamento."),
  });

  const remove = useMutation({
    mutationFn: (id: string) => DespesasService.deleteInstallment(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK });
      toast.success("Parcelamento excluído!");
    },
    onError: () => toast.error("Erro ao excluir parcelamento."),
  });

  return { ...query, create, remove };
}
