import { z } from "zod";

export const oneTimeRevenueSchema = z.object({
  description: z.string().min(1, "Descrição obrigatória").max(255, "Máximo 255 caracteres"),
  amount: z.string().refine((v) => {
    const n = parseFloat(v.replace(",", "."));
    return !isNaN(n) && n > 0;
  }, "Valor inválido"),
  competenceMonth: z.number().int().min(1).max(12),
  competenceYear: z.number().int().min(2000),
});

export type OneTimeRevenueFormData = z.infer<typeof oneTimeRevenueSchema>;

export const fixedRevenueSchema = z.object({
  description: z.string().min(1, "Descrição obrigatória").max(255),
  amount: z.string().refine((v) => {
    const n = parseFloat(v.replace(",", "."));
    return !isNaN(n) && n > 0;
  }, "Valor inválido"),
  modality: z.enum(["ALTERABLE", "UNALTERABLE"]),
  startMonth: z.number().int().min(1).max(12),
  startYear: z.number().int().min(2000),
  hasEnd: z.boolean(),
  endMonth: z.number().int().min(1).max(12).optional(),
  endYear: z.number().int().min(2000).optional(),
});

export type FixedRevenueFormData = z.infer<typeof fixedRevenueSchema>;

export const versionSchema = z.object({
  description: z.string().min(1, "Descrição obrigatória").max(255),
  amount: z.string().refine((v) => {
    const n = parseFloat(v.replace(",", "."));
    return !isNaN(n) && n > 0;
  }, "Valor inválido"),
  effectiveMonth: z.number().int().min(1).max(12),
  effectiveYear: z.number().int().min(2000),
});

export type VersionFormData = z.infer<typeof versionSchema>;

export const endFixedSchema = z.object({
  endMonth: z.number().int().min(1).max(12),
  endYear: z.number().int().min(2000),
});

export type EndFixedFormData = z.infer<typeof endFixedSchema>;
