import { describe, expect, it } from "vitest";
import { hasProperty, isApiError, isNumber, isObject, isString } from "./type-guards";

describe("isString", () => {
  it("aceita string vazia e não vazia", () => {
    expect(isString("")).toBe(true);
    expect(isString("Moradia")).toBe(true);
  });

  it.each([[0], [null], [undefined], [{}], [[]], [true]])("rejeita %p", (value) => {
    expect(isString(value)).toBe(false);
  });
});

describe("isNumber", () => {
  it("aceita inteiros, decimais, zero e negativos", () => {
    expect(isNumber(0)).toBe(true);
    expect(isNumber(-1.5)).toBe(true);
    expect(isNumber(Infinity)).toBe(true);
  });

  it("rejeita NaN", () => {
    expect(isNumber(NaN)).toBe(false);
  });

  it.each([["1"], [null], [undefined], [{}], [[]]])("rejeita %p", (value) => {
    expect(isNumber(value)).toBe(false);
  });
});

describe("isObject", () => {
  it("aceita objeto literal, inclusive vazio", () => {
    expect(isObject({})).toBe(true);
    expect(isObject({ a: 1 })).toBe(true);
  });

  it("rejeita null", () => {
    expect(isObject(null)).toBe(false);
  });

  it("rejeita array", () => {
    expect(isObject([])).toBe(false);
    expect(isObject([1, 2])).toBe(false);
  });

  it.each([["texto"], [1], [undefined]])("rejeita %p", (value) => {
    expect(isObject(value)).toBe(false);
  });
});

describe("hasProperty", () => {
  it("encontra a chave presente", () => {
    expect(hasProperty({ message: "x" }, "message")).toBe(true);
  });

  it("aceita chave com valor undefined, pois usa o operador in", () => {
    expect(hasProperty({ message: undefined }, "message")).toBe(true);
  });

  it("rejeita chave ausente", () => {
    expect(hasProperty({ other: 1 }, "message")).toBe(false);
  });

  it("rejeita valores que não são objeto", () => {
    expect(hasProperty(null, "message")).toBe(false);
    expect(hasProperty([], "length")).toBe(false);
    expect(hasProperty("texto", "length")).toBe(false);
  });
});

describe("isApiError", () => {
  it("aceita objeto com message string e statusCode numérico", () => {
    expect(isApiError({ message: "Falhou", statusCode: 500 })).toBe(true);
  });

  it("rejeita quando message não é string", () => {
    expect(isApiError({ message: 1, statusCode: 500 })).toBe(false);
  });

  it("rejeita quando statusCode não é número", () => {
    expect(isApiError({ message: "Falhou", statusCode: "500" })).toBe(false);
  });

  it("rejeita quando statusCode é NaN", () => {
    expect(isApiError({ message: "Falhou", statusCode: NaN })).toBe(false);
  });

  it("rejeita quando falta message", () => {
    expect(isApiError({ statusCode: 500 })).toBe(false);
  });

  it("rejeita quando falta statusCode", () => {
    expect(isApiError({ message: "Falhou" })).toBe(false);
  });

  it.each([[null], [undefined], ["Falhou"], [[]], [{}]])("rejeita %p", (value) => {
    expect(isApiError(value)).toBe(false);
  });
});
