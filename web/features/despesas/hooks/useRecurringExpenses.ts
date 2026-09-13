"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DespesasService } from "../services/DespesasService";
import { toast } from "@/shared/hooks/useToast";
import { getApiErrorMessage } from "@/infra/api-error";

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
    onError: (error, variables) =>
      toast.error(getApiErrorMessage(error, "Erro ao criar despesa recorrente."), {
        action: { label: "Tentar novamente", onClick: () => create.mutate(variables) },
      }),
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
    onError: (error, variables) =>
      toast.error(getApiErrorMessage(error, "Erro ao criar versão."), {
        action: { label: "Tentar novamente", onClick: () => addVersion.mutate(variables) },
      }),
  });

  const terminate = useMutation({
    mutationFn: ({ id, ...p }: { id: string; endYear: number; endMonth: number }) =>
      DespesasService.terminateRecurring(id, p),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK });
      toast.success("Despesa recorrente encerrada!");
    },
    onError: (error, variables) =>
      toast.error(getApiErrorMessage(error, "Erro ao encerrar despesa recorrente."), {
        action: { label: "Tentar novamente", onClick: () => terminate.mutate(variables) },
      }),
  });

  const remove = useMutation({
    mutationFn: (id: string) => DespesasService.deleteRecurring(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK });
      toast.success("Despesa recorrente excluída!");
    },
    onError: (error, variables) =>
      toast.error(getApiErrorMessage(error, "Erro ao excluir despesa recorrente."), {
        action: { label: "Tentar novamente", onClick: () => remove.mutate(variables) },
      }),
  });

  return { ...query, create, addVersion, terminate, remove };
}
