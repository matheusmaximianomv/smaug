/**
 * @vitest-environment node
 *
 * Cobre o guard `typeof window === "undefined"`, inalcançável no jsdom.
 */
import { describe, expect, it } from "vitest";
import { redirectToLogin } from "./navigation";

describe("redirectToLogin sem window (ambiente node)", () => {
  it("confirma que não existe window neste ambiente", () => {
    expect(typeof window).toBe("undefined");
  });

  it("é no-op e não lança", () => {
    expect(() => redirectToLogin()).not.toThrow();
  });
});
