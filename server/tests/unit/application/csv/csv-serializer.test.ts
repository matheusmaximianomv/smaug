import { describe, it, expect } from "vitest";
import { CSV_COLUMNS, serializeCsv } from "@src/application/csv/csv-serializer";
import { CsvEntryRow } from "@src/application/dtos/data-export.dto";

const BOM = "﻿";
const HEADER = CSV_COLUMNS.join(";");

function row(overrides: Partial<CsvEntryRow> = {}): CsvEntryRow {
  return {
    competence: "2026-04",
    nature: "despesa",
    category: "Moradia",
    description: "Aluguel",
    amount: 2200,
    type: "recorrente",
    installmentNumber: null,
    installmentCount: null,
    seriesId: "rec-0004",
    observation: "",
    ...overrides,
  };
}

function lines(content: string): string[] {
  return content.slice(BOM.length).split("\r\n");
}

describe("serializeCsv", () => {
  it("should start the file with a BOM so Excel pt-BR reads the accents", () => {
    expect(serializeCsv([]).startsWith(BOM)).toBe(true);
  });

  it("should emit only the header when there are no rows", () => {
    expect(serializeCsv([])).toBe(`${BOM}${HEADER}\r\n`);
  });

  it("should separate lines with CRLF and end the file with one", () => {
    const content = serializeCsv([row()]);
    expect(content.endsWith("\r\n")).toBe(true);
    expect(content.includes("\n\r")).toBe(false);
    expect(lines(content)).toHaveLength(3);
  });

  it("should write the columns in the order fixed by the specification", () => {
    expect(HEADER).toBe(
      "competencia;natureza;categoria;descricao;valor;tipo;parcela;total_parcelas;serie_id;observacao",
    );
  });

  it("should format the amount with a decimal comma and two places", () => {
    const content = serializeCsv([row({ amount: 1234.5 })]);
    expect(lines(content)[1]).toContain(";1234,50;");
  });

  it("should not add a thousand separator", () => {
    const content = serializeCsv([row({ amount: 9200 })]);
    expect(lines(content)[1]).toContain(";9200,00;");
  });

  it("should leave a comma inside a description untouched and unquoted", () => {
    const content = serializeCsv([row({ description: "Netflix, Disney, HBO" })]);
    expect(lines(content)[1]).toContain(";Netflix, Disney, HBO;");
  });

  it("should quote a field that contains the field separator", () => {
    const content = serializeCsv([row({ description: "Aluguel; garagem" })]);
    expect(lines(content)[1]).toContain(';"Aluguel; garagem";');
  });

  it("should quote a field that contains a line break", () => {
    const content = serializeCsv([row({ description: "Linha1\nLinha2" })]);
    expect(content).toContain('"Linha1\nLinha2"');
  });

  it("should double inner quotes and wrap the field", () => {
    const content = serializeCsv([row({ description: 'Conta "principal"' })]);
    expect(lines(content)[1]).toContain(';"Conta ""principal""";');
  });

  it("should render a one-time revenue with empty category, series and installments", () => {
    const content = serializeCsv([
      row({
        nature: "receita",
        type: "avulsa",
        category: "",
        description: "Freelance",
        amount: 2500,
        seriesId: "",
      }),
    ]);
    expect(lines(content)[1]).toBe("2026-04;receita;;Freelance;2500,00;avulsa;;;;");
  });

  it("should render installment number and count only for installment rows", () => {
    const content = serializeCsv([
      row({
        category: "Educação",
        description: "Notebook Pro",
        amount: 400,
        type: "parcelada",
        installmentNumber: 3,
        installmentCount: 12,
        seriesId: "ser-0031",
      }),
    ]);
    expect(lines(content)[1]).toBe(
      "2026-04;despesa;Educação;Notebook Pro;400,00;parcelada;3;12;ser-0031;",
    );
  });

  it("should reproduce the example from the specification", () => {
    const content = serializeCsv([
      row({
        nature: "receita",
        type: "fixa",
        category: "",
        description: "Salário",
        amount: 9200,
        seriesId: "fix-0001",
      }),
      row({
        nature: "receita",
        type: "avulsa",
        category: "",
        description: "Freelance – Design",
        amount: 2500,
        seriesId: "",
      }),
      row({
        type: "avulsa",
        category: "Alimentação",
        description: "Supermercado extra",
        amount: 320.5,
        seriesId: "",
      }),
      row({
        type: "parcelada",
        category: "Educação",
        description: "Notebook Pro",
        amount: 400,
        installmentNumber: 3,
        installmentCount: 12,
        seriesId: "ser-0031",
      }),
      row(),
    ]);

    expect(lines(content).slice(0, 6)).toEqual([
      HEADER,
      "2026-04;receita;;Salário;9200,00;fixa;;;fix-0001;",
      "2026-04;receita;;Freelance – Design;2500,00;avulsa;;;;",
      "2026-04;despesa;Alimentação;Supermercado extra;320,50;avulsa;;;;",
      "2026-04;despesa;Educação;Notebook Pro;400,00;parcelada;3;12;ser-0031;",
      "2026-04;despesa;Moradia;Aluguel;2200,00;recorrente;;;rec-0004;",
    ]);
  });
});
