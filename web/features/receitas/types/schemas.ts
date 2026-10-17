import { z } from "zod";
import { isValidMoneyInput } from "@/shared/lib/money";
import { compareCompetences, type Competence } from "@/shared/lib/competence";

export type RevenueKind = "avulsa" | "fixa";

const competence = z.object({ year: z.number().int(), month: z.number().int() });

const description = z.string().trim().min(1, "Obrigatório");
const amount = z.string().refine(isValidMoneyInput, "Valor inválido");

const END_BEFORE_START = "Deve ser igual ou posterior ao início";

const notPast = (reference: Competence) => (c: Competence) => compareCompetences(c, reference) >= 0;

/**
 * Etapa Detalhes do assistente de receitas, discriminada pelo tipo. Fábrica
 * porque "competência passada" depende do mês corrente informado pelo servidor.
 */
export function revenueDetailsSchema(reference: Competence) {
  const start = competence.refine(notPast(reference), "Competência passada não permitida");
  return z.discriminatedUnion("kind", [
    z.object({ kind: z.literal("avulsa"), description, amount, start }),
    z
      .object({
        kind: z.literal("fixa"),
        description,
        amount,
        start,
        hasEnd: z.boolean(),
        end: competence,
        modality: z.enum(["ALTERABLE", "UNALTERABLE"]),
      })
      .refine((v) => !v.hasEnd || compareCompetences(v.end, v.start) >= 0, {
        message: END_BEFORE_START,
        path: ["end"],
      }),
  ]);
}

/** Nova versão de receita fixa (RF-24): sem categoria. */
export function fixedVersionSchema(reference: Competence) {
  return z.object({
    description,
    amount,
    from: competence.refine(
      notPast(reference),
      "Não é possível criar versão em competência passada",
    ),
  });
}

/** Encerramento (RF-25): o último mês não pode vir antes do início. */
export function terminateSchema(start: Competence) {
  return z.object({
    last: competence.refine((c) => compareCompetences(c, start) >= 0, END_BEFORE_START),
  });
}
