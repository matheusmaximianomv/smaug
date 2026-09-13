"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ReceitasService } from "../services/ReceitasService";
import { toast } from "@/shared/hooks/useToast";
import { getApiErrorMessage } from "@/infra/api-error";

const QUERY_KEY = ["revenues", "one-time"];

export function useOneTimeRevenues() {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: QUERY_KEY,
    queryFn: ReceitasService.getOneTime,
    staleTime: 30_000,
  });

  const create = useMutation({
    mutationFn: ReceitasService.createOneTime,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEY });
      toast.success("Receita avulsa criada!");
    },
    onError: (error, variables) =>
      toast.error(getApiErrorMessage(error, "Erro ao criar receita avulsa."), {
        action: { label: "Tentar novamente", onClick: () => create.mutate(variables) },
      }),
  });

  const update = useMutation({
    mutationFn: ({
      id,
      ...payload
    }: {
      id: string;
      description: string;
      amount: number;
      competenceYear: number;
      competenceMonth: number;
    }) => ReceitasService.updateOneTime(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEY });
      toast.success("Receita avulsa atualizada!");
    },
    onError: (error, variables) =>
      toast.error(getApiErrorMessage(error, "Erro ao atualizar receita avulsa."), {
        action: { label: "Tentar novamente", onClick: () => update.mutate(variables) },
      }),
  });

  const remove = useMutation({
    mutationFn: (id: string) => ReceitasService.deleteOneTime(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEY });
      toast.success("Receita avulsa excluída!");
    },
    onError: (error, variables) =>
      toast.error(getApiErrorMessage(error, "Erro ao excluir receita avulsa."), {
        action: { label: "Tentar novamente", onClick: () => remove.mutate(variables) },
      }),
  });

  return { ...query, create, update, remove };
}
