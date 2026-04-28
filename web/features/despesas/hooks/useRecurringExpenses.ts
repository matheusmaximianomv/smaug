"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DespesasService } from "../services/DespesasService";
import { toast } from "@/shared/hooks/useToast";

const QK = ["expenses", "recurring"];

export function useRecurringExpenses() {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: QK,
    queryFn: DespesasService.getRecurring,
    staleTime: 30_000,
  });

  const create = useMutation({
    mutationFn: DespesasService.createRecurring,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK });
      toast.success("Despesa recorrente criada!");
    },
    onError: () => toast.error("Erro ao criar despesa recorrente."),
  });

  const addVersion = useMutation({
    mutationFn: ({
      id,
      ...p
    }: {
      id: string;
      description: string;
      amount: number;
      categoryId: string;
      effectiveYear: number;
      effectiveMonth: number;
    }) => DespesasService.addRecurringVersion(id, p),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK });
      toast.success("Nova versão criada!");
    },
    onError: () => toast.error("Erro ao criar versão."),
  });

  const terminate = useMutation({
    mutationFn: ({ id, ...p }: { id: string; endYear: number; endMonth: number }) =>
      DespesasService.terminateRecurring(id, p),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK });
      toast.success("Despesa recorrente encerrada!");
    },
    onError: () => toast.error("Erro ao encerrar despesa recorrente."),
  });

  const remove = useMutation({
    mutationFn: (id: string) => DespesasService.deleteRecurring(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK });
      toast.success("Despesa recorrente excluída!");
    },
    onError: () => toast.error("Erro ao excluir despesa recorrente."),
  });

  return { ...query, create, addVersion, terminate, remove };
}
