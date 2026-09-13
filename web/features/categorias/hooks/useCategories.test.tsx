import { describe, expect, it, vi } from "vitest";
import { act, waitFor } from "@testing-library/react";
import { createTestQueryClient, renderHookWithProviders } from "../../../tests/render";
import { spyOnToast } from "../../../tests/toast";
import { mockApiError, seedDb } from "../../../tests/msw";
import { makeCategoryWithCount } from "../../../tests/fixtures";
import { bodyOf, recordRequests, signatures } from "../../../tests/requests";
import { useCategories } from "./useCategories";

/**
 * Template canônico dos testes de hook de feature. Os demais hooks repetem esta
 * estrutura: chave da query, ciclo loading→sucesso, e para cada mutation a
 * tripla invalidação + toast de sucesso + toast de erro com retry funcional.
 */
const QK = ["categories"];

function setup() {
  const queryClient = createTestQueryClient();
  const invalidateQueries = vi.spyOn(queryClient, "invalidateQueries");
  const toast = spyOnToast();
  const rendered = renderHookWithProviders(() => useCategories(), { queryClient });
  return { ...rendered, queryClient, invalidateQueries, toast };
}

/** Dispara a action "Tentar novamente" do último toast de erro. */
function retryFromToast(toast: ReturnType<typeof spyOnToast>) {
  const [, options] = toast.error.mock.calls.at(-1)!;
  expect(options?.action?.label).toBe("Tentar novamente");
  act(() => {
    options!.action!.onClick();
  });
}

describe("useCategories: query", () => {
  it("usa a chave ['categories'] e staleTime de 30 s", async () => {
    const { queryClient, result } = setup();
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const query = queryClient.getQueryCache().find({ queryKey: QK })!;

    expect(query).toBeDefined();
    expect(query.observers[0].options.staleTime).toBe(30_000);
  });

  it("busca a lista em /expenses/categories", async () => {
    const calls = recordRequests();
    const { result } = setup();

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(signatures(calls)).toEqual(["GET /expenses/categories"]);
  });

  it("passa de carregando para sucesso com os dados", async () => {
    seedDb({ categories: [makeCategoryWithCount({ name: "Moradia" })] });
    const { result } = setup();

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.[0].name).toBe("Moradia");
  });

  it("expõe o erro quando a busca falha", async () => {
    mockApiError("get", "/expenses/categories", 500, {});
    const { result } = setup();

    await waitFor(() => expect(result.current.isError).toBe(true));
  });

  it("expõe create, update e remove ao lado do resultado da query", async () => {
    const { result } = setup();
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(typeof result.current.create.mutate).toBe("function");
    expect(typeof result.current.update.mutate).toBe("function");
    expect(typeof result.current.remove.mutate).toBe("function");
    expect(result.current.data).toEqual([]);
  });
});

describe("useCategories: create", () => {
  it("invalida a query e avisa o sucesso", async () => {
    const { result, invalidateQueries, toast } = setup();
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    act(() => result.current.create.mutate("Moradia"));

    await waitFor(() =>
      expect(toast.success).toHaveBeenCalledWith("Categoria criada com sucesso!"),
    );
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: QK });
  });

  it("avisa o erro com a mensagem mapeada e a action de retry", async () => {
    seedDb({ categories: [makeCategoryWithCount({ name: "Moradia" })] });
    const { result, toast } = setup();
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    act(() => result.current.create.mutate("Moradia"));

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(
        "Já existe uma categoria com este nome.",
        expect.objectContaining({
          action: { label: "Tentar novamente", onClick: expect.any(Function) },
        }),
      ),
    );
  });

  it("usa o fallback quando o erro não tem código mapeado", async () => {
    mockApiError("post", "/expenses/categories", 500, {});
    const { result, toast } = setup();
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    act(() => result.current.create.mutate("Moradia"));

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith("Erro ao criar categoria.", expect.anything()),
    );
  });

  it("a action de retry redispara a mutation com as MESMAS variáveis", async () => {
    mockApiError("post", "/expenses/categories", 500, {});
    const { result, toast } = setup();
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const calls = recordRequests();

    act(() => result.current.create.mutate("Moradia"));
    await waitFor(() => expect(toast.error).toHaveBeenCalledTimes(1));

    retryFromToast(toast);

    await waitFor(() => expect(toast.error).toHaveBeenCalledTimes(2));
    const posts = calls.filter((c) => c.method === "POST");
    expect(posts).toHaveLength(2);
    expect(await bodyOf(posts[0])).toEqual({ name: "Moradia" });
    expect(await bodyOf(posts[1])).toEqual({ name: "Moradia" });
  });
});

describe("useCategories: update", () => {
  it("invalida a query e avisa o sucesso", async () => {
    const category = makeCategoryWithCount({ name: "Moradia" });
    seedDb({ categories: [category] });
    const { result, invalidateQueries, toast } = setup();
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    act(() => result.current.update.mutate({ id: category.id, name: "Casa" }));

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("Categoria atualizada!"));
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: QK });
  });

  it("avisa o erro e o retry reenvia as mesmas variáveis", async () => {
    const { result, toast } = setup();
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const calls = recordRequests();

    act(() => result.current.update.mutate({ id: "cat-999", name: "Casa" }));
    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith("Categoria não encontrada.", expect.anything()),
    );

    retryFromToast(toast);

    await waitFor(() => expect(toast.error).toHaveBeenCalledTimes(2));
    expect(calls.filter((c) => c.method === "PUT")).toHaveLength(2);
    expect(calls.filter((c) => c.path === "/expenses/categories/cat-999")).toHaveLength(2);
  });

  it("usa o fallback quando o erro não tem código mapeado", async () => {
    mockApiError("put", "/expenses/categories/cat-1", 500, {});
    const { result, toast } = setup();
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    act(() => result.current.update.mutate({ id: "cat-1", name: "Casa" }));

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith("Erro ao atualizar categoria.", expect.anything()),
    );
  });
});

describe("useCategories: remove", () => {
  it("invalida a query e avisa o sucesso", async () => {
    const category = makeCategoryWithCount();
    seedDb({ categories: [category] });
    const { result, invalidateQueries, toast } = setup();
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    act(() => result.current.remove.mutate(category.id));

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("Categoria excluída!"));
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: QK });
  });

  it("avisa o erro de categoria com despesas vinculadas", async () => {
    const category = makeCategoryWithCount({ linkedExpensesCount: 2 });
    seedDb({ categories: [category] });
    const { result, toast } = setup();
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    act(() => result.current.remove.mutate(category.id));

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(
        "Esta categoria possui despesas vinculadas e não pode ser excluída.",
        expect.anything(),
      ),
    );
  });

  it("usa o fallback e o retry reenvia o mesmo id", async () => {
    mockApiError("delete", "/expenses/categories/cat-1", 500, {});
    const { result, toast } = setup();
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const calls = recordRequests();

    act(() => result.current.remove.mutate("cat-1"));
    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith("Erro ao excluir categoria.", expect.anything()),
    );

    retryFromToast(toast);

    await waitFor(() => expect(toast.error).toHaveBeenCalledTimes(2));
    expect(calls.filter((c) => c.path === "/expenses/categories/cat-1")).toHaveLength(2);
  });
});
