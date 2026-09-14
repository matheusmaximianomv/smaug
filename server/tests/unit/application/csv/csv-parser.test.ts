import { describe, it, expect } from "vitest";
import { parseCsvGrid } from "@src/application/csv/csv-parser";

const BOM = "﻿";

describe("parseCsvGrid", () => {
  it("should return an empty grid for an empty string", () => {
    expect(parseCsvGrid("")).toEqual([]);
  });

  it("should split fields on semicolons", () => {
    expect(parseCsvGrid("a;b;c")).toEqual([["a", "b", "c"]]);
  });

  it("should keep empty fields in place", () => {
    expect(parseCsvGrid("a;;c")).toEqual([["a", "", "c"]]);
  });

  it("should keep a trailing empty field", () => {
    expect(parseCsvGrid("a;b;")).toEqual([["a", "b", ""]]);
  });

  it("should strip the BOM before reading the first field", () => {
    expect(parseCsvGrid(`${BOM}competencia;natureza`)).toEqual([["competencia", "natureza"]]);
  });

  it("should split rows on CRLF", () => {
    expect(parseCsvGrid("a;b\r\nc;d")).toEqual([
      ["a", "b"],
      ["c", "d"],
    ]);
  });

  it("should split rows on a bare LF", () => {
    expect(parseCsvGrid("a;b\nc;d")).toEqual([
      ["a", "b"],
      ["c", "d"],
    ]);
  });

  it("should keep a semicolon that is inside quotes", () => {
    expect(parseCsvGrid('a;"b;c";d')).toEqual([["a", "b;c", "d"]]);
  });

  it("should keep a line break that is inside quotes", () => {
    expect(parseCsvGrid('a;"linha1\nlinha2";c')).toEqual([["a", "linha1\nlinha2", "c"]]);
  });

  it("should collapse doubled quotes into a single quote", () => {
    expect(parseCsvGrid('a;"Conta ""principal""";c')).toEqual([["a", 'Conta "principal"', "c"]]);
  });

  it("should discard rows that are entirely blank", () => {
    expect(parseCsvGrid("a;b\r\n\r\nc;d\r\n")).toEqual([
      ["a", "b"],
      ["c", "d"],
    ]);
  });

  it("should discard a row whose fields are only whitespace", () => {
    expect(parseCsvGrid("a;b\n   ;  \nc;d")).toEqual([
      ["a", "b"],
      ["c", "d"],
    ]);
  });

  it("should read a file that ends without a final line break", () => {
    expect(parseCsvGrid("a;b\r\nc;d")).toHaveLength(2);
  });

  it("should round-trip a serialized row", () => {
    const grid = parseCsvGrid(`${BOM}competencia;descricao\r\n2026-04;"Aluguel; garagem"\r\n`);
    expect(grid).toEqual([
      ["competencia", "descricao"],
      ["2026-04", "Aluguel; garagem"],
    ]);
  });
});
