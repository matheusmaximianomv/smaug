import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { createTestQueryClient, renderHookWithProviders } from "../../../tests/render";
import { mockApiError, server, url } from "../../../tests/msw";
import { makeExpenseQueryPayload, makeRevenueQueryPayload } from "../../../tests/fixtures";
import { recordRequests } from "../../../tests/requests";
import { freezeDateOnly, unfreezeTime } from "../../../tests/time";
import { useDashboard } from "./useDashboard";

function stubConsolidated() {
  server.use(
    http.get(url("/revenues"), () => HttpResponse.json(makeRevenueQueryPayload())),
    http.get(url("/expenses"), () => HttpResponse.json(makeExpenseQueryPayload())),
  );
}

beforeEach(() => {
  freezeDateOnly(new Date("2026-09-13T00:00:00Z"));
  stubConsolidated();
});

afterEach(() => {
  unfreezeTime();
});

describe("useDashboard", () => {
  it("usa a chave ['dashboard', ano, mês] com staleTime de 30 s", async () => {
    const queryClient = createTestQueryClient();
    const { result } = renderHookWithProviders(() => useDashboard({ year: 2026, month: 9 }), {
      queryClient,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const query = queryClient.getQueryCache().find({ queryKey: ["dashboard", 2026, 9] })!;
    expect(query).toBeDefined();
    expect(query.observers[0].options.staleTime).toBe(30_000);
  });

  it("devolve os dados agregados da competência pedida", async () => {
    const { result } = renderHookWithProviders(() => useDashboard({ year: 2026, month: 9 }));

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.competence).toEqual({ year: 2026, month: 9 });
    expect(result.current.data?.status).toBe("current");
  });

  it("ano e mês fazem parte da chave: trocar a competência cria nova entrada de cache", async () => {
    const queryClient = createTestQueryClient();
    const { result, rerender } = renderHookWithProviders(
      ({ month }: { month: number }) => useDashboard({ year: 2026, month }),
      { queryClient, initialProps: { month: 9 } },
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    rerender({ month: 10 });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const keys = queryClient
      .getQueryCache()
      .getAll()
      .map((q) => q.queryKey);
    expect(keys).toContainEqual(["dashboard", 2026, 9]);
    expect(keys).toContainEqual(["dashboard", 2026, 10]);
  });

  it("trocar a competência dispara novas requisições", async () => {
    const calls = recordRequests();
    const { result, rerender } = renderHookWithProviders(
      ({ month }: { month: number }) => useDashboard({ year: 2026, month }),
      { initialProps: { month: 9 } },
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const afterFirst = calls.length;

    rerender({ month: 1 });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(calls.length).toBeGreaterThan(afterFirst);
  });

  it("expõe o erro quando a agregação falha", async () => {
    mockApiError("get", "/expenses", 500, {});
    const { result } = renderHookWithProviders(() => useDashboard({ year: 2026, month: 9 }));

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
