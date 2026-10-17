import { z } from "zod";
import { isValidMoneyInput } from "@/shared/lib/money";
import { compareCompetences, type Competence } from "@/shared/lib/competence";

export type ExpenseKind = "avulsa" | "parcelada" | "recorrente";

const competence = z.object({ year: z.number().int(), month: z.number().int() });

const description = z.string().trim().min(1, "Obrigatório");
const amount = z.string().refine(isValidMoneyInput, "Valor inválido");
const categoryId = z.string().min(1, "Selecione uma categoria");

const PAST_COMPETENCE = "Competência passada não permitida";
const END_BEFORE_START = "Deve ser igual ou posterior ao início";

const notPast = (reference: Competence) => (c: Competence) => compareCompetences(c, reference) >= 0;

/**
 * Etapa Detalhes do assistente, discriminada pelo tipo. É uma fábrica porque
 * "competência passada" depende do mês corrente informado pelo servidor
 * (`reference`), não do relógio do navegador.
 */
export function expenseDetailsSchema(reference: Competence) {
  const start = competence.refine(notPast(reference), PAST_COMPETENCE);
  return z.discriminatedUnion("kind", [
    z.object({ kind: z.literal("avulsa"), description, amount, categoryId, start }),
    z.object({
      kind: z.literal("parcelada"),
      description,
      amount,
      categoryId,
      count: z.number().int().min(1, "Entre 1 e 72").max(72, "Entre 1 e 72"),
      start,
    }),
    z
      .object({
        kind: z.literal("recorrente"),
        description,
        amount,
        categoryId,
        start,
        hasEnd: z.boolean(),
        end: competence,
      })
      .refine((v) => !v.hasEnd || compareCompetences(v.end, v.start) >= 0, {
        message: END_BEFORE_START,
        path: ["end"],
      }),
  ]);
}

export type ExpenseDetailsValues = z.input<ReturnType<typeof expenseDetailsSchema>>;

/** Nova versão de recorrente (RF-24). */
export function recurringVersionSchema(reference: Competence) {
  return z.object({
    description,
    amount,
    categoryId,
    from: competence.refine(
      notPast(reference),
      "Não é possível criar versão em competência passada",
    ),
  });
}

/** Encerramento de série (RF-25): o último mês não pode vir antes do início. */
export function terminateSchema(start: Competence) {
  return z.object({
    last: competence.refine((c) => compareCompetences(c, start) >= 0, END_BEFORE_START),
  });
}
