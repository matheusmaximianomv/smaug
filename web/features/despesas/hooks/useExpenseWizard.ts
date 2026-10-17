"use client";

import { useState } from "react";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useExpenseMutations } from "./useExpenseMutations";
import { expenseDetailsSchema, type ExpenseKind } from "../types/schemas";
import { addMonths, compareCompetences, type Competence } from "@/shared/lib/competence";
import { parseMoneyInput, toMoneyInput } from "@/shared/lib/money";
import { affectedMonths } from "@/shared/lib/preview";
import type { OneTimeExpenseMonthItem } from "../types";

export interface ExpenseWizardValues {
  kind: ExpenseKind;
  description: string;
  amount: string;
  categoryId: string;
  count: number;
  start: Competence;
  /** Desmarcado = "Sem data de término", o padrão da recorrente. */
  hasEnd: boolean;
  end: Competence;
}

interface ExpenseWizardOptions {
  /** Mês selecionado na tela. */
  initialCompetence: Competence;
  /** Mês corrente do servidor. */
  reference: Competence;
  /** Avulsa em edição: o assistente abre direto em Detalhes. */
  edit?: OneTimeExpenseMonthItem;
  onDone: () => void;
}

export const TYPE_STEP = 0;
export const DETAILS_STEP = 1;
export const REVIEW_STEP = 2;

/** Meses do término padrão depois do início (início + 11 = um ano de vigência). */
const DEFAULT_SPAN = 11;

function initialValues({
  initialCompetence,
  reference,
  edit,
}: ExpenseWizardOptions): ExpenseWizardValues {
  if (edit) {
    const start = { year: edit.competenceYear, month: edit.competenceMonth };
    return {
      kind: "avulsa",
      description: edit.description,
      amount: toMoneyInput(edit.amount),
      categoryId: edit.categoryId,
      count: 2,
      start,
      hasEnd: false,
      end: addMonths(start, DEFAULT_SPAN),
    };
  }
  const start =
    compareCompetences(initialCompetence, reference) < 0 ? reference : initialCompetence;
  return {
    kind: "avulsa",
    description: "",
    amount: "",
    categoryId: "",
    count: 2,
    start,
    hasEnd: false,
    end: addMonths(start, DEFAULT_SPAN),
  };
}

/**
 * Estado do assistente Tipo → Detalhes → Revisão. A validação roda só ao sair
 * de Detalhes, com o schema da feature amarrado ao "agora" do servidor; a
 * Revisão usa `affectedMonths`, espelho da divisão que o servidor grava.
 */
export function useExpenseWizard(options: ExpenseWizardOptions) {
  const { reference, edit, onDone } = options;
  const firstStep = edit ? DETAILS_STEP : TYPE_STEP;
  const [step, setStep] = useState(firstStep);
  const form = useForm<ExpenseWizardValues>({
    defaultValues: initialValues(options),
    // O schema é uma união discriminada por `kind`; o formulário guarda todos os
    // campos de uma vez para que trocar de tipo não perca o que já foi digitado.
    resolver: zodResolver(
      expenseDetailsSchema(reference),
    ) as unknown as Resolver<ExpenseWizardValues>,
  });
  const mutations = useExpenseMutations({ onSuccess: onDone });

  const values = form.watch();
  const amount = parseMoneyInput(values.amount);
  const affected = affectedMonths({
    kind: values.kind,
    start: values.start,
    amount: Number.isFinite(amount) ? amount : 0,
    count: values.count,
    end: values.hasEnd ? values.end : null,
  });

  const setKind = (kind: ExpenseKind) => form.setValue("kind", kind);

  const next = async () => {
    if (step === DETAILS_STEP && !(await form.trigger())) return;
    setStep((s) => Math.min(s + 1, REVIEW_STEP));
  };
  const back = () => setStep((s) => Math.max(s - 1, firstStep));
  const goToType = () => setStep(TYPE_STEP);

  const submit = () => {
    const v = form.getValues();
    const base = { description: v.description.trim(), categoryId: v.categoryId };
    const value = parseMoneyInput(v.amount);
    if (edit) {
      return mutations.updateOneTime.mutate({
        id: edit.id,
        ...base,
        amount: value,
        competenceYear: v.start.year,
        competenceMonth: v.start.month,
      });
    }
    if (v.kind === "avulsa") {
      return mutations.create.mutate({
        kind: "avulsa",
        payload: {
          ...base,
          amount: value,
          competenceYear: v.start.year,
          competenceMonth: v.start.month,
        },
      });
    }
    if (v.kind === "parcelada") {
      return mutations.create.mutate({
        kind: "parcelada",
        payload: {
          ...base,
          totalAmount: value,
          installmentCount: v.count,
          startYear: v.start.year,
          startMonth: v.start.month,
        },
      });
    }
    mutations.create.mutate({
      kind: "recorrente",
      payload: {
        ...base,
        amount: value,
        startYear: v.start.year,
        startMonth: v.start.month,
        endYear: v.hasEnd ? v.end.year : null,
        endMonth: v.hasEnd ? v.end.month : null,
      },
    });
  };

  return {
    step,
    firstStep,
    isEdit: !!edit,
    form,
    values,
    // Ler `formState.errors` durante o render é o que assina o proxy do RHF.
    errors: form.formState.errors,
    amount: Number.isFinite(amount) ? amount : 0,
    affected,
    /** Primeira opção dos seletores de mês: nada antes do mês corrente. */
    minCompetence: reference,
    setKind,
    next,
    back,
    goToType,
    submit,
    isPending: mutations.create.isPending || mutations.updateOneTime.isPending,
  };
}
