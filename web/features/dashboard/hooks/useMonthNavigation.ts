"use client";

import { useState } from "react";
import type { MonthCompetence, MonthStatus } from "../types";

function getCurrentCompetence(): MonthCompetence {
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() + 1 };
}

function getStatus(competence: MonthCompetence, current: MonthCompetence): MonthStatus {
  if (competence.year === current.year && competence.month === current.month) return "current";
  if (
    competence.year < current.year ||
    (competence.year === current.year && competence.month < current.month)
  )
    return "past";
  return "future";
}

function addMonths(competence: MonthCompetence, n: number): MonthCompetence {
  const date = new Date(competence.year, competence.month - 1 + n, 1);
  return { year: date.getFullYear(), month: date.getMonth() + 1 };
}

export function useMonthNavigation() {
  const current = getCurrentCompetence();
  const [selected, setSelected] = useState<MonthCompetence>(current);

  const status = getStatus(selected, current);
  const isCurrent = status === "current";

  const navigate = (delta: number) => setSelected((prev) => addMonths(prev, delta));
  const goToCurrent = () => setSelected(current);

  return { selected, status, isCurrent, current, navigate, goToCurrent };
}
