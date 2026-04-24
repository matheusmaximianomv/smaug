import { z } from "zod";

export const createFixedRevenueSchema = z.object({
  description: z
    .string({ error: "Description is required" })
    .min(1, "Description must be between 1 and 255 characters")
    .max(255, "Description must be between 1 and 255 characters"),
  amount: z
    .number({ error: "Amount must be a number" })
    .positive("Amount must be greater than 0"),
  modality: z.enum(["ALTERABLE", "UNALTERABLE"], {
    error: 'Modality must be "ALTERABLE" or "UNALTERABLE"',
  }),
  startMonth: z
    .number({ error: "Start month is required" })
    .int()
    .min(1, "Start month must be between 1 and 12")
    .max(12, "Start month must be between 1 and 12"),
  startYear: z
    .number({ error: "Start year is required" })
    .int()
    .min(2000, "Start year must be >= 2000"),
  endMonth: z
    .number()
    .int()
    .min(1, "End month must be between 1 and 12")
    .max(12, "End month must be between 1 and 12")
    .nullable()
    .optional(),
  endYear: z
    .number()
    .int()
    .min(2000, "End year must be >= 2000")
    .nullable()
    .optional(),
});

export type CreateFixedRevenueDto = z.infer<typeof createFixedRevenueSchema>;

export const updateFixedRevenueSchema = z.object({
  description: z
    .string({ error: "Description is required" })
    .min(1, "Description must be between 1 and 255 characters")
    .max(255, "Description must be between 1 and 255 characters"),
  amount: z
    .number({ error: "Amount must be a number" })
    .positive("Amount must be greater than 0"),
  effectiveMonth: z
    .number({ error: "Effective month is required" })
    .int()
    .min(1, "Effective month must be between 1 and 12")
    .max(12, "Effective month must be between 1 and 12"),
  effectiveYear: z
    .number({ error: "Effective year is required" })
    .int()
    .min(2000, "Effective year must be >= 2000"),
});

export type UpdateFixedRevenueDto = z.infer<typeof updateFixedRevenueSchema>;

export const terminateFixedRevenueSchema = z.object({
  endMonth: z
    .number({ error: "End month is required" })
    .int()
    .min(1, "End month must be between 1 and 12")
    .max(12, "End month must be between 1 and 12"),
  endYear: z
    .number({ error: "End year is required" })
    .int()
    .min(2000, "End year must be >= 2000"),
});

export type TerminateFixedRevenueDto = z.infer<typeof terminateFixedRevenueSchema>;

export interface FixedRevenueVersionResponseDto {
  id: string;
  fixedRevenueId: string;
  description: string;
  amount: number;
  effectiveMonth: number;
  effectiveYear: number;
  createdAt: string;
}

export interface FixedRevenueResponseDto {
  id: string;
  userId: string;
  modality: string;
  startMonth: number;
  startYear: number;
  endMonth: number | null;
  endYear: number | null;
  createdAt: string;
  updatedAt: string;
  versions?: FixedRevenueVersionResponseDto[];
}
