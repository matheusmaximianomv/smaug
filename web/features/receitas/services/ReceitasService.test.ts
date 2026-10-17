import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { db, mockApiError, seedDb } from "../../../tests/msw";
import {
  makeFixedRevenue,
  makeFixedRevenueVersion,
  makeOneTimeRevenue,
} from "../../../tests/fixtures";
import { bodyOf, recordRequests, signatures } from "../../../tests/requests";
import { freezeDateOnly, unfreezeTime } from "../../../tests/time";
import { ReceitasService } from "./ReceitasService";

const ONE_TIME_PAYLOAD = {
  description: "Freelance",
  amount: 1500,
  competenceYear: 2026,
  competenceMonth: 9,
};

describe("receitas avulsas", () => {
  it("createOneTime faz POST em /revenues/one-time com o payload", async () => {
    const calls = recordRequests();

    const created = await ReceitasService.createOneTime(ONE_TIME_PAYLOAD);

    expect(signatures(calls)).toEqual(["POST /revenues/one-time"]);
    expect(await bodyOf(calls[0])).toEqual(ONE_TIME_PAYLOAD);
    expect(created).toMatchObject(ONE_TIME_PAYLOAD);
    expect(db.oneTimeRevenues).toHaveLength(1);
  });

  it("updateOneTime faz PUT em /revenues/one-time/:id (não PATCH)", async () => {
    const revenue = makeOneTimeRevenue();
    seedDb({ oneTimeRevenues: [revenue] });
    const calls = recordRequests();

    const updated = await ReceitasService.updateOneTime(revenue.id, {
      ...ONE_TIME_PAYLOAD,
      amount: 2000,
    });

    expect(signatures(calls)).toEqual([`PUT /revenues/one-time/${revenue.id}`]);
    expect(updated.amount).toBe(2000);
  });

  it("deleteOneTime faz DELETE em /revenues/one-time/:id", async () => {
    const revenue = makeOneTimeRevenue();
    seedDb({ oneTimeRevenues: [revenue] });
    const calls = recordRequests();

    await ReceitasService.deleteOneTime(revenue.id);

    expect(signatures(calls)).toEqual([`DELETE /revenues/one-time/${revenue.id}`]);
    expect(db.oneTimeRevenues).toHaveLength(0);
  });

  it("propaga o 404 de receita inexistente no update", async () => {
    await expect(ReceitasService.updateOneTime("rev-999", ONE_TIME_PAYLOAD)).rejects.toMatchObject({
      response: { status: 404, data: { error: "REVENUE_NOT_FOUND" } },
    });
  });

  it("propaga erro da API na criação", async () => {
    mockApiError("post", "/revenues/one-time", 409, { error: "PAST_COMPETENCE" });

    await expect(ReceitasService.createOneTime(ONE_TIME_PAYLOAD)).rejects.toMatchObject({
      response: { status: 409, data: { error: "PAST_COMPETENCE" } },
    });
  });
});

