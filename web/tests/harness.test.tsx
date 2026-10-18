/**
 * Testes do próprio harness. Guardam as três suposições de infraestrutura de
 * maior risco; se algum quebrar, a suíte inteira está comprometida e vale
 * investigar aqui antes de qualquer teste de feature.
 */
import { describe, expect, it } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import { Button } from "@/shared/components/Button";
import { apiClient } from "@/infra/api-client";
import { useCategories } from "@/features/categorias/hooks/useCategories";
import { renderHookWithProviders, renderWithProviders } from "./render";
import { getAccessToken, hasSessionHint } from "@/infra/session";
import { http, HttpResponse } from "msw";
import { API, db, mockApiError, seedDb, server, url } from "./msw";
import { makeCategoryWithCount, makeUser } from "./fixtures";
import { loginAs, logout } from "./session";
import { recordRequests, signatures } from "./requests";

describe("harness: RTL + jest-dom", () => {
  it("renderiza um componente e aplica os matchers do jest-dom", () => {
    renderWithProviders(<Button isLoading>Salvar</Button>);
    // O spinner é um <span> sem role: a asserção correta é o estado do botão.
    expect(screen.getByRole("button", { name: /salvar/i })).toBeDisabled();
  });
});

describe("harness: axios + MSW + jsdom", () => {
  it("intercepta a requisição do apiClient e devolve o store em memória", async () => {
    seedDb({ categories: [makeCategoryWithCount({ name: "Moradia" })] });

    const { data } = await apiClient.get("/expenses/categories");

    expect(data).toHaveLength(1);
    expect(data[0].name).toBe("Moradia");
  });

  it("casa as rotas na origem do jsdom com o prefixo /api do repasse", () => {
    expect(API).toBe(`${window.location.origin}/api`);
  });

  it("grava o caminho da API sem o prefixo /api", async () => {
    const calls = recordRequests();

    await apiClient.get("/expenses/categories");

    expect(signatures(calls)).toEqual(["GET /expenses/categories"]);
  });

  it("injeta o Bearer semeado por loginAs", async () => {
    loginAs();
    const calls = recordRequests();

    await apiClient.get("/expenses/categories");

    expect(calls[0].headers.get("authorization")).toBe(`Bearer ${getAccessToken()}`);
  });

  it("propaga o código de erro de negócio da API", async () => {
    mockApiError("get", "/expenses/categories", 409, {
      error: "EXPENSE_CATEGORY_HAS_LINKED_EXPENSES",
    });

    await expect(apiClient.get("/expenses/categories")).rejects.toMatchObject({
      response: { status: 409 },
    });
  });
});

describe("harness: sessão", () => {
  it("loginAs semeia o token em memória, o indicador e o refresh do servidor", () => {
    const user = loginAs();

    expect(getAccessToken()).toMatch(/^access-/);
    expect(hasSessionHint()).toBe(true);
    expect(db.users).toEqual([user]);
    expect(db.session).toEqual({ userId: user.id });
  });

  it("loginAs não duplica um usuário já semeado", () => {
    const user = makeUser();
    seedDb({ users: [user] });

    loginAs(user);

    expect(db.users).toHaveLength(1);
  });

  it("logout limpa a aba e o refresh do servidor", () => {
    loginAs();

    logout();

    expect(getAccessToken()).toBeNull();
    expect(hasSessionHint()).toBe(false);
    expect(db.session).toBeNull();
  });

  it("isola a sessão entre testes", () => {
    // O afterEach global chamou clearSession() e resetDb().
    expect(getAccessToken()).toBeNull();
    expect(hasSessionHint()).toBe(false);
    expect(db.session).toBeNull();
  });

  it("renova o token em um 401 e refaz a chamada contra o MSW", async () => {
    loginAs();
    const before = getAccessToken();
    server.use(
      http.get(
        url("/expenses/categories"),
        () => HttpResponse.json({ error: "UNAUTHORIZED" }, { status: 401 }),
        { once: true },
      ),
    );
    const calls = recordRequests();

    const { data } = await apiClient.get("/expenses/categories");

    expect(data).toEqual([]);
    expect(signatures(calls)).toEqual([
      "GET /expenses/categories",
      "POST /auth/refresh",
      "GET /expenses/categories",
    ]);
    expect(getAccessToken()).not.toBe(before);
  });
});

