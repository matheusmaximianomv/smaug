import { beforeEach, describe, expect, it, vi } from "vitest";
import { http, HttpResponse } from "msw";
import { mockApiError, mockNetworkError, server, url } from "../tests/msw";
import { loginAs } from "../tests/session";

/**
 * `window.location` é não-configurável no jsdom 29: o único jeito de observar o
 * redirect de sessão expirada é pela costura `@/infra/navigation`.
 */
vi.mock("@/infra/navigation", () => ({ redirectToLogin: vi.fn() }));

const { apiClient } = await import("./api-client");
const { redirectToLogin } = await import("./navigation");
const { getUserId } = await import("./session");

const PING = "/expenses/categories";

let seenHeaders: Headers | null = null;

beforeEach(() => {
  seenHeaders = null;
  server.use(
    http.get(url(PING), ({ request }) => {
      seenHeaders = request.headers;
      return HttpResponse.json([]);
    }),
  );
});

describe("interceptor de request", () => {
  it("injeta X-User-Id a partir do cookie de sessão", async () => {
    const userId = loginAs();

    await apiClient.get(PING);

    expect(seenHeaders!.get("x-user-id")).toBe(userId);
  });

  it("omite X-User-Id quando não há sessão", async () => {
    await apiClient.get(PING);

    expect(seenHeaders!.get("x-user-id")).toBeNull();
  });

  it("usa NEXT_PUBLIC_API_URL como baseURL", () => {
    expect(apiClient.defaults.baseURL).toBe("http://localhost:3000");
  });

  it("respeita outro valor de NEXT_PUBLIC_API_URL", async () => {
    // O baseURL é resolvido em tempo de avaliação do módulo: para observar outro
    // valor é preciso reimportar o módulo com a env já trocada.
    vi.resetModules();
    vi.stubEnv("NEXT_PUBLIC_API_URL", "http://api.exemplo.test");

    const { apiClient: fresh } = await import("./api-client");

    expect(fresh.defaults.baseURL).toBe("http://api.exemplo.test");
  });

  it("cai no host local quando NEXT_PUBLIC_API_URL está vazio", async () => {
    vi.resetModules();
    vi.stubEnv("NEXT_PUBLIC_API_URL", "");

    const { apiClient: fresh } = await import("./api-client");

    expect(fresh.defaults.baseURL).toBe("http://localhost:3000");
  });

  it("envia Content-Type application/json nas requisições com corpo", async () => {
    let contentType: string | null = null;
    server.use(
      http.post(url("/expenses/categories"), ({ request }) => {
        contentType = request.headers.get("content-type");
        return HttpResponse.json({}, { status: 201 });
      }),
    );

    await apiClient.post("/expenses/categories", { name: "Moradia" });

    expect(contentType).toBe("application/json");
    expect(apiClient.defaults.headers["Content-Type"]).toBe("application/json");
  });
});

describe("interceptor de response", () => {
  it("encerra a sessão e redireciona para o login em 401", async () => {
    loginAs();
    mockApiError("get", PING, 401, { error: "UNAUTHORIZED" });

    await expect(apiClient.get(PING)).rejects.toMatchObject({ response: { status: 401 } });

    expect(getUserId()).toBeNull();
    expect(redirectToLogin).toHaveBeenCalledTimes(1);
  });

  it("preserva a sessão em 404", async () => {
    const userId = loginAs();
    mockApiError("get", PING, 404, { error: "USER_NOT_FOUND" });

    await expect(apiClient.get(PING)).rejects.toMatchObject({ response: { status: 404 } });

    expect(getUserId()).toBe(userId);
    expect(redirectToLogin).not.toHaveBeenCalled();
  });

  it("preserva a sessão em 500", async () => {
    const userId = loginAs();
    mockApiError("get", PING, 500, {});

    await expect(apiClient.get(PING)).rejects.toMatchObject({ response: { status: 500 } });

    expect(getUserId()).toBe(userId);
    expect(redirectToLogin).not.toHaveBeenCalled();
  });

  it("preserva a sessão em falha de rede", async () => {
    const userId = loginAs();
    mockNetworkError("get", PING);

    const error = await apiClient.get(PING).catch((e) => e);

    expect(error.response).toBeUndefined();
    expect(getUserId()).toBe(userId);
    expect(redirectToLogin).not.toHaveBeenCalled();
  });

  it("repassa a resposta de sucesso sem alterar", async () => {
    const response = await apiClient.get(PING);

    expect(response.status).toBe(200);
    expect(response.data).toEqual([]);
  });

  it("rejeita o erro para quem chamou mesmo após deslogar", async () => {
    loginAs();
    mockApiError("get", PING, 401, { error: "UNAUTHORIZED" });

    await expect(apiClient.get(PING)).rejects.toThrowError();
  });
});
