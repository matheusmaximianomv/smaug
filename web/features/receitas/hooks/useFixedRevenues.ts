"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ReceitasService } from "../services/ReceitasService";
import { toast } from "@/shared/hooks/useToast";
import { getApiErrorMessage } from "@/infra/api-error";

const QUERY_KEY = ["revenues", "fixed"];

export function useFixedRevenues() {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: QUERY_KEY,
    queryFn: ReceitasService.getFixed,
    staleTime: 30_000,
  });

  const create = useMutation({
    mutationFn: ReceitasService.createFixed,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEY });
      toast.success("Receita fixa criada!");
    },
    onError: (error, variables) =>
      toast.error(getApiErrorMessage(error, "Erro ao criar receita fixa."), {
        action: { label: "Tentar novamente", onClick: () => create.mutate(variables) },
      }),
  });

  const addVersion = useMutation({
    mutationFn: ({
      id,
      ...payload
    }: {
      id: string;
      description: string;
      amount: number;
      effectiveYear: number;
      effectiveMonth: number;
    }) => ReceitasService.addVersion(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEY });
      toast.success("Nova versão criada!");
    },
    onError: (error, variables) =>
      toast.error(getApiErrorMessage(error, "Erro ao criar versão."), {
        action: { label: "Tentar novamente", onClick: () => addVersion.mutate(variables) },
      }),
  });

  const terminate = useMutation({
    mutationFn: ({ id, ...payload }: { id: string; endYear: number; endMonth: number }) =>
      ReceitasService.terminate(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEY });
      toast.success("Receita fixa encerrada!");
    },
    onError: (error, variables) =>
      toast.error(getApiErrorMessage(error, "Erro ao encerrar receita."), {
        action: { label: "Tentar novamente", onClick: () => terminate.mutate(variables) },
      }),
  });

  const remove = useMutation({
    mutationFn: (id: string) => ReceitasService.deleteFixed(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEY });
      toast.success("Receita fixa excluída!");
    },
    onError: (error, variables) =>
      toast.error(getApiErrorMessage(error, "Erro ao excluir receita fixa."), {
        action: { label: "Tentar novamente", onClick: () => remove.mutate(variables) },
      }),
  });

  return { ...query, create, addVersion, terminate, remove };
}
