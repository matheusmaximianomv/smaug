import { describe, expect, it } from "vitest";
import { queryClient } from "./query-client";

/**
 * Só inspeciona as opções — nenhuma query é montada aqui. O singleton com
 * `retry: 3` e backoff exponencial é justamente o motivo de os demais testes
 * usarem `createTestQueryClient()`.
 */
const queries = queryClient.getDefaultOptions().queries!;
const mutations = queryClient.getDefaultOptions().mutations!;

describe("queryClient (singleton de produção)", () => {
  it("considera os dados frescos por 30 segundos", () => {
    expect(queries.staleTime).toBe(30 * 1000);
  });

  it("mantém o cache por 5 minutos", () => {
    expect(queries.gcTime).toBe(5 * 60 * 1000);
  });

  it("tenta a query novamente até 3 vezes", () => {
    expect(queries.retry).toBe(3);
  });

  it("não refaz a query ao focar a janela", () => {
    expect(queries.refetchOnWindowFocus).toBe(false);
  });

  it("tenta a mutation novamente uma única vez", () => {
    expect(mutations.retry).toBe(1);
  });

  describe("retryDelay", () => {
    const retryDelay = queries.retryDelay as (attemptIndex: number, error: Error) => number;
    const error = new Error("falhou");

    it.each([
      [0, 1000],
      [1, 2000],
      [2, 4000],
      [3, 8000],
      [4, 16000],
    ])("espera %i tentativa → %i ms (backoff exponencial)", (attempt, expected) => {
      expect(retryDelay(attempt, error)).toBe(expected);
    });

    it("limita o backoff em 30 segundos", () => {
      expect(retryDelay(5, error)).toBe(30000);
      expect(retryDelay(20, error)).toBe(30000);
    });
  });
});
