"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ReceitasService } from "../services/ReceitasService";
import { QK } from "./useRevenueMonth";
import { toast } from "@/shared/hooks/useToast";
import { getApiErrorMessage } from "@/infra/api-error";
import type { RevenueKind } from "../types/schemas";

/** Invalidação por chave: o Dashboard soma as mesmas receitas e não pode ficar defasado. */
const DASHBOARD_QK = ["dashboard"];

export type CreateRevenueInput =
  | { kind: "avulsa"; payload: Parameters<typeof ReceitasService.createOneTime>[0] }
  | { kind: "fixa"; payload: Parameters<typeof ReceitasService.createFixed>[0] };

export type RevenueAction = "create" | "updateOneTime" | "remove" | "addVersion" | "terminate";

const CREATED: Record<RevenueKind, string> = {
  avulsa: "Receita adicionada",
  fixa: "Receita fixa criada",
};

function create({ kind, payload }: CreateRevenueInput): Promise<unknown> {
  return kind === "avulsa"
    ? ReceitasService.createOneTime(payload)
    : ReceitasService.createFixed(payload);
}

function removeByKind({ kind, id }: { kind: RevenueKind; id: string }): Promise<void> {
  return kind === "avulsa" ? ReceitasService.deleteOneTime(id) : ReceitasService.deleteFixed(id);
}

/**
 * Todas as escritas de receitas. `addVersion` responde com a versão criada, não
 * com a receita — por isso a Ficha é atualizada pela invalidação do prefixo
 * (que inclui `["revenues", "fixed", id]`), nunca pela resposta.
 */
export function useRevenueMutations({
  onSuccess,
}: { onSuccess?: (action: RevenueAction) => void } = {}) {
  const qc = useQueryClient();

  const succeed = (action: RevenueAction, message: string) => {
    qc.invalidateQueries({ queryKey: QK });
    qc.invalidateQueries({ queryKey: DASHBOARD_QK });
    toast.success(message);
    onSuccess?.(action);
  };

  const createMutation = useMutation({
    mutationFn: create,
    onSuccess: (_, variables) => succeed("create", CREATED[variables.kind]),
    onError: (error, variables) =>
      toast.error(getApiErrorMessage(error, "Erro ao salvar receita."), {
        action: { label: "Tentar novamente", onClick: () => createMutation.mutate(variables) },
      }),
  });

  const updateOneTime = useMutation({
    mutationFn: ({
      id,
      ...p
    }: { id: string } & Parameters<typeof ReceitasService.updateOneTime>[1]) =>
      ReceitasService.updateOneTime(id, p),
    onSuccess: () => succeed("updateOneTime", "Receita atualizada"),
    onError: (error, variables) =>
      toast.error(getApiErrorMessage(error, "Erro ao atualizar receita."), {
        action: { label: "Tentar novamente", onClick: () => updateOneTime.mutate(variables) },
      }),
  });

  const remove = useMutation({
    mutationFn: removeByKind,
    onSuccess: () => succeed("remove", "Receita removida"),
    onError: (error, variables) =>
      toast.error(getApiErrorMessage(error, "Erro ao remover receita."), {
        action: { label: "Tentar novamente", onClick: () => remove.mutate(variables) },
      }),
  });

  const addVersion = useMutation({
    mutationFn: ({ id, ...p }: { id: string } & Parameters<typeof ReceitasService.addVersion>[1]) =>
      ReceitasService.addVersion(id, p),
    onSuccess: () => succeed("addVersion", "Nova versão criada"),
    onError: (error, variables) =>
      toast.error(getApiErrorMessage(error, "Erro ao criar nova versão."), {
        action: { label: "Tentar novamente", onClick: () => addVersion.mutate(variables) },
      }),
  });

  const terminate = useMutation({
    mutationFn: ({ id, ...p }: { id: string; endYear: number; endMonth: number }) =>
      ReceitasService.terminate(id, p),
    onSuccess: () => succeed("terminate", "Receita encerrada"),
    onError: (error, variables) =>
      toast.error(getApiErrorMessage(error, "Erro ao encerrar receita."), {
        action: { label: "Tentar novamente", onClick: () => terminate.mutate(variables) },
      }),
  });

  return { create: createMutation, updateOneTime, remove, addVersion, terminate };
}
