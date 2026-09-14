import { CsvEntryRow } from "@src/application/dtos/data-export.dto";

/**
 * Colunas na ordem fixada pela especificação do formato (docs/prototipo/v2/ESPECIFICACAO-CSV.md).
 * A ordem faz parte do contrato: mudá-la quebra qualquer arquivo já exportado.
 */
export const CSV_COLUMNS = [
  "competencia",
  "natureza",
  "categoria",
  "descricao",
  "valor",
  "tipo",
  "parcela",
  "total_parcelas",
  "serie_id",
  "observacao",
] as const;

const FIELD_SEPARATOR = ";";
const LINE_SEPARATOR = "\r\n";
/** O Excel pt-BR só lê os acentos corretamente quando o arquivo começa com BOM. */
const BOM = "﻿";
const DECIMAL_PLACES = 2;
const NEEDS_QUOTING = /[;"\r\n]/;

function escapeField(value: string): string {
  if (!NEEDS_QUOTING.test(value)) {
    return value;
  }
  return `"${value.replace(/"/g, '""')}"`;
}

/** Valor sempre positivo, com vírgula decimal e sem separador de milhar. */
function formatAmount(amount: number): string {
  return amount.toFixed(DECIMAL_PLACES).replace(".", ",");
}

function formatOptionalNumber(value: number | null): string {
  return value === null ? "" : String(value);
}

function toLine(row: CsvEntryRow): string {
  return [
    row.competence,
    row.nature,
    escapeField(row.category),
    escapeField(row.description),
    formatAmount(row.amount),
    row.type,
    formatOptionalNumber(row.installmentNumber),
    formatOptionalNumber(row.installmentCount),
    escapeField(row.seriesId),
    escapeField(row.observation),
  ].join(FIELD_SEPARATOR);
}

export function serializeCsv(rows: CsvEntryRow[]): string {
  const lines = [CSV_COLUMNS.join(FIELD_SEPARATOR), ...rows.map(toLine)];
  return BOM + lines.join(LINE_SEPARATOR) + LINE_SEPARATOR;
}
