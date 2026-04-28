export interface OneTimeRevenue {
  id: string;
  userId: string;
  description: string;
  amount: number;
  competenceYear: number;
  competenceMonth: number;
  createdAt: string;
  updatedAt: string;
}

export type RevenueModality = "ALTERABLE" | "UNALTERABLE";

export interface FixedRevenueVersion {
  id: string;
  description: string;
  amount: number;
  effectiveYear: number;
  effectiveMonth: number;
  createdAt: string;
}

export interface FixedRevenue {
  id: string;
  userId: string;
  modality: RevenueModality;
  startYear: number;
  startMonth: number;
  endYear: number | null;
  endMonth: number | null;
  currentVersion: FixedRevenueVersion;
  versions: FixedRevenueVersion[];
  createdAt: string;
  updatedAt: string;
}