describe("receitas fixas", () => {
  const CREATE_PAYLOAD = {
    description: "Salário",
    amount: 8000,
    modality: "ALTERABLE" as const,
    startYear: 2026,
    startMonth: 9,
  };

  it("createFixed faz POST em /revenues/fixed sem endYear/endMonth", async () => {
    const calls = recordRequests();

    const created = await ReceitasService.createFixed(CREATE_PAYLOAD);

    expect(signatures(calls)).toEqual(["POST /revenues/fixed"]);
    expect(await bodyOf(calls[0])).toEqual(CREATE_PAYLOAD);
    expect(created.endYear).toBeNull();
    expect(created.endMonth).toBeNull();
  });

  it("createFixed repassa endYear/endMonth quando informados", async () => {
    const calls = recordRequests();

    const created = await ReceitasService.createFixed({
      ...CREATE_PAYLOAD,
      endYear: 2027,
      endMonth: 3,
    });

    expect(await bodyOf(calls[0])).toMatchObject({ endYear: 2027, endMonth: 3 });
    expect(created).toMatchObject({ endYear: 2027, endMonth: 3 });
  });

  it("addVersion faz PATCH em /revenues/fixed/:id e devolve a VERSÃO, não a receita", async () => {
    const revenue = makeFixedRevenue();
    seedDb({ fixedRevenues: [revenue] });
    const calls = recordRequests();

    const version = await ReceitasService.addVersion(revenue.id, {
      description: "Salário",
      amount: 9000,
      effectiveYear: 2026,
      effectiveMonth: 10,
    });

    expect(signatures(calls)).toEqual([`PATCH /revenues/fixed/${revenue.id}`]);
    expect(version).toMatchObject({
      description: "Salário",
      amount: 9000,
      effectiveYear: 2026,
      effectiveMonth: 10,
    });
    // A resposta é a versão: não carrega os campos da receita.
    expect(version).not.toHaveProperty("modality");
    expect(version).not.toHaveProperty("currentVersion");
  });

  it("addVersion propaga o 409 de versão conflitante", async () => {
    const version = makeFixedRevenueVersion({ effectiveYear: 2026, effectiveMonth: 9 });
    const revenue = makeFixedRevenue({ currentVersion: version, versions: [version] });
    seedDb({ fixedRevenues: [revenue] });

    await expect(
      ReceitasService.addVersion(revenue.id, {
        description: "Salário",
        amount: 9000,
        effectiveYear: 2026,
        effectiveMonth: 9,
      }),
    ).rejects.toMatchObject({ response: { status: 409, data: { error: "VERSION_CONFLICT" } } });
  });

  it("terminate faz PATCH em /revenues/fixed/:id/terminate", async () => {
    const revenue = makeFixedRevenue();
    seedDb({ fixedRevenues: [revenue] });
    const calls = recordRequests();

    const terminated = await ReceitasService.terminate(revenue.id, {
      endYear: 2026,
      endMonth: 12,
    });

    expect(signatures(calls)).toEqual([`PATCH /revenues/fixed/${revenue.id}/terminate`]);
    expect(await bodyOf(calls[0])).toEqual({ endYear: 2026, endMonth: 12 });
    expect(terminated).toMatchObject({ endYear: 2026, endMonth: 12 });
  });

  it("terminate propaga o 404 de receita inexistente", async () => {
    await expect(
      ReceitasService.terminate("fix-999", { endYear: 2026, endMonth: 12 }),
    ).rejects.toMatchObject({
      response: { status: 404, data: { error: "FIXED_REVENUE_NOT_FOUND" } },
    });
  });

  it("deleteFixed faz DELETE em /revenues/fixed/:id", async () => {
    const revenue = makeFixedRevenue();
    seedDb({ fixedRevenues: [revenue] });
    const calls = recordRequests();

    await ReceitasService.deleteFixed(revenue.id);

    expect(signatures(calls)).toEqual([`DELETE /revenues/fixed/${revenue.id}`]);
    expect(db.fixedRevenues).toHaveLength(0);
  });
});

describe("consultas da tela", () => {
  beforeEach(() => freezeDateOnly());
  afterEach(() => unfreezeTime());

  it("getMonth faz GET em /revenues com a competência como query", async () => {
    seedDb({ oneTimeRevenues: [makeOneTimeRevenue()] });
    const calls = recordRequests();

    const month = await ReceitasService.getMonth({ year: 2026, month: 9 });

    expect(signatures(calls)).toEqual(["GET /revenues"]);
    expect(Object.fromEntries(calls[0].search)).toEqual({
      competenceYear: "2026",
      competenceMonth: "9",
    });
    expect(month).toMatchObject({
      competenceStatus: "CURRENT",
      reference: { year: 2026, month: 9 },
    });
    expect(month.oneTimeRevenues).toHaveLength(1);
  });

  it("getYearSummary faz GET em /revenues/summary?year=", async () => {
    const calls = recordRequests();

    const summary = await ReceitasService.getYearSummary(2026);

    expect(signatures(calls)).toEqual(["GET /revenues/summary"]);
    expect(calls[0].search.get("year")).toBe("2026");
    expect(summary.months).toHaveLength(12);
  });

  it("getFixed(id) faz GET em /revenues/fixed/:id com versões e expiração", async () => {
    const revenue = makeFixedRevenue({ endYear: 2026, endMonth: 8 });
    seedDb({ fixedRevenues: [revenue] });
    const calls = recordRequests();

    const detail = await ReceitasService.getFixed(revenue.id);

    expect(signatures(calls)).toEqual([`GET /revenues/fixed/${revenue.id}`]);
    expect(detail).toMatchObject({ isExpired: true, reference: { year: 2026, month: 9 } });
    expect(detail.versions).toHaveLength(1);
  });

  it("getFixed(id) propaga o 404", async () => {
    await expect(ReceitasService.getFixed("fix-999")).rejects.toMatchObject({
      response: { status: 404, data: { error: "FIXED_REVENUE_NOT_FOUND" } },
    });
  });
});
