"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ReceitasService } from "../services/ReceitasService";
import { toast } from "@/shared/hooks/useToast";

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
    onError: () => toast.error("Erro ao criar receita fixa."),
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
    onError: () => toast.error("Erro ao criar versão."),
  });

  const terminate = useMutation({
    mutationFn: ({ id, ...payload }: { id: string; endYear: number; endMonth: number }) =>
      ReceitasService.terminate(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEY });
      toast.success("Receita fixa encerrada!");
    },
    onError: () => toast.error("Erro ao encerrar receita."),
  });

  const remove = useMutation({
    mutationFn: (id: string) => ReceitasService.deleteFixed(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEY });
      toast.success("Receita fixa excluída!");
    },
    onError: () => toast.error("Erro ao excluir receita fixa."),
  });

  return { ...query, create, addVersion, terminate, remove };
}
