"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { DespesasService } from "../services/DespesasService";
import { QK } from "./useExpenseMonth";
import { toast } from "@/shared/hooks/useToast";
import { getApiErrorMessage } from "@/infra/api-error";
import type { ExpenseKind } from "../types/schemas";

/** Invalidação por chave: o Dashboard soma as mesmas despesas e não pode ficar defasado. */
const DASHBOARD_QK = ["dashboard"];

export type CreateExpenseInput =
  | { kind: "avulsa"; payload: Parameters<typeof DespesasService.createOneTime>[0] }
  | { kind: "parcelada"; payload: Parameters<typeof DespesasService.createInstallment>[0] }
  | { kind: "recorrente"; payload: Parameters<typeof DespesasService.createRecurring>[0] };

export type ExpenseAction =
  | "create"
  | "updateOneTime"
  | "remove"
  | "addVersion"
  | "terminate"
  | "terminateInstallment";

const CREATED: Record<ExpenseKind, string> = {
  avulsa: "Despesa adicionada",
  parcelada: "Parcelamento criado",
  recorrente: "Despesa recorrente criada",
};

function create({ kind, payload }: CreateExpenseInput): Promise<unknown> {
  if (kind === "avulsa") return DespesasService.createOneTime(payload);
  if (kind === "parcelada") return DespesasService.createInstallment(payload);
  return DespesasService.createRecurring(payload);
}

function removeByKind({ kind, id }: { kind: ExpenseKind; id: string }): Promise<void> {
  if (kind === "avulsa") return DespesasService.deleteOneTime(id);
  if (kind === "parcelada") return DespesasService.deleteInstallment(id);
  return DespesasService.deleteRecurring(id);
}

/**
 * Todas as escritas de despesas. O `onSuccess` do chamador fica no nível do
 * hook, e não no `mutate`, para valer também quando o usuário repete a ação pelo
 * "Tentar novamente" do toast — senão o modal ficaria aberto depois do acerto.
 */
export function useExpenseMutations({
  onSuccess,
}: { onSuccess?: (action: ExpenseAction) => void } = {}) {
  const qc = useQueryClient();

  const succeed = (action: ExpenseAction, message: string) => {
    qc.invalidateQueries({ queryKey: QK });
    qc.invalidateQueries({ queryKey: DASHBOARD_QK });
    toast.success(message);
    onSuccess?.(action);
  };

  const createMutation = useMutation({
    mutationFn: create,
    onSuccess: (_, variables) => succeed("create", CREATED[variables.kind]),
    onError: (error, variables) =>
      toast.error(getApiErrorMessage(error, "Erro ao salvar despesa."), {
        action: { label: "Tentar novamente", onClick: () => createMutation.mutate(variables) },
      }),
  });

  const updateOneTime = useMutation({
    mutationFn: ({
      id,
      ...p
    }: { id: string } & Parameters<typeof DespesasService.updateOneTime>[1]) =>
      DespesasService.updateOneTime(id, p),
    onSuccess: () => succeed("updateOneTime", "Despesa atualizada"),
    onError: (error, variables) =>
      toast.error(getApiErrorMessage(error, "Erro ao atualizar despesa."), {
        action: { label: "Tentar novamente", onClick: () => updateOneTime.mutate(variables) },
      }),
  });

  const remove = useMutation({
    mutationFn: removeByKind,
    onSuccess: (_, variables) =>
      succeed(
        "remove",
        variables.kind === "parcelada" ? "Parcelamento removido" : "Despesa removida",
      ),
    onError: (error, variables) =>
      toast.error(getApiErrorMessage(error, "Erro ao remover despesa."), {
        action: { label: "Tentar novamente", onClick: () => remove.mutate(variables) },
      }),
  });

  const addVersion = useMutation({
    mutationFn: ({
      id,
      ...p
    }: { id: string } & Parameters<typeof DespesasService.addRecurringVersion>[1]) =>
      DespesasService.addRecurringVersion(id, p),
    onSuccess: () => succeed("addVersion", "Nova versão criada"),
    onError: (error, variables) =>
      toast.error(getApiErrorMessage(error, "Erro ao criar nova versão."), {
        action: { label: "Tentar novamente", onClick: () => addVersion.mutate(variables) },
      }),
  });

  const terminate = useMutation({
    mutationFn: ({ id, ...p }: { id: string; endYear: number; endMonth: number }) =>
      DespesasService.terminateRecurring(id, p),
    onSuccess: () => succeed("terminate", "Despesa encerrada"),
    onError: (error, variables) =>
      toast.error(getApiErrorMessage(error, "Erro ao encerrar despesa."), {
        action: { label: "Tentar novamente", onClick: () => terminate.mutate(variables) },
      }),
  });

  const terminateInstallment = useMutation({
    mutationFn: (id: string) => DespesasService.terminateInstallment(id),
    onSuccess: () => succeed("terminateInstallment", "Parcelamento encerrado"),
    onError: (error, variables) =>
      toast.error(getApiErrorMessage(error, "Erro ao encerrar parcelamento."), {
        action: {
          label: "Tentar novamente",
          onClick: () => terminateInstallment.mutate(variables),
        },
      }),
  });

  return {
    create: createMutation,
    updateOneTime,
    remove,
    addVersion,
    terminate,
    terminateInstallment,
  };
}
