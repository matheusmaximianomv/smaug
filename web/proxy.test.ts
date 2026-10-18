/**
 * @vitest-environment node
 *
 * `NextRequest`/`NextResponse` dependem das APIs de Request/Response do runtime
 * Edge; o ambiente node as expõe nativamente, o jsdom não.
 */
import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { config, proxy } from "./proxy";

const ORIGIN = "http://localhost:3001";
const UUID = "00000000-0000-4000-8000-000000000001";

function request(path: string, userId?: string): NextRequest {
  return new NextRequest(`${ORIGIN}${path}`, {
    headers: userId ? { cookie: `userId=${userId}` } : {},
  });
}

/** `NextResponse.next()` é 200 com o header sentinela do Next. */
function expectNext(response: Response): void {
  expect(response.status).toBe(200);
  expect(response.headers.get("x-middleware-next")).toBe("1");
}

function expectRedirectTo(response: Response, path: string): void {
  expect(response.status).toBe(307);
  expect(response.headers.get("location")).toBe(`${ORIGIN}${path}`);
}

describe("rotas privadas", () => {
  it.each(["/dashboard", "/receitas", "/despesas", "/categorias", "/historico"])(
    "redireciona %s para /login sem cookie de sessão",
    (path) => {
      expectRedirectTo(proxy(request(path)), "/login");
    },
  );

  it("deixa passar quando há cookie de sessão", () => {
    expectNext(proxy(request("/dashboard", UUID)));
  });

  it("redireciona a raiz para /login sem cookie", () => {
    expectRedirectTo(proxy(request("/")), "/login");
  });

  it("deixa a raiz passar com cookie", () => {
    expectNext(proxy(request("/", UUID)));
  });
});

describe("rotas públicas", () => {
  it("deixa /login passar sem cookie", () => {
    expectNext(proxy(request("/login")));
  });

  it("deixa /cadastro passar sem cookie", () => {
    expectNext(proxy(request("/cadastro")));
  });

  it("redireciona /login para /dashboard quando já há sessão", () => {
    expectRedirectTo(proxy(request("/login", UUID)), "/dashboard");
  });

  it("redireciona /cadastro para /dashboard quando já há sessão", () => {
    expectRedirectTo(proxy(request("/cadastro", UUID)), "/dashboard");
  });

  it("trata subrotas de /login como públicas", () => {
    expectNext(proxy(request("/login/algo")));
  });

  it("trata subrotas de /cadastro como públicas", () => {
    expectNext(proxy(request("/cadastro/confirmacao")));
  });

  it("NÃO trata /loginfake como pública: redireciona para /login", () => {
    expectRedirectTo(proxy(request("/loginfake")), "/login");
  });

  it("NÃO trata /cadastrofake como pública: redireciona para /login", () => {
    expectRedirectTo(proxy(request("/cadastrofake")), "/login");
  });

  it("ignora cookie de sessão vazio numa rota pública", () => {
    expectNext(proxy(request("/login", "")));
  });
});

describe("config.matcher", () => {
  const matcher = new RegExp(`^${config.matcher[0]}$`);

  it("declara um único padrão", () => {
    expect(config.matcher).toHaveLength(1);
  });

  it.each(["_next/static", "_next/image", "favicon.ico", "api"])(
    "exclui %s do matcher",
    (excluded) => {
      expect(config.matcher[0]).toContain(excluded);
    },
  );

  it.each(["/dashboard", "/login", "/"])("casa a rota de aplicação %s", (path) => {
    expect(matcher.test(path)).toBe(true);
  });

  it.each(["/_next/static/chunk.js", "/_next/image", "/favicon.ico", "/api/health"])(
    "não casa %s",
    (path) => {
      expect(matcher.test(path)).toBe(false);
    },
  );
});
