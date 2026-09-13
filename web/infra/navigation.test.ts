import { afterEach, describe, expect, it, vi } from "vitest";
import { redirectToLogin } from "./navigation";

/**
 * `window.location` é não-configurável no jsdom 29 e atribuir `location.href`
 * não muda a URL (jsdom não implementa navegação). A saída é trocar o próprio
 * `window` global por um duplo — `navigation.ts` lê `window` no momento da
 * chamada, então o duplo é visto.
 */
function stubWindow(pathname: string) {
  const location = { pathname, href: `http://localhost:3001${pathname}` };
  vi.stubGlobal("window", { location });
  return location;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("redirectToLogin", () => {
  it("navega para /login quando está em outra rota", () => {
    const location = stubWindow("/dashboard");

    redirectToLogin();

    expect(location.href).toBe("/login");
  });

  it("navega para /login a partir da raiz", () => {
    const location = stubWindow("/");

    redirectToLogin();

    expect(location.href).toBe("/login");
  });

  it("não navega quando já está em /login", () => {
    const location = stubWindow("/login");

    redirectToLogin();

    expect(location.href).toBe("http://localhost:3001/login");
  });

  it("navega quando o pathname apenas começa com /login", () => {
    const location = stubWindow("/loginfake");

    redirectToLogin();

    expect(location.href).toBe("/login");
  });
});
