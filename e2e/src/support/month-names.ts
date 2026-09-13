/**
 * Cópia deliberada de `web/shared/lib/dateUtils.ts`. O pacote e2e é caixa-preta:
 * não importa código de `web/` nem de `server/` (ver a regra `no-e2e-to-src` no
 * .dependency-cruiser.js). Se os nomes mudarem lá, um teste aqui quebra — que é
 * exatamente o sinal desejado.
 */
export const MONTH_NAMES_FULL = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
] as const;

export const MONTH_NAMES_SHORT = [
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
] as const;
