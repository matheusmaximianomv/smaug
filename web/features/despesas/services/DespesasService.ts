import { apiClient } from "@/infra/api-client";
import type { Competence } from "@/shared/lib/competence";
import type {
  ExpenseMonth,
  ExpenseYearSummary,
  OneTimeExpense,
  InstallmentExpense,
  RecurringExpense,
} from "../types";

export const DespesasService = {
  // Consultas da tela
  getMonth: async ({ year, month }: Competence): Promise<ExpenseMonth> => {
    const { data } = await apiClient.get("/expenses", {
      params: { competenceYear: year, competenceMonth: month },
    });
    return data;
  },
  getYearSummary: async (year: number): Promise<ExpenseYearSummary> => {
    const { data } = await apiClient.get("/expenses/summary", { params: { year } });
    return data;
  },

  // One-time expenses
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
  getInstallment: async (id: string): Promise<InstallmentExpense> => {
    const { data } = await apiClient.get(`/expenses/installment/${id}`);
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
  terminateInstallment: async (id: string): Promise<InstallmentExpense> => {
    const { data } = await apiClient.post(`/expenses/installment/${id}/terminate`);
    return data;
  },
  deleteInstallment: async (id: string): Promise<void> => {
    await apiClient.delete(`/expenses/installment/${id}`);
  },

  // Recurring expenses
  getRecurring: async (id: string): Promise<RecurringExpense> => {
    const { data } = await apiClient.get(`/expenses/recurring/${id}`);
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
  ): Promise<RecurringExpense> => {
    const { data } = await apiClient.patch(`/expenses/recurring/${id}`, payload);
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
