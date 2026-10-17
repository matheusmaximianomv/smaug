import { describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { z } from "zod";
import { useSeriesActions, type SeriesModel } from "./useSeriesActions";

const c = (month: number, year = 2026) => ({ year, month });

const SERIES: SeriesModel = {
  start: c(1),
  end: null,
  isExpired: false,
  reference: c(4),
  versions: [
    {
      id: "v2",
      effective: c(5),
      amount: 120,
      description: "Aluguel novo",
      categoryId: "cat",
      categoryName: "Moradia",
    },
    {
      id: "v1",
      effective: c(1),
      amount: 100,
      description: "Aluguel",
      categoryId: "cat",
      categoryName: "Moradia",
    },
  ],
  currentVersionId: "v1",
  allowsVersions: true,
};

const versionSchema = z.object({
  description: z.string().min(1, "Obrigatório"),
  amount: z.string().min(1, "Valor inválido"),
  categoryId: z.string(),
  from: z.object({ year: z.number(), month: z.number() }).refine((v) => v.month >= 4, "Passada"),
});
const endSchema = z.object({
  last: z.object({ year: z.number(), month: z.number() }).refine((v) => v.month >= 1, "Antes"),
});

function setup(series: Partial<SeriesModel> = {}, kind: "recorrente" | "fixa" = "recorrente") {
  return renderHook(() =>
    useSeriesActions({ series: { ...SERIES, ...series }, kind, versionSchema, endSchema }),
  );
}

describe("useSeriesActions: visualização", () => {
  it("começa em view, na aba linha do tempo, com as ações permitidas", () => {
    const { result } = setup();

    expect(result.current.mode).toBe("view");
    expect(result.current.tab).toBe("timeline");
    expect(result.current.can).toEqual({ version: true, end: true });
    expect(result.current.current.id).toBe("v1");
  });

  it("monta a linha do tempo até o mês corrente + 8 com continua…", () => {
    const { result } = setup();
    const { cells, trailing } = result.current.timeline;

    expect(cells).toHaveLength(12);
    expect(cells.filter((cell) => cell.value).map((cell) => [cell.month, cell.value])).toEqual([
      ["Jan/26", "100,00"],
      ["Mai/26", "120,00"],
    ]);
    expect(cells[0].color).not.toBe(cells[4].color);
    expect(cells.find((cell) => cell.isReference)?.month).toBe("Abr/26");
    expect(trailing).toBe("continua…");
  });

  it("lista chips em ordem cronológica e o histórico do mais recente ao mais antigo", () => {
    const { result } = setup();

    expect(result.current.chips.map((chip) => [chip.since, chip.isCurrent])).toEqual([
      ["desde Jan/26", true],
      ["desde Mai/26", false],
    ]);
    expect(result.current.history.map((row) => [row.from, row.amount, row.detail])).toEqual([
      ["A partir de Mai/26", "R$ 120,00/mês", "Moradia"],
      ["A partir de Jan/26", "R$ 100,00/mês", "Moradia"],
    ]);
  });

  it("troca de aba", () => {
    const { result } = setup();

    act(() => result.current.setTab("history"));

    expect(result.current.tab).toBe("history");
  });

  it("bloqueia Nova versão e Encerrar em série expirada, e Nova versão em fixa inalterável", () => {
    expect(setup({ isExpired: true, end: c(2) }).result.current.can).toEqual({
      version: false,
      end: false,
    });
    expect(setup({ allowsVersions: false }, "fixa").result.current.can).toEqual({
      version: false,
      end: true,
    });
  });

  it("usa a primeira versão quando a vigente não está na lista", () => {
    expect(setup({ currentVersionId: "x" }).result.current.current.id).toBe("v2");
  });
});

describe("useSeriesActions: nova versão", () => {
  it("preenche com a versão vigente e vigência no mês seguinte ao corrente", () => {
    const { result } = setup();

    act(() => result.current.openVersion());

    expect(result.current.mode).toBe("version");
    expect(result.current.version.values).toEqual({
      description: "Aluguel",
      amount: "100,00",
      categoryId: "cat",
      from: c(5),
    });
  });

  it("deixa a categoria vazia quando a versão não tem categoria (receita)", () => {
    const { result } = setup(
      {
        versions: [{ id: "v1", effective: c(1), amount: 100, description: "Salário" }],
      },
      "fixa",
    );

    act(() => result.current.openVersion());

    expect(result.current.version.values.categoryId).toBe("");
  });

  it("listra a prévia a partir da vigência com o novo valor e estende a linha", () => {
    const { result } = setup({ end: c(6) });
    act(() => result.current.openVersion());
    act(() => result.current.version.set("amount", "130"));
    act(() => result.current.version.set("from", c(6)));

    const { cells, trailing } = result.current.timeline;
    const added = cells.filter((cell) => cell.state === "new");

    expect(added.map((cell) => cell.month)).toEqual(["Jun/26", "Jul/26", "Ago/26", "Set/26"]);
    expect(added[0]).toMatchObject({ value: "130,00", color: "#6841c7" });
    expect(trailing).toBeUndefined();
  });

  it("usa zero na prévia enquanto o valor digitado é inválido", () => {
    const { result } = setup();
    act(() => result.current.openVersion());
    act(() => result.current.version.set("amount", "abc"));

    expect(result.current.timeline.cells.find((cell) => cell.state === "new")?.value).toBe("0,00");
  });

  it("valida pelo schema e só chama onValid sem erros", () => {
    const onValid = vi.fn();
    const { result } = setup();
    act(() => result.current.openVersion());
    act(() => result.current.version.set("description", ""));
    act(() => result.current.version.set("from", c(3)));

    act(() => result.current.submitVersion(onValid));
    expect(result.current.errors).toEqual({ description: "Obrigatório", from: "Passada" });
    expect(onValid).not.toHaveBeenCalled();

    act(() => result.current.version.set("description", "Aluguel"));
    act(() => result.current.version.set("from", c(5)));
    act(() => result.current.submitVersion(onValid));

    expect(result.current.errors).toEqual({});
    expect(onValid).toHaveBeenCalledWith({
      description: "Aluguel",
      amount: "100,00",
      categoryId: "cat",
      from: c(5),
    });
  });
});

describe("useSeriesActions: encerrar e confirmar", () => {
  it("abre o encerramento no mês corrente e hachura os meses seguintes na prévia", () => {
    const { result } = setup();
    act(() => result.current.openEnd());

    expect(result.current.end.last).toEqual(c(4));
    act(() => result.current.end.setLast(c(6)));

    const cut = result.current.timeline.cells.filter((cell) => cell.state === "cut");
    expect(cut[0].month).toBe("Jul/26");
    expect(cut.every((cell) => cell.value === "")).toBe(true);
  });

  it("valida o encerramento e entrega o último mês", () => {
    const onValid = vi.fn();
    const strict = z.object({
      last: z.object({ year: z.number(), month: z.number() }).refine(() => false, "Antes"),
    });
    const { result } = renderHook(() =>
      useSeriesActions({ series: SERIES, kind: "recorrente", versionSchema, endSchema: strict }),
    );
    act(() => result.current.openEnd());
    act(() => result.current.submitEnd(onValid));
    expect(result.current.errors).toEqual({ last: "Antes" });

    const ok = setup();
    act(() => ok.result.current.openEnd());
    act(() => ok.result.current.submitEnd(onValid));
    expect(onValid).toHaveBeenCalledWith({ last: c(4) });
  });

  it("entra em confirmação e volta à visualização limpando erros", () => {
    const { result } = setup();
    act(() => result.current.openConfirm());
    expect(result.current.mode).toBe("confirm");

    act(() => result.current.back());
    expect(result.current.mode).toBe("view");
    expect(result.current.errors).toEqual({});
  });

  it("deixa sem cor o mês anterior à primeira versão", () => {
    const { result } = setup({
      start: c(1),
      versions: [{ id: "v1", effective: c(3), amount: 10, description: "x" }],
      currentVersionId: "v1",
    });

    expect(result.current.timeline.cells[0].color).toBeUndefined();
  });
});
