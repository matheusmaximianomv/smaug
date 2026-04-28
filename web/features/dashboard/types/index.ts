export type MonthStatus = "past" | "current" | "future";

export interface MonthCompetence {
  year: number;
  month: number;
}

export interface KpiData {
  totalRevenues: number;
  totalExpenses: number;
  balance: number;
}

export interface MonthChartData {
  year: number;
  month: number;
  label: string;
  revenues: number;
  expenses: number;
  isFuture: boolean;
}

export interface SemesterChartData {
  months: MonthChartData[];
}

export interface CategoryBreakdown {
  categoryId: string;
  categoryName: string;
  amount: number;
  percentage: number;
}

export interface ExpenseBreakdown {
  categories: CategoryBreakdown[];
  total: number;
}

export interface RevenueListItem {
  id: string;
  type: "ONE_TIME" | "FIXED";
  description: string;
  amount: number;
}

export interface ExpenseListItem {
  id: string;
  type: "ONE_TIME" | "INSTALLMENT" | "RECURRING";
  description: string;
  amount: number;
  categoryName?: string;
}

export interface DashboardData {
  competence: MonthCompetence;
  status: MonthStatus;
  kpis: KpiData;
  chart: SemesterChartData;
  breakdown: ExpenseBreakdown;
  recentRevenues: RevenueListItem[];
  recentExpenses: ExpenseListItem[];
}
