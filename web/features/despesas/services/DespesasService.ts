import { apiClient } from "@/infra/api-client";
import type {
  OneTimeExpense,
  InstallmentExpense,
  RecurringExpense,
  RecurringExpenseVersion,
} from "../types";

export const DespesasService = {
  // One-time expenses
  getOneTime: async (): Promise<OneTimeExpense[]> => {
    const { data } = await apiClient.get("/expenses/one-time");
    return data;
  },
  createOneTime: async (payload: {
    description: string;
    amount: number;
    categoryId: string;
    competenceYear: number;
    competenceMonth: number;
  }): Promise<OneTimeExpense> => {
    const { data } = await apiClient.post("/expenses/one-time", payload);
    return data;
  },
  updateOneTime: async (
    id: string,
    payload: {
      description: string;
      amount: number;
      categoryId: string;
      competenceYear: number;
      competenceMonth: number;
    },
  ): Promise<OneTimeExpense> => {
    const { data } = await apiClient.put(`/expenses/one-time/${id}`, payload);
    return data;
  },
  deleteOneTime: async (id: string): Promise<void> => {
    await apiClient.delete(`/expenses/one-time/${id}`);
  },

  // Installment expenses
  getInstallments: async (): Promise<InstallmentExpense[]> => {
    const { data } = await apiClient.get("/expenses/installment");
    return data;
  },
  createInstallment: async (payload: {
    description: string;
    totalAmount: number;
    installmentCount: number;
    categoryId: string;
    startYear: number;
    startMonth: number;
  }): Promise<InstallmentExpense> => {
    const { data } = await apiClient.post("/expenses/installment", payload);
    return data;
  },
  deleteInstallment: async (id: string): Promise<void> => {
    await apiClient.delete(`/expenses/installment/${id}`);
  },

  // Recurring expenses
  getRecurring: async (): Promise<RecurringExpense[]> => {
    const { data } = await apiClient.get("/expenses/recurring");
    return data;
  },
  createRecurring: async (payload: {
    description: string;
    amount: number;
    categoryId: string;
    startYear: number;
    startMonth: number;
    endYear?: number | null;
    endMonth?: number | null;
  }): Promise<RecurringExpense> => {
    const { data } = await apiClient.post("/expenses/recurring", payload);
    return data;
  },
  addRecurringVersion: async (
    id: string,
    payload: {
      description: string;
      amount: number;
      categoryId: string;
      effectiveYear: number;
      effectiveMonth: number;
    },
  ): Promise<RecurringExpenseVersion> => {
    const { data } = await apiClient.post(`/expenses/recurring/${id}/versions`, payload);
    return data;
  },
  terminateRecurring: async (
    id: string,
    payload: { endYear: number; endMonth: number },
  ): Promise<RecurringExpense> => {
    const { data } = await apiClient.patch(`/expenses/recurring/${id}/terminate`, payload);
    return data;
  },
  deleteRecurring: async (id: string): Promise<void> => {
    await apiClient.delete(`/expenses/recurring/${id}`);
  },
};
