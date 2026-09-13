import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { type Column, DataTable } from "./DataTable";

interface Row {
  id: string;
  description: string;
  amount: number;
}

const COLUMNS: Column<Row>[] = [
  { key: "description", label: "Descrição" },
  { key: "amount", label: "Valor", align: "right" },
];

const ROWS: Row[] = [
  { id: "1", description: "Supermercado", amount: 450 },
  { id: "2", description: "Aluguel", amount: 2200 },
];

describe("DataTable vazia", () => {
  it('exibe "Nenhum registro encontrado." por padrão', () => {
    render(<DataTable columns={COLUMNS} rows={[]} />);

    expect(screen.getByText("Nenhum registro encontrado.")).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("exibe a emptyMessage custom", () => {
    render(
      <DataTable columns={COLUMNS} rows={[]} emptyMessage="Nenhuma receita avulsa neste mês." />,
    );

    expect(screen.getByText("Nenhuma receita avulsa neste mês.")).toBeInTheDocument();
  });
});

describe("DataTable com linhas", () => {
  it("renderiza um cabeçalho por coluna", () => {
    render(<DataTable columns={COLUMNS} rows={ROWS} />);

    expect(screen.getByRole("columnheader", { name: "Descrição" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Valor" })).toBeInTheDocument();
  });

  it("renderiza uma linha por registro", () => {
    render(<DataTable columns={COLUMNS} rows={ROWS} />);

    // +1 pela linha de cabeçalho.
    expect(screen.getAllByRole("row")).toHaveLength(3);
  });

  it("acessa o valor pela key quando a coluna não tem render", () => {
    render(<DataTable columns={COLUMNS} rows={ROWS} />);

    expect(screen.getByText("Supermercado")).toBeInTheDocument();
    expect(screen.getByText("2200")).toBeInTheDocument();
  });

  it("usa o render custom da coluna", () => {
    const columns: Column<Row>[] = [
      { key: "amount", label: "Valor", render: (row) => <b>R$ {row.amount},00</b> },
    ];

    render(<DataTable columns={columns} rows={ROWS} />);

    expect(screen.getByText("R$ 450,00")).toBeInTheDocument();
  });

  it("aplica o alinhamento da coluna", () => {
    const columns: Column<Row>[] = [
      { key: "description", label: "Esquerda" },
      { key: "amount", label: "Direita", align: "right" },
      { key: "id", label: "Centro", align: "center" },
    ];

    render(<DataTable columns={columns} rows={[ROWS[0]]} />);

    expect(screen.getByRole("columnheader", { name: "Direita" })).toHaveClass("text-right");
    expect(screen.getByRole("columnheader", { name: "Centro" })).toHaveClass("text-center");
    expect(screen.getByRole("columnheader", { name: "Esquerda" })).toHaveClass("text-left");
  });
});

describe("coluna de ações", () => {
  it("não existe sem onEdit nem onDelete", () => {
    render(<DataTable columns={COLUMNS} rows={ROWS} />);

    expect(screen.queryByRole("button", { name: "Editar" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Excluir" })).not.toBeInTheDocument();
    expect(screen.getAllByRole("columnheader")).toHaveLength(2);
  });

  it("mostra só Editar quando apenas onEdit é informado", () => {
    render(<DataTable columns={COLUMNS} rows={ROWS} onEdit={vi.fn()} />);

    expect(screen.getAllByRole("button", { name: "Editar" })).toHaveLength(2);
    expect(screen.queryByRole("button", { name: "Excluir" })).not.toBeInTheDocument();
  });

  it("mostra só Excluir quando apenas onDelete é informado", () => {
    render(<DataTable columns={COLUMNS} rows={ROWS} onDelete={vi.fn()} />);

    expect(screen.getAllByRole("button", { name: "Excluir" })).toHaveLength(2);
    expect(screen.queryByRole("button", { name: "Editar" })).not.toBeInTheDocument();
  });

  it("chama onEdit com a linha correta", async () => {
    const onEdit = vi.fn();
    render(<DataTable columns={COLUMNS} rows={ROWS} onEdit={onEdit} onDelete={vi.fn()} />);

    const segundaLinha = screen.getByText("Aluguel").closest("tr")!;
    await userEvent.click(within(segundaLinha).getByRole("button", { name: "Editar" }));

    expect(onEdit).toHaveBeenCalledWith(ROWS[1]);
  });

  it("chama onDelete com a linha correta", async () => {
    const onDelete = vi.fn();
    render(<DataTable columns={COLUMNS} rows={ROWS} onEdit={vi.fn()} onDelete={onDelete} />);

    const primeiraLinha = screen.getByText("Supermercado").closest("tr")!;
    await userEvent.click(within(primeiraLinha).getByRole("button", { name: "Excluir" }));

    expect(onDelete).toHaveBeenCalledWith(ROWS[0]);
  });

  it("acrescenta o cabeçalho da coluna de ações", () => {
    render(<DataTable columns={COLUMNS} rows={ROWS} onEdit={vi.fn()} />);

    expect(screen.getAllByRole("columnheader")).toHaveLength(3);
  });
});
