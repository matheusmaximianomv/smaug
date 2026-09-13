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
import { db, mockApiError, seedDb } from "./msw";
import { makeCategoryWithCount } from "./fixtures";
import { loginAs } from "./session";

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

  it("injeta X-User-Id a partir do cookie de sessão", async () => {
    const userId = loginAs();
    seedDb({ categories: [] });

    let seen: string | null = null;
    const { server, url } = await import("./msw");
    const { http, HttpResponse } = await import("msw");
    server.use(
      http.get(url("/expenses/categories"), ({ request }) => {
        seen = request.headers.get("x-user-id");
        return HttpResponse.json([]);
      }),
    );

    await apiClient.get("/expenses/categories");

    expect(seen).toBe(userId);
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
