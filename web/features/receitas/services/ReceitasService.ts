import { apiClient } from "@/infra/api-client";
import type { Competence } from "@/shared/lib/competence";
import type {
  OneTimeRevenue,
  FixedRevenue,
  FixedRevenueVersion,
  RevenueMonth,
  RevenueYearSummary,
} from "../types";

export const ReceitasService = {
  // Consultas da tela
  getMonth: async ({ year, month }: Competence): Promise<RevenueMonth> => {
    const { data } = await apiClient.get("/revenues", {
      params: { competenceYear: year, competenceMonth: month },
    });
    return data;
  },
  getYearSummary: async (year: number): Promise<RevenueYearSummary> => {
    const { data } = await apiClient.get("/revenues/summary", { params: { year } });
    return data;
  },

  // One-time revenues
  createOneTime: async (payload: {
    description: string;
    amount: number;
    competenceYear: number;
    competenceMonth: number;
  }): Promise<OneTimeRevenue> => {
    const { data } = await apiClient.post("/revenues/one-time", payload);
    return data;
  },

  updateOneTime: async (
    id: string,
    payload: {
      description: string;
      amount: number;
      competenceYear: number;
      competenceMonth: number;
    },
  ): Promise<OneTimeRevenue> => {
    const { data } = await apiClient.put(`/revenues/one-time/${id}`, payload);
    return data;
  },

  deleteOneTime: async (id: string): Promise<void> => {
    await apiClient.delete(`/revenues/one-time/${id}`);
  },

  // Fixed revenues
  getFixed: async (id: string): Promise<FixedRevenue> => {
    const { data } = await apiClient.get(`/revenues/fixed/${id}`);
    return data;
  },

  createFixed: async (payload: {
    description: string;
    amount: number;
    modality: "ALTERABLE" | "UNALTERABLE";
    startYear: number;
    startMonth: number;
    endYear?: number | null;
    endMonth?: number | null;
  }): Promise<FixedRevenue> => {
    const { data } = await apiClient.post("/revenues/fixed", payload);
    return data;
  },

  /** A API responde com a versão criada, não com a receita completa. */
  addVersion: async (
    id: string,
    payload: {
      description: string;
      amount: number;
      effectiveYear: number;
      effectiveMonth: number;
    },
  ): Promise<FixedRevenueVersion> => {
    const { data } = await apiClient.patch(`/revenues/fixed/${id}`, payload);
    return data;
  },

  terminate: async (
    id: string,
    payload: {
      endYear: number;
      endMonth: number;
    },
  ): Promise<FixedRevenue> => {
    const { data } = await apiClient.patch(`/revenues/fixed/${id}/terminate`, payload);
    return data;
  },

  deleteFixed: async (id: string): Promise<void> => {
    await apiClient.delete(`/revenues/fixed/${id}`);
  },
};
