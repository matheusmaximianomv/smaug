"use client";

import { useState } from "react";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRevenueMutations } from "./useRevenueMutations";
import { revenueDetailsSchema, type RevenueKind } from "../types/schemas";
import { addMonths, compareCompetences, type Competence } from "@/shared/lib/competence";
import { parseMoneyInput, toMoneyInput } from "@/shared/lib/money";
import { affectedMonths } from "@/shared/lib/preview";
import type { OneTimeRevenue, RevenueModality } from "../types";

export interface RevenueWizardValues {
  kind: RevenueKind;
  description: string;
  amount: string;
  start: Competence;
  /** Marcado por padrão na fixa: vigência com fim em início + 11. */
  hasEnd: boolean;
  end: Competence;
  modality: RevenueModality;
}

interface RevenueWizardOptions {
  initialCompetence: Competence;
  reference: Competence;
  edit?: OneTimeRevenue;
  onDone: () => void;
}

export const TYPE_STEP = 0;
export const DETAILS_STEP = 1;
export const REVIEW_STEP = 2;

const DEFAULT_SPAN = 11;

function initialValues({
  initialCompetence,
  reference,
  edit,
}: RevenueWizardOptions): RevenueWizardValues {
  const start = edit
    ? { year: edit.competenceYear, month: edit.competenceMonth }
    : compareCompetences(initialCompetence, reference) < 0
      ? reference
      : initialCompetence;
  return {
    kind: "avulsa",
    description: edit?.description ?? "",
    amount: edit ? toMoneyInput(edit.amount) : "",
    start,
    hasEnd: true,
    end: addMonths(start, DEFAULT_SPAN),
    modality: "ALTERABLE",
  };
}

/** Assistente de receitas: espelha o de despesas, com os tipos Avulsa e Fixa (com vigência). */
export function useRevenueWizard(options: RevenueWizardOptions) {
  const { reference, edit, onDone } = options;
  const firstStep = edit ? DETAILS_STEP : TYPE_STEP;
  const [step, setStep] = useState(firstStep);
  const form = useForm<RevenueWizardValues>({
    defaultValues: initialValues(options),
    // União discriminada por `kind`; o formulário guarda todos os campos para que
    // trocar de tipo não perca o que já foi digitado.
    resolver: zodResolver(
      revenueDetailsSchema(reference),
    ) as unknown as Resolver<RevenueWizardValues>,
  });
  const mutations = useRevenueMutations({ onSuccess: onDone });

  const values = form.watch();
  const amount = parseMoneyInput(values.amount);
  const safeAmount = Number.isFinite(amount) ? amount : 0;
  const affected = affectedMonths({
    kind: values.kind,
    start: values.start,
    amount: safeAmount,
    end: values.hasEnd ? values.end : null,
  });

  const next = async () => {
    if (step === DETAILS_STEP && !(await form.trigger())) return;
    setStep((s) => Math.min(s + 1, REVIEW_STEP));
  };
  const back = () => setStep((s) => Math.max(s - 1, firstStep));

  const submit = () => {
    const v = form.getValues();
    const base = { description: v.description.trim(), amount: parseMoneyInput(v.amount) };
    if (edit) {
      return mutations.updateOneTime.mutate({
        id: edit.id,
        ...base,
        competenceYear: v.start.year,
        competenceMonth: v.start.month,
      });
    }
    if (v.kind === "avulsa") {
      return mutations.create.mutate({
        kind: "avulsa",
        payload: { ...base, competenceYear: v.start.year, competenceMonth: v.start.month },
      });
    }
    mutations.create.mutate({
      kind: "fixa",
      payload: {
        ...base,
        modality: v.modality,
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
    amount: safeAmount,
    affected,
    minCompetence: reference,
    setKind: (kind: RevenueKind) => form.setValue("kind", kind),
    next,
    back,
    goToType: () => setStep(TYPE_STEP),
    submit,
    isPending: mutations.create.isPending || mutations.updateOneTime.isPending,
  };
}
