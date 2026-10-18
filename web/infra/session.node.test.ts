/**
 * @vitest-environment node
 *
 * Cobre os guards `typeof document === "undefined"` de `session.ts`, que são inalcançáveis no
 * ambiente jsdom. No servidor (RSC, proxy) o módulo precisa degradar silenciosamente em vez de
 * lançar — inclusive na limpeza do cookie legado, que roda ao carregar o módulo.
 */
import { describe, expect, it } from "vitest";
import { clearSession, getAccessToken, hasSessionHint, setSession } from "./session";

describe("session sem document (ambiente node)", () => {
  it("confirma que não existe document neste ambiente", () => {
    expect(typeof document).toBe("undefined");
  });

  it("setSession guarda o token em memória sem lançar", () => {
    expect(() => setSession("token-1")).not.toThrow();
    expect(getAccessToken()).toBe("token-1");
  });

  it("clearSession esquece o token sem lançar", () => {
    setSession("token-1");

    expect(() => clearSession()).not.toThrow();
    expect(getAccessToken()).toBeNull();
  });

  it("hasSessionHint devolve false", () => {
    expect(hasSessionHint()).toBe(false);
  });
});
