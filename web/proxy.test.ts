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
const HINT = "smaug_session=1";
const LEGACY = "userId=00000000-0000-4000-8000-000000000001";

function request(path: string, cookie?: string): NextRequest {
  return new NextRequest(`${ORIGIN}${path}`, {
    headers: cookie ? { cookie } : {},
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
  it.each(["/dashboard", "/receitas", "/despesas", "/categorias", "/historico", "/dados"])(
    "redireciona %s para /login?next= sem indicador de sessão",
    (path) => {
      expectRedirectTo(proxy(request(path)), `/login?next=${encodeURIComponent(path)}`);
    },
  );

  it("leva a query string da rota pretendida em next", () => {
    expectRedirectTo(
      proxy(request("/despesas?mes=2026-10&aba=fixas")),
      `/login?next=${encodeURIComponent("/despesas?mes=2026-10&aba=fixas")}`,
    );
  });

  it("deixa passar quando há indicador de sessão", () => {
    expectNext(proxy(request("/dashboard", HINT)));
  });

  it("acha o indicador no meio de outros cookies", () => {
    expectNext(proxy(request("/receitas", `a=1; ${HINT}; b=2`)));
  });

  it("redireciona a raiz para /login sem next quando não há indicador", () => {
    expectRedirectTo(proxy(request("/")), "/login");
  });

  it("deixa a raiz passar com indicador", () => {
    expectNext(proxy(request("/", HINT)));
  });

  it("não considera logado quem só tem o cookie userId legado", () => {
    expectRedirectTo(
      proxy(request("/dashboard", LEGACY)),
      `/login?next=${encodeURIComponent("/dashboard")}`,
    );
  });

  it("não considera logado um indicador com valor diferente de 1", () => {
    expectRedirectTo(
      proxy(request("/dashboard", "smaug_session=0")),
      `/login?next=${encodeURIComponent("/dashboard")}`,
    );
  });
});

describe("rotas públicas", () => {
  it("deixa /login passar sem cookie", () => {
    expectNext(proxy(request("/login")));
  });

  it("deixa /cadastro passar sem cookie", () => {
    expectNext(proxy(request("/cadastro")));
  });

  it("redireciona /login para /dashboard quando já há indicador de sessão", () => {
    expectRedirectTo(proxy(request("/login", HINT)), "/dashboard");
  });

  it("redireciona /login?next= para /dashboard quando já há indicador de sessão", () => {
    expectRedirectTo(proxy(request("/login?next=%2Freceitas", HINT)), "/dashboard");
  });

  it("redireciona /cadastro para /dashboard quando já há indicador de sessão", () => {
    expectRedirectTo(proxy(request("/cadastro", HINT)), "/dashboard");
  });

  it("deixa /login passar com o cookie userId legado", () => {
    expectNext(proxy(request("/login", LEGACY)));
  });

  it("trata subrotas de /login como públicas", () => {
    expectNext(proxy(request("/login/algo")));
  });

  it("trata subrotas de /cadastro como públicas", () => {
    expectNext(proxy(request("/cadastro/confirmacao")));
  });

  it("NÃO trata /loginfake como pública: redireciona para /login", () => {
    expectRedirectTo(proxy(request("/loginfake")), "/login?next=%2Floginfake");
  });

  it("NÃO trata /cadastrofake como pública: redireciona para /login", () => {
    expectRedirectTo(proxy(request("/cadastrofake")), "/login?next=%2Fcadastrofake");
  });

  it("ignora indicador de sessão vazio numa rota pública", () => {
    expectNext(proxy(request("/login", "smaug_session=")));
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
