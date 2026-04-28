import { apiClient } from "@/infra/api-client";
import type { OneTimeRevenue, FixedRevenue, FixedRevenueVersion } from "../types";

export const ReceitasService = {
  // One-time revenues
  getOneTime: async (): Promise<OneTimeRevenue[]> => {
    const { data } = await apiClient.get("/revenues/one-time");
    return data;
  },

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
  getFixed: async (): Promise<FixedRevenue[]> => {
    const { data } = await apiClient.get("/revenues/fixed");
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

  addVersion: async (
    id: string,
    payload: {
      description: string;
      amount: number;
      effectiveYear: number;
      effectiveMonth: number;
    },
  ): Promise<FixedRevenueVersion> => {
    const { data } = await apiClient.post(`/revenues/fixed/${id}/versions`, payload);
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
