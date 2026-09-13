import { apiClient } from "@/infra/api-client";
import type { Category, CategoryWithCount } from "../types";

export const CategoriasService = {
  getAll: async (): Promise<CategoryWithCount[]> => {
    const { data } = await apiClient.get("/expenses/categories");
    return data;
  },

  create: async (name: string): Promise<Category> => {
    const { data } = await apiClient.post("/expenses/categories", { name });
    return data;
  },

  update: async (id: string, name: string): Promise<Category> => {
    const { data } = await apiClient.put(`/expenses/categories/${id}`, { name });
    return data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/expenses/categories/${id}`);
  },
};
