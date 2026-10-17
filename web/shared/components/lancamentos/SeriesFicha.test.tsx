import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { z } from "zod";
import { useSeriesActions, type SeriesModel } from "../../hooks/useSeriesActions";
import { SeriesFicha } from "./SeriesFicha";

const c = (month: number, year = 2026) => ({ year, month });

const SERIES: SeriesModel = {
  start: c(1),
  end: null,
  isExpired: false,
  reference: c(4),
  versions: [
    { id: "v1", effective: c(1), amount: 100, description: "Aluguel" },
    { id: "v2", effective: c(3), amount: 150, description: "Aluguel" },
  ],
  currentVersionId: "v2",
  allowsVersions: true,
};

const versionSchema = z.object({
  description: z.string(),
  amount: z.string(),
  categoryId: z.string(),
  from: z.any(),
});
const endSchema = z.object({ last: z.any() });

interface HarnessProps {
  series?: Partial<SeriesModel>;
  notes?: string[];
  handlers?: Partial<Record<"onClose" | "onCreateVersion" | "onEnd" | "onRemove", () => void>>;
}

function Harness({ series, notes = [], handlers = {} }: HarnessProps) {
  const actions = useSeriesActions({
    series: { ...SERIES, ...series },
    kind: "recorrente",
    versionSchema,
    endSchema,
  });
  return (
    <SeriesFicha
      kind="recorrente"
      tone="expense"
      title="Aluguel"
      subtitle={["Moradia", "Jan/26 → em aberto"]}
      actions={actions}
      notes={notes}
      hints={{ version: "Vale a partir do mês.", end: "Encerra ao final do mês." }}
      versionFields={
        <label>
          Campo da versão
          <input />
        </label>
      }
      endLabel="Encerrar despesa"
      confirm={{ title: "Remover despesa?", message: 'Excluir a despesa recorrente "Aluguel"?' }}
      isPending={false}
      onClose={handlers.onClose ?? vi.fn()}
      onCreateVersion={handlers.onCreateVersion ?? vi.fn()}
      onEnd={handlers.onEnd ?? vi.fn()}
      onRemove={handlers.onRemove ?? vi.fn()}
    />
  );
}

const ficha = () => screen.getByRole("dialog", { name: "Aluguel" });

describe("SeriesFicha em visualização", () => {
  it("mostra cabeçalho, linha do tempo, chips e as ações de série vigente", () => {
    render(<Harness notes={["Nota da série."]} />);

    expect(within(ficha()).getAllByText("R$ 150,00")).toHaveLength(2);
    expect(within(ficha()).getByText("por mês · valor vigente")).toBeInTheDocument();
    expect(within(ficha()).getByText("Jan/26 → em aberto")).toBeInTheDocument();
    expect(within(ficha()).getByRole("list", { name: "Linha do tempo" })).toBeInTheDocument();
    expect(within(ficha()).getByText("continua…")).toBeInTheDocument();
    expect(within(ficha()).getByText("Nota da série.")).toBeInTheDocument();
    expect(within(ficha()).getByRole("button", { name: "Remover" })).toBeInTheDocument();
    expect(within(ficha()).getByRole("button", { name: "Encerrar" })).toBeInTheDocument();
    expect(within(ficha()).getByRole("button", { name: "Nova versão" })).toBeInTheDocument();
    // Só o × do cabeçalho: o "Fechar" do rodapé aparece quando não há ação.
    expect(within(ficha()).getAllByRole("button", { name: "Fechar" })).toHaveLength(1);
  });

  it("abre a aba Histórico com a contagem de versões", async () => {
    render(<Harness />);

    await userEvent.click(within(ficha()).getByRole("tab", { name: "Histórico (2)" }));

    expect(within(ficha()).getByRole("list", { name: "Histórico de versões" })).toBeInTheDocument();
    expect(within(ficha()).queryByRole("list", { name: "Linha do tempo" })).toBeNull();
  });

  it('oferece só Remover e "Fechar" numa série expirada', async () => {
    const onClose = vi.fn();
    render(<Harness series={{ isExpired: true, end: c(2) }} handlers={{ onClose }} />);

    expect(within(ficha()).queryByRole("button", { name: "Encerrar" })).toBeNull();
    expect(within(ficha()).queryByRole("button", { name: "Nova versão" })).toBeNull();
    await userEvent.click(within(ficha()).getAllByRole("button", { name: "Fechar" }).at(-1)!);

    expect(onClose).toHaveBeenCalled();
  });
});

describe("SeriesFicha nos modos de ação", () => {
  it("Nova versão mostra trilha, aviso, campos e prévia; Voltar retorna", async () => {
    const onCreateVersion = vi.fn();
    render(<Harness handlers={{ onCreateVersion }} />);

    await userEvent.click(within(ficha()).getByRole("button", { name: "Nova versão" }));

    expect(within(ficha()).getByText("› Nova versão")).toBeInTheDocument();
    expect(within(ficha()).getByText("Vale a partir do mês.")).toBeInTheDocument();
    expect(within(ficha()).getByLabelText("Campo da versão")).toBeInTheDocument();
    expect(within(ficha()).getByRole("list", { name: "Legenda" })).toHaveTextContent(
      "valor atualnova versão",
    );
    expect(within(ficha()).queryByRole("tab")).toBeNull();

    await userEvent.click(within(ficha()).getByRole("button", { name: "Criar nova versão" }));
    expect(onCreateVersion).toHaveBeenCalled();

    await userEvent.click(within(ficha()).getByRole("button", { name: "Voltar" }));
    expect(within(ficha()).getByRole("tab", { name: "Linha do tempo" })).toBeInTheDocument();
  });

  it("Encerrar mostra o mês de encerramento e a prévia hachurada", async () => {
    const onEnd = vi.fn();
    render(<Harness handlers={{ onEnd }} />);

    await userEvent.click(within(ficha()).getByRole("button", { name: "Encerrar" }));

    expect(within(ficha()).getByText("› Encerrar")).toBeInTheDocument();
    expect(within(ficha()).getByText("Encerra ao final do mês.")).toBeInTheDocument();
    await userEvent.selectOptions(
      within(ficha()).getByLabelText(/Mês de encerramento/),
      "Junho 2026",
    );
    expect(within(ficha()).getAllByText("deixa de existir").length).toBeGreaterThan(1);

    await userEvent.click(within(ficha()).getByRole("button", { name: "Encerrar despesa" }));
    expect(onEnd).toHaveBeenCalled();
  });
});

describe("SeriesFicha confirmação", () => {
  it("confirma a remoção e Escape fecha só a confirmação", async () => {
    const onRemove = vi.fn();
    const onClose = vi.fn();
    render(<Harness handlers={{ onRemove, onClose }} />);

    await userEvent.click(within(ficha()).getByRole("button", { name: "Remover" }));
    const dialog = screen.getByRole("dialog", { name: "Remover despesa?" });
    expect(within(dialog).getByText('Excluir a despesa recorrente "Aluguel"?')).toBeInTheDocument();

    await userEvent.keyboard("{Escape}");
    expect(screen.queryByRole("dialog", { name: "Remover despesa?" })).toBeNull();
    expect(onClose).not.toHaveBeenCalled();
    expect(ficha()).toBeInTheDocument();

    await userEvent.click(within(ficha()).getByRole("button", { name: "Remover" }));
    await userEvent.click(
      within(screen.getByRole("dialog", { name: "Remover despesa?" })).getByRole("button", {
        name: "Remover",
      }),
    );
    expect(onRemove).toHaveBeenCalled();
  });
});
