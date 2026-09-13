/**
 * @vitest-environment node
 *
 * Cobre os três guards `typeof document === "undefined"` de `session.ts`, que são
 * inalcançáveis no ambiente jsdom. No servidor (RSC, middleware) o módulo precisa
 * degradar silenciosamente em vez de lançar.
 */
import { describe, expect, it } from "vitest";
import { clearUserId, getUserId, setUserId } from "./session";

describe("session sem document (ambiente node)", () => {
  it("confirma que não existe document neste ambiente", () => {
    expect(typeof document).toBe("undefined");
  });

  it("getUserId devolve null", () => {
    expect(getUserId()).toBeNull();
  });

  it("setUserId não lança", () => {
    expect(() => setUserId("00000000-0000-4000-8000-000000000001")).not.toThrow();
  });

  it("clearUserId não lança", () => {
    expect(() => clearUserId()).not.toThrow();
  });
});
