import { userHandlers } from "./users";
import { categoryHandlers } from "./categories";
import { revenueHandlers } from "./revenues";
import { expenseHandlers } from "./expenses";

/**
 * Ordem importa: `/revenues` e `/expenses` (consultas consolidadas) são
 * registrados DEPOIS das rotas mais específicas (`/revenues/fixed`, …) para que
 * o MSW não case a rota genérica primeiro.
 */
export const handlers = [
  ...userHandlers,
  ...categoryHandlers,
  ...revenueHandlers,
  ...expenseHandlers,
];
