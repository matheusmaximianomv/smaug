import { describe, expect, it, vi } from "vitest";
import { act, waitFor } from "@testing-library/react";
import { createTestQueryClient, renderHookWithProviders } from "../../../tests/render";
import { spyOnToast } from "../../../tests/toast";
import { mockApiError, seedDb } from "../../../tests/msw";
import { makeOneTimeRevenue } from "../../../tests/fixtures";
import { recordRequests, signatures } from "../../../tests/requests";
import { useOneTimeRevenues } from "./useOneTimeRevenues";

const QK = ["revenues", "one-time"];

const PAYLOAD = {
  description: "Freelance",
  amount: 1500,
  competenceYear: 2026,
  competenceMonth: 9,
};

function setup() {
  const queryClient = createTestQueryClient();
  const invalidateQueries = vi.spyOn(queryClient, "invalidateQueries");
  const toast = spyOnToast();
  const rendered = renderHookWithProviders(() => useOneTimeRevenues(), { queryClient });
  return { ...rendered, queryClient, invalidateQueries, toast };
}

function retryFromToast(toast: ReturnType<typeof spyOnToast>) {
  const [, options] = toast.error.mock.calls.at(-1)!;
  expect(options?.action?.label).toBe("Tentar novamente");
  act(() => {
    options!.action!.onClick();
  });
}

describe("useOneTimeRevenues: query", () => {
  it("usa a chave ['revenues','one-time'] com staleTime de 30 s", async () => {
    const { queryClient, result } = setup();
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const query = queryClient.getQueryCache().find({ queryKey: QK })!;

    expect(query).toBeDefined();
    expect(query.observers[0].options.staleTime).toBe(30_000);
  });

  it("busca a lista em /revenues/one-time", async () => {
    seedDb({ oneTimeRevenues: [makeOneTimeRevenue({ description: "Freelance" })] });
    const calls = recordRequests();
    const { result } = setup();

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(signatures(calls)).toEqual(["GET /revenues/one-time"]);
    expect(result.current.data?.[0].description).toBe("Freelance");
  });
});

describe("useOneTimeRevenues: create", () => {
  it("invalida a query e avisa o sucesso", async () => {
    const { result, invalidateQueries, toast } = setup();
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    act(() => result.current.create.mutate(PAYLOAD));

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("Receita avulsa criada!"));
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: QK });
  });

  it("avisa o erro e o retry redispara com as mesmas variáveis", async () => {
    mockApiError("post", "/revenues/one-time", 500, {});
    const { result, toast } = setup();
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const calls = recordRequests();

    act(() => result.current.create.mutate(PAYLOAD));
    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith("Erro ao criar receita avulsa.", expect.anything()),
    );

    retryFromToast(toast);

    await waitFor(() => expect(toast.error).toHaveBeenCalledTimes(2));
    expect(calls.filter((c) => c.method === "POST")).toHaveLength(2);
  });
});

describe("useOneTimeRevenues: update", () => {
  it("desestrutura {id, ...payload} e avisa o sucesso", async () => {
    const revenue = makeOneTimeRevenue();
    seedDb({ oneTimeRevenues: [revenue] });
    const { result, invalidateQueries, toast } = setup();
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const calls = recordRequests();

    act(() => result.current.update.mutate({ id: revenue.id, ...PAYLOAD }));

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("Receita avulsa atualizada!"));
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: QK });
    expect(signatures(calls)).toContain(`PUT /revenues/one-time/${revenue.id}`);
  });

  it("avisa o erro e o retry redispara", async () => {
    const { result, toast } = setup();
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const calls = recordRequests();

    act(() => result.current.update.mutate({ id: "rev-999", ...PAYLOAD }));
    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith("Receita não encontrada.", expect.anything()),
    );

    retryFromToast(toast);

    await waitFor(() => expect(toast.error).toHaveBeenCalledTimes(2));
    expect(calls.filter((c) => c.method === "PUT")).toHaveLength(2);
  });

  it("usa o fallback quando o erro não tem código mapeado", async () => {
    mockApiError("put", "/revenues/one-time/rev-1", 500, {});
    const { result, toast } = setup();
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    act(() => result.current.update.mutate({ id: "rev-1", ...PAYLOAD }));

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(
        "Erro ao atualizar receita avulsa.",
        expect.anything(),
      ),
    );
  });
});

describe("useOneTimeRevenues: remove", () => {
  it("invalida a query e avisa o sucesso", async () => {
    const revenue = makeOneTimeRevenue();
    seedDb({ oneTimeRevenues: [revenue] });
    const { result, invalidateQueries, toast } = setup();
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    act(() => result.current.remove.mutate(revenue.id));

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("Receita avulsa excluída!"));
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: QK });
  });

  it("avisa o erro e o retry redispara com o mesmo id", async () => {
    mockApiError("delete", "/revenues/one-time/rev-1", 500, {});
    const { result, toast } = setup();
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const calls = recordRequests();

    act(() => result.current.remove.mutate("rev-1"));
    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(
        "Erro ao excluir receita avulsa.",
        expect.anything(),
      ),
    );

    retryFromToast(toast);

    await waitFor(() => expect(toast.error).toHaveBeenCalledTimes(2));
    expect(calls.filter((c) => c.path === "/revenues/one-time/rev-1")).toHaveLength(2);
  });
});
