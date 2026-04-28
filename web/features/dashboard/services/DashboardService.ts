import { apiClient } from "@/infra/api-client";
import type { DashboardData } from "../types";

export const DashboardService = {
  getByMonth: async (year: number, month: number): Promise<DashboardData> => {
    const { data } = await apiClient.get("/dashboard", {
      params: { competenceYear: year, competenceMonth: month },
    });
    return data;
  },
};
