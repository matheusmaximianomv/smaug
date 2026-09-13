import { describe, expect, it, vi } from "vitest";
import { act, waitFor } from "@testing-library/react";
import { createTestQueryClient, renderHookWithProviders } from "../../../tests/render";
import { spyOnToast } from "../../../tests/toast";
import { mockApiError, seedDb } from "../../../tests/msw";
import { makeFixedRevenue } from "../../../tests/fixtures";
import { bodyOf, recordRequests, signatures } from "../../../tests/requests";
import { useFixedRevenues } from "./useFixedRevenues";

const QK = ["revenues", "fixed"];

const CREATE_PAYLOAD = {
  description: "Salário",
  amount: 8000,
  modality: "ALTERABLE" as const,
  startYear: 2026,
  startMonth: 9,
};

function setup() {
  const queryClient = createTestQueryClient();
  const invalidateQueries = vi.spyOn(queryClient, "invalidateQueries");
  const toast = spyOnToast();
  const rendered = renderHookWithProviders(() => useFixedRevenues(), { queryClient });
  return { ...rendered, queryClient, invalidateQueries, toast };
}

function retryFromToast(toast: ReturnType<typeof spyOnToast>) {
  const [, options] = toast.error.mock.calls.at(-1)!;
  expect(options?.action?.label).toBe("Tentar novamente");
  act(() => {
    options!.action!.onClick();
  });
}

describe("useFixedRevenues: query", () => {
  it("usa a chave ['revenues','fixed'] com staleTime de 30 s", async () => {
    const { queryClient, result } = setup();
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const query = queryClient.getQueryCache().find({ queryKey: QK })!;

    expect(query).toBeDefined();
    expect(query.observers[0].options.staleTime).toBe(30_000);
  });

  it("busca a lista em /revenues/fixed", async () => {
    seedDb({ fixedRevenues: [makeFixedRevenue()] });
    const calls = recordRequests();
    const { result } = setup();

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(signatures(calls)).toEqual(["GET /revenues/fixed"]);
    expect(result.current.data).toHaveLength(1);
  });

  it("expõe as 4 mutations", async () => {
    const { result } = setup();
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(typeof result.current.create.mutate).toBe("function");
    expect(typeof result.current.addVersion.mutate).toBe("function");
    expect(typeof result.current.terminate.mutate).toBe("function");
    expect(typeof result.current.remove.mutate).toBe("function");
  });
});

describe("useFixedRevenues: create", () => {
  it("invalida a query e avisa o sucesso", async () => {
    const { result, invalidateQueries, toast } = setup();
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    act(() => result.current.create.mutate(CREATE_PAYLOAD));

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("Receita fixa criada!"));
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: QK });
  });

  it("avisa o erro e o retry redispara", async () => {
    mockApiError("post", "/revenues/fixed", 500, {});
    const { result, toast } = setup();
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const calls = recordRequests();

    act(() => result.current.create.mutate(CREATE_PAYLOAD));
    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith("Erro ao criar receita fixa.", expect.anything()),
    );

    retryFromToast(toast);

    await waitFor(() => expect(toast.error).toHaveBeenCalledTimes(2));
    expect(calls.filter((c) => c.method === "POST")).toHaveLength(2);
  });
});

describe("useFixedRevenues: addVersion", () => {
  const versionPayload = {
    description: "Salário",
    amount: 9000,
    effectiveYear: 2026,
    effectiveMonth: 10,
  };

  it("desestrutura {id, ...payload} e faz PATCH na receita", async () => {
    const revenue = makeFixedRevenue();
    seedDb({ fixedRevenues: [revenue] });
    const { result, invalidateQueries, toast } = setup();
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const calls = recordRequests();

    act(() => result.current.addVersion.mutate({ id: revenue.id, ...versionPayload }));

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("Nova versão criada!"));
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: QK });
    expect(signatures(calls)).toContain(`PATCH /revenues/fixed/${revenue.id}`);
    // O id não pode vazar para o corpo da requisição.
    expect(await bodyOf(calls.find((c) => c.method === "PATCH")!)).toEqual(versionPayload);
  });

  it("avisa o erro e o retry redispara", async () => {
    const { result, toast } = setup();
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const calls = recordRequests();

    act(() => result.current.addVersion.mutate({ id: "fix-999", ...versionPayload }));
    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith("Receita fixa não encontrada.", expect.anything()),
    );

    retryFromToast(toast);

    await waitFor(() => expect(toast.error).toHaveBeenCalledTimes(2));
    expect(calls.filter((c) => c.method === "PATCH")).toHaveLength(2);
  });

  it("usa o fallback quando o erro não tem código mapeado", async () => {
    mockApiError("patch", "/revenues/fixed/fix-1", 500, {});
    const { result, toast } = setup();
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    act(() => result.current.addVersion.mutate({ id: "fix-1", ...versionPayload }));

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith("Erro ao criar versão.", expect.anything()),
    );
  });
});

describe("useFixedRevenues: terminate", () => {
  const endPayload = { endYear: 2026, endMonth: 12 };

  it("desestrutura {id, ...payload} e chama a rota /terminate", async () => {
    const revenue = makeFixedRevenue();
    seedDb({ fixedRevenues: [revenue] });
    const { result, invalidateQueries, toast } = setup();
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const calls = recordRequests();

    act(() => result.current.terminate.mutate({ id: revenue.id, ...endPayload }));

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("Receita fixa encerrada!"));
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: QK });
    expect(signatures(calls)).toContain(`PATCH /revenues/fixed/${revenue.id}/terminate`);
    expect(await bodyOf(calls.find((c) => c.method === "PATCH")!)).toEqual(endPayload);
  });

  it("avisa o erro e o retry redispara", async () => {
    mockApiError("patch", "/revenues/fixed/fix-1/terminate", 500, {});
    const { result, toast } = setup();
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const calls = recordRequests();

    act(() => result.current.terminate.mutate({ id: "fix-1", ...endPayload }));
    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith("Erro ao encerrar receita.", expect.anything()),
    );

    retryFromToast(toast);

    await waitFor(() => expect(toast.error).toHaveBeenCalledTimes(2));
    expect(calls.filter((c) => c.method === "PATCH")).toHaveLength(2);
  });
});

describe("useFixedRevenues: remove", () => {
  it("invalida a query e avisa o sucesso", async () => {
    const revenue = makeFixedRevenue();
    seedDb({ fixedRevenues: [revenue] });
    const { result, invalidateQueries, toast } = setup();
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    act(() => result.current.remove.mutate(revenue.id));

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("Receita fixa excluída!"));
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: QK });
  });

  it("avisa o erro e o retry redispara com o mesmo id", async () => {
    mockApiError("delete", "/revenues/fixed/fix-1", 500, {});
    const { result, toast } = setup();
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const calls = recordRequests();

    act(() => result.current.remove.mutate("fix-1"));
    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith("Erro ao excluir receita fixa.", expect.anything()),
    );

    retryFromToast(toast);

    await waitFor(() => expect(toast.error).toHaveBeenCalledTimes(2));
    expect(calls.filter((c) => c.path === "/revenues/fixed/fix-1")).toHaveLength(2);
  });
});
