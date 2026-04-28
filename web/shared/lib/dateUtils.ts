export interface MonthCompetence {
  year: number;
  month: number;
}

export function formatMonthYear(year: number, month: number): string {
  const monthNames = [
    "Jan",
    "Fev",
    "Mar",
    "Abr",
    "Mai",
    "Jun",
    "Jul",
    "Ago",
    "Set",
    "Out",
    "Nov",
    "Dez",
  ];
  const shortYear = String(year).slice(-2);
  return `${monthNames[month - 1]}/${shortYear}`;
}

export function getCurrentMonth(): MonthCompetence {
  const now = new Date();
  return {
    year: now.getFullYear(),
    month: now.getMonth() + 1,
  };
}

export function navigateMonth(
  current: MonthCompetence,
  direction: "prev" | "next",
): MonthCompetence {
  const { year, month } = current;

  if (direction === "next") {
    if (month === 12) {
      return { year: year + 1, month: 1 };
    }
    return { year, month: month + 1 };
  } else {
    if (month === 1) {
      return { year: year - 1, month: 12 };
    }
    return { year, month: month - 1 };
  }
}

export function getMonthStatus(competence: MonthCompetence): "past" | "current" | "future" {
  const current = getCurrentMonth();

  if (competence.year < current.year) return "past";
  if (competence.year > current.year) return "future";

  if (competence.month < current.month) return "past";
  if (competence.month > current.month) return "future";

  return "current";
}

export function getSemesterMonths(competence: MonthCompetence): MonthCompetence[] {
  const months: MonthCompetence[] = [];

  let current = { ...competence };
  for (let i = 0; i < 3; i++) {
    current = navigateMonth(current, "prev");
  }

  for (let i = 0; i < 6; i++) {
    months.push({ ...current });
    current = navigateMonth(current, "next");
  }

  return months;
}