describe("harness: handlers de autenticação", () => {
  it("cadastra, abre a sessão e responde /users/me com o Bearer", async () => {
    const { data: session } = await apiClient.post("/auth/register", {
      name: "Ana",
      email: "ana@example.com",
      password: "senha-bem-longa",
    });

    expect(session).toMatchObject({ tokenType: "Bearer", expiresIn: 600 });
    expect(session.user).toMatchObject({ name: "Ana", email: "ana@example.com" });
    expect(db.session).toEqual({ userId: session.user.id });

    const { data: me } = await apiClient.get("/users/me", {
      headers: { Authorization: `Bearer ${session.accessToken}` },
    });
    expect(me).toEqual(session.user);
  });

  it("recusa cadastro com e-mail repetido", async () => {
    seedDb({ users: [makeUser({ email: "ana@example.com" })] });

    await expect(
      apiClient.post("/auth/register", { name: "Ana", email: "ana@example.com", password: "x" }),
    ).rejects.toMatchObject({
      response: { status: 409, data: { error: "EMAIL_ALREADY_EXISTS" } },
    });
  });

  it("loga com a senha cadastrada e recusa a errada sem renovar", async () => {
    const user = makeUser();
    seedDb({ users: [user], passwords: { [user.id]: "senha-certa-123" } });
    const calls = recordRequests();

    const { data } = await apiClient.post("/auth/login", {
      email: user.email,
      password: "senha-certa-123",
    });
    expect(data.user).toEqual(user);

    await expect(
      apiClient.post("/auth/login", { email: user.email, password: "errada" }),
    ).rejects.toMatchObject({ response: { status: 401, data: { error: "INVALID_CREDENTIALS" } } });
    await expect(
      apiClient.post("/auth/login", { email: "ninguem@example.com", password: "x" }),
    ).rejects.toMatchObject({ response: { status: 401 } });
    expect(signatures(calls)).toEqual(["POST /auth/login", "POST /auth/login", "POST /auth/login"]);
  });

  it("recusa a renovação sem refresh válido", async () => {
    await expect(apiClient.post("/auth/refresh")).rejects.toMatchObject({
      response: { status: 401, data: { error: "INVALID_REFRESH_TOKEN" } },
    });
  });

  it("recusa a renovação quando o dono do refresh não existe mais", async () => {
    seedDb({ session: { userId: "fantasma" } });

    await expect(apiClient.post("/auth/refresh")).rejects.toMatchObject({
      response: { status: 401 },
    });
    expect(db.session).toBeNull();
  });

  it("logout apaga o refresh do servidor", async () => {
    loginAs();

    const response = await apiClient.post("/auth/logout");

    expect(response.status).toBe(204);
    expect(db.session).toBeNull();
  });

  it("logout-all exige Bearer e apaga o refresh", async () => {
    loginAs();

    const response = await apiClient.post("/auth/logout-all");

    expect(response.status).toBe(204);
    expect(db.session).toBeNull();
  });

  // `fetch` direto: pelo apiClient, o 401 de `/users/me` dispararia a renovação.
  it.each([
    ["POST", "/auth/logout-all"],
    ["GET", "/users/me"],
  ])("%s %s responde 401 sem Bearer válido", async (method, path) => {
    seedDb({ users: [makeUser()] });

    for (const authorization of ["Bearer outro", "Bearer access-desconhecido-1", ""]) {
      const response = await fetch(url(path), { method, headers: { authorization } });
      expect(response.status).toBe(401);
      expect(await response.json()).toEqual({
        error: "UNAUTHORIZED",
        message: "Authentication required",
      });
    }
  });

  it("não registra mais GET /users/:id", () => {
    const routes = server
      .listHandlers()
      .flatMap((handler) =>
        "info" in handler && "header" in handler.info ? [handler.info.header] : [],
      );

    expect(routes).toContain(`GET ${url("/users/me")}`);
    expect(routes).not.toContain(`GET ${url("/users/:id")}`);
  });
});

describe("harness: QueryClientProvider", () => {
  it("roda um hook de feature de ponta a ponta contra o MSW", async () => {
    seedDb({ categories: [makeCategoryWithCount({ name: "Alimentação" })] });

    const { result } = renderHookWithProviders(() => useCategories());

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toHaveLength(1);
    expect(result.current.data?.[0].name).toBe("Alimentação");
  });

  it("isola o store entre testes", () => {
    // O afterEach global chamou resetDb(): nada sobrou do teste anterior.
    expect(db.categories).toHaveLength(0);
  });
});
