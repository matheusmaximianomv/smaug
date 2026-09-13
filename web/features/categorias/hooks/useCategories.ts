"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { CategoriasService } from "../services/CategoriasService";
import { toast } from "@/shared/hooks/useToast";
import { getApiErrorMessage } from "@/infra/api-error";

const QUERY_KEY = ["categories"];

export function useCategories() {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: QUERY_KEY,
    queryFn: CategoriasService.getAll,
    staleTime: 30_000,
  });

  const create = useMutation({
    mutationFn: (name: string) => CategoriasService.create(name),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEY });
      toast.success("Categoria criada com sucesso!");
    },
    onError: (error, variables) =>
      toast.error(getApiErrorMessage(error, "Erro ao criar categoria."), {
        action: { label: "Tentar novamente", onClick: () => create.mutate(variables) },
      }),
  });

  const update = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) => CategoriasService.update(id, name),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEY });
      toast.success("Categoria atualizada!");
    },
    onError: (error, variables) =>
      toast.error(getApiErrorMessage(error, "Erro ao atualizar categoria."), {
        action: { label: "Tentar novamente", onClick: () => update.mutate(variables) },
      }),
  });

  const remove = useMutation({
    mutationFn: (id: string) => CategoriasService.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEY });
      toast.success("Categoria excluída!");
    },
    onError: (error, variables) =>
      toast.error(getApiErrorMessage(error, "Erro ao excluir categoria."), {
        action: { label: "Tentar novamente", onClick: () => remove.mutate(variables) },
      }),
  });

  return { ...query, create, update, remove };
}
