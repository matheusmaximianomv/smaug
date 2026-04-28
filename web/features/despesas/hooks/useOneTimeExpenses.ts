"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DespesasService } from "../services/DespesasService";
import { toast } from "@/shared/hooks/useToast";

const QK = ["expenses", "one-time"];

export function useOneTimeExpenses() {
  const qc = useQueryClient();
  const query = useQuery({ queryKey: QK, queryFn: DespesasService.getOneTime, staleTime: 30_000 });

  const create = useMutation({
    mutationFn: DespesasService.createOneTime,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK });
      toast.success("Despesa avulsa criada!");
    },
    onError: () => toast.error("Erro ao criar despesa avulsa."),
  });

  const update = useMutation({
    mutationFn: ({
      id,
      ...p
    }: {
      id: string;
      description: string;
      amount: number;
      categoryId: string;
      competenceYear: number;
      competenceMonth: number;
    }) => DespesasService.updateOneTime(id, p),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK });
      toast.success("Despesa avulsa atualizada!");
    },
    onError: () => toast.error("Erro ao atualizar despesa avulsa."),
  });

  const remove = useMutation({
    mutationFn: (id: string) => DespesasService.deleteOneTime(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK });
      toast.success("Despesa avulsa excluída!");
    },
    onError: () => toast.error("Erro ao excluir despesa avulsa."),
  });

  return { ...query, create, update, remove };
}
