"use client";

import { useQuery } from "@tanstack/react-query";
import { DashboardService } from "../services/DashboardService";
import type { MonthCompetence } from "../types";

export function useDashboard(competence: MonthCompetence) {
  return useQuery({
    queryKey: ["dashboard", competence.year, competence.month],
    queryFn: () => DashboardService.getByMonth(competence.year, competence.month),
    staleTime: 30_000,
  });
}
