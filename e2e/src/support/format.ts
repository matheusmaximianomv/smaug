import { MONTH_NAMES_FULL, MONTH_NAMES_SHORT } from "./month-names.js";
import type { Competence } from "./competence.js";

/**
 * Mesma formatação de `web/shared/lib/formatCurrency.ts`. O Node 24 tem ICU
 * completo, então a string sai idêntica à do browser — inclusive o NBSP (U+00A0)
 * entre "R$" e o número.
 */
export function brl(value: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

/**
 * Versão com espaço comum. As asserções de texto do Playwright normalizam
 * whitespace (e `\s` do JS inclui  ), então `toContainText(brl(x))` casa;
 * use esta só onde precisar de comparação byte a byte com espaço simples.
 */
export function brlLoose(value: number): string {
  return brl(value).replace(/ /g, " ");
}

/** Espelha `shared/lib/dateUtils.formatMonthYear` → "Set/26". */
export function monthShort({ year, month }: Competence): string {
  return `${MONTH_NAMES_SHORT[month - 1]}/${String(year).slice(-2)}`;
}

/** Espelha o label do MonthNavigator → "Setembro de 2026". */
export function monthLong({ year, month }: Competence): string {
  return `${MONTH_NAMES_FULL[month - 1]} de ${year}`;
}

/** Título do mês nas telas de Receitas/Despesas → "Setembro 2026". */
export function monthTitle({ year, month }: Competence): string {
  return `${MONTH_NAMES_FULL[month - 1]} ${year}`;
}

/** Total da faixa de 12 meses: sem "R$" e sem centavos (truncados) → "3.420". */
export function compact(value: number): string {
  return new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 }).format(Math.trunc(value));
}

/** Valor de célula/barra (Revisão, grades da Ficha): "33,34", sem o prefixo. */
export function cellAmount(value: number): string {
  return brl(value).replace("R$", "").trim();
}

/** Competência no formato do CSV de importação → "2026-09". */
export function csvCompetence({ year, month }: Competence): string {
  return `${year}-${String(month).padStart(2, "0")}`;
}
