const FIELD_SEPARATOR = ";";
const QUOTE = '"';
const BOM = "﻿";

/**
 * Lê o CSV em grade de strings. Mantido manual em vez de usar biblioteca porque o formato é
 * estreito e fechado: separador `;`, aspas duplas com escape por duplicação, CRLF ou LF.
 *
 * Linhas totalmente vazias são descartadas — editores de planilha costumam deixar uma última
 * linha em branco, e ela não deve virar um erro de importação.
 */
export function parseCsvGrid(content: string): string[][] {
  const text = content.startsWith(BOM) ? content.slice(BOM.length) : content;

  const rows: string[][] = [];
  let currentRow: string[] = [];
  let field = "";
  let insideQuotes = false;

  const pushField = (): void => {
    currentRow.push(field);
    field = "";
  };

  const pushRow = (): void => {
    pushField();
    rows.push(currentRow);
    currentRow = [];
  };

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];

    if (insideQuotes) {
      if (char !== QUOTE) {
        field += char;
      } else if (text[index + 1] === QUOTE) {
        field += QUOTE;
        index += 1;
      } else {
        insideQuotes = false;
      }
      continue;
    }

    if (char === QUOTE) {
      insideQuotes = true;
    } else if (char === FIELD_SEPARATOR) {
      pushField();
    } else if (char === "\n") {
      pushRow();
    } else if (char !== "\r") {
      field += char;
    }
  }

  if (field !== "" || currentRow.length > 0) {
    pushRow();
  }

  return rows.filter((row) => row.some((cell) => cell.trim() !== ""));
}
