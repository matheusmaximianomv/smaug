import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { waitFor } from "@testing-library/react";
import { renderHookWithProviders } from "../../../tests/render";
import { mockApiError, seedDb } from "../../../tests/msw";
import { makeFixedRevenue, makeFixedRevenueVersion } from "../../../tests/fixtures";
import { freezeDateOnly, unfreezeTime } from "../../../tests/time";
import { toSeriesModel, useFixedRevenue } from "./useFixedRevenue";

beforeEach(() => freezeDateOnly());
afterEach(() => unfreezeTime());

describe("useFixedRevenue: detalhe", () => {
  it("busca a fixa por id e a normaliza; alterável aceita versões", async () => {
    const v1 = makeFixedRevenueVersion({ amount: 5000, effectiveYear: 2026, effectiveMonth: 1 });
    const revenue = makeFixedRevenue({
      startYear: 2026,
      startMonth: 1,
      endYear: 2026,
      endMonth: 12,
      currentVersion: v1,
      versions: [v1],
    });
    seedDb({ fixedRevenues: [revenue] });
    const { result, queryClient } = renderHookWithProviders(() => useFixedRevenue(revenue.id));

    await waitFor(() => expect(result.current.series).toBeDefined());

    expect(queryClient.getQueryData(["revenues", "fixed", revenue.id])).toBeDefined();
    expect(result.current.series).toMatchObject({
      start: { year: 2026, month: 1 },
      end: { year: 2026, month: 12 },
      allowsVersions: true,
      currentVersionId: v1.id,
    });
  });

  it("inalterável não aceita versões e a vigente basta sem lista", () => {
    const series = toSeriesModel(makeFixedRevenue({ modality: "UNALTERABLE" }));

    expect(series.allowsVersions).toBe(false);
    expect(series.end).toBeNull();
    expect(series.versions).toHaveLength(1);
  });

  it("expõe a mensagem pt-BR do erro", async () => {
    mockApiError("get", "/revenues/fixed/fix-1", 404, { error: "FIXED_REVENUE_NOT_FOUND" });
    const { result } = renderHookWithProviders(() => useFixedRevenue("fix-1"));

    await waitFor(() => expect(result.current.errorMessage).toBe("Receita fixa não encontrada."));
  });
});
