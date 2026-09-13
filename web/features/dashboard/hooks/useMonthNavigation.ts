"use client";

import { useState } from "react";
import { addMonths, getCompetenceStatus, getCurrentCompetence } from "@/shared/lib/competence";
import type { MonthCompetence, MonthStatus } from "../types";

export function useMonthNavigation() {
  const current = getCurrentCompetence();
  const [selected, setSelected] = useState<MonthCompetence>(current);

  const status: MonthStatus = getCompetenceStatus(selected, current);

  const navigate = (delta: number) => setSelected((prev) => addMonths(prev, delta));
  const goToCurrent = () => setSelected(current);

  return { selected, status, isCurrent: status === "current", current, navigate, goToCurrent };
}
