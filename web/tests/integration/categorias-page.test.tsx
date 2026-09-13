import { describe, expect, it } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import CategoriasPage from "@/app/(app)/categorias/page";
import { renderWithProviders } from "../render";
import { mockApiError, seedDb } from "../msw";
import { makeCategoryWithCount } from "../fixtures";
import { recordRequests, signatures } from "../requests";

/**
 * Integração de página: hooks + services + axios reais contra o MSW.
 * Não repete os caminhos felizes do E2E — cobre o que sai caro lá: ramificação
 * de modal, mensagens de erro da API e invalidação de cache observável.
 */
function renderPage(options = {}) {
  return renderWithProviders(<CategoriasPage />, { pathname: "/categorias", ...options });
}

const dialog = () => screen.getByRole("dialog");

describe("página de categorias: carregamento", () => {
  it("mostra esqueletos antes da resposta", () => {
    const { container } = renderPage();

    expect(container.querySelectorAll(".animate-pulse")).toHaveLength(4);
  });

  it("mostra o estado vazio com a ação de criar a primeira", async () => {
    renderPage();

    expect(await screen.findByText("Nenhuma categoria cadastrada.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "+ Criar primeira categoria" })).toBeInTheDocument();
  });

  it("lista as categorias existentes", async () => {
    seedDb({
      categories: [
        makeCategoryWithCount({ name: "Moradia" }),
        makeCategoryWithCount({ name: "Alimentação" }),
      ],
    });
    renderPage();

    expect(await screen.findByText("Moradia")).toBeInTheDocument();
    expect(screen.getByText("Alimentação")).toBeInTheDocument();
    expect(screen.getAllByTestId("category-card")).toHaveLength(2);
  });
});

describe("página de categorias: criação", () => {
  it("cria a categoria, fecha o modal e mostra a nova na grade", async () => {
    renderPage();
    await screen.findByText("Nenhuma categoria cadastrada.");

    await userEvent.click(screen.getByRole("button", { name: /Nova categoria/ }));
    expect(within(dialog()).getByText("Nova categoria")).toBeInTheDocument();

    await userEvent.type(screen.getByLabelText("Nome da categoria"), "Moradia");
    await userEvent.click(screen.getByRole("button", { name: "Criar categoria" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(await screen.findByTestId("category-card")).toHaveTextContent("Moradia");
  });

  it("refaz a listagem depois de criar (invalidação observável)", async () => {
    renderPage();
    await screen.findByText("Nenhuma categoria cadastrada.");
    const calls = recordRequests();

    await userEvent.click(screen.getByRole("button", { name: /Nova categoria/ }));
    await userEvent.type(screen.getByLabelText("Nome da categoria"), "Moradia");
    await userEvent.click(screen.getByRole("button", { name: "Criar categoria" }));

    await waitFor(() =>
      expect(signatures(calls).filter((s) => s === "GET /expenses/categories")).toHaveLength(1),
    );
    expect(signatures(calls)).toContain("POST /expenses/categories");
  });

  it("mostra o toast de nome duplicado no 409", async () => {
    seedDb({ categories: [makeCategoryWithCount({ name: "Moradia" })] });
    renderPage({ withToasts: true });
    await screen.findByText("Moradia");

    await userEvent.click(screen.getByRole("button", { name: /Nova categoria/ }));
    await userEvent.type(screen.getByLabelText("Nome da categoria"), "moradia");
    await userEvent.click(screen.getByRole("button", { name: "Criar categoria" }));

    expect(await screen.findByText("Já existe uma categoria com este nome.")).toBeInTheDocument();
    // `getByRole` não enxerga o toast aqui: o Radix Dialog marca os irmãos do
    // modal aberto com aria-hidden, removendo-os da árvore de acessibilidade.
    expect(screen.getByText("Tentar novamente")).toBeInTheDocument();
  });

  it("mantém o modal aberto quando a criação falha", async () => {
    mockApiError("post", "/expenses/categories", 500, {});
    renderPage();
    await screen.findByText("Nenhuma categoria cadastrada.");

    await userEvent.click(screen.getByRole("button", { name: /Nova categoria/ }));
    await userEvent.type(screen.getByLabelText("Nome da categoria"), "Moradia");
    await userEvent.click(screen.getByRole("button", { name: "Criar categoria" }));

    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Criar categoria" })).toBeEnabled(),
    );
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("o botão do estado vazio também abre o modal de criação", async () => {
    renderPage();
    await screen.findByText("Nenhuma categoria cadastrada.");

    await userEvent.click(screen.getByRole("button", { name: "+ Criar primeira categoria" }));

    expect(within(dialog()).getByText("Nova categoria")).toBeInTheDocument();
  });
});

describe("página de categorias: edição", () => {
  it("abre o modal preenchido e salva o novo nome", async () => {
    seedDb({ categories: [makeCategoryWithCount({ name: "Moradia" })] });
    renderPage();
    await screen.findByText("Moradia");

    await userEvent.click(screen.getByRole("button", { name: "Editar categoria" }));
    expect(within(dialog()).getByText("Editar categoria")).toBeInTheDocument();
    expect(screen.getByLabelText("Nome da categoria")).toHaveValue("Moradia");

    await userEvent.clear(screen.getByLabelText("Nome da categoria"));
    await userEvent.type(screen.getByLabelText("Nome da categoria"), "Casa");
    await userEvent.click(screen.getByRole("button", { name: "Salvar" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(await screen.findByText("Casa")).toBeInTheDocument();
  });
});

describe("página de categorias: exclusão", () => {
  it("com 0 despesas vinculadas abre o ConfirmDialog e exclui", async () => {
    seedDb({ categories: [makeCategoryWithCount({ name: "Moradia", linkedExpensesCount: 0 })] });
    renderPage();
    await screen.findByText("Moradia");

    await userEvent.click(screen.getByRole("button", { name: "Excluir categoria" }));

    expect(
      screen.getByText('Tem certeza que deseja excluir a categoria "Moradia"?'),
    ).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Excluir" }));

    await waitFor(() =>
      expect(screen.getByText("Nenhuma categoria cadastrada.")).toBeInTheDocument(),
    );
  });

  it("com despesas vinculadas abre o DeleteWarningModal, NÃO o ConfirmDialog", async () => {
    seedDb({ categories: [makeCategoryWithCount({ name: "Moradia", linkedExpensesCount: 3 })] });
    renderPage();
    await screen.findByText("Moradia");

    await userEvent.click(screen.getByRole("button", { name: "Excluir categoria" }));

    expect(screen.getByText("Não é possível excluir")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Entendido" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Excluir" })).not.toBeInTheDocument();
    expect(
      screen.queryByText('Tem certeza que deseja excluir a categoria "Moradia"?'),
    ).not.toBeInTheDocument();
  });

  it("o aviso de bloqueio não dispara nenhum DELETE", async () => {
    seedDb({ categories: [makeCategoryWithCount({ name: "Moradia", linkedExpensesCount: 3 })] });
    renderPage();
    await screen.findByText("Moradia");
    const calls = recordRequests();

    await userEvent.click(screen.getByRole("button", { name: "Excluir categoria" }));
    await userEvent.click(screen.getByRole("button", { name: "Entendido" }));

    expect(calls.filter((c) => c.method === "DELETE")).toHaveLength(0);
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("cancelar no ConfirmDialog não exclui", async () => {
    seedDb({ categories: [makeCategoryWithCount({ name: "Moradia" })] });
    renderPage();
    await screen.findByText("Moradia");
    const calls = recordRequests();

    await userEvent.click(screen.getByRole("button", { name: "Excluir categoria" }));
    await userEvent.click(screen.getByRole("button", { name: "Cancelar" }));

    expect(calls.filter((c) => c.method === "DELETE")).toHaveLength(0);
    expect(screen.getByText("Moradia")).toBeInTheDocument();
  });
});

/**
 * Cancelar é a ação mais comum depois de salvar, e não estava coberta nem aqui
 * nem no E2E. O risco concreto não é o modal deixar de fechar — é o estado
 * (`selected`) sobreviver ao fechamento e vazar para a próxima abertura.
 */
describe("página de categorias: cancelar", () => {
  it("fecha o modal de criação pelo Cancelar, sem chamar a API", async () => {
    const calls = recordRequests();
    seedDb({ categories: [makeCategoryWithCount({ name: "Moradia" })] });
    renderPage();
    await screen.findByText("Moradia");

    await userEvent.click(screen.getByRole("button", { name: /Nova categoria/ }));
    await userEvent.type(within(dialog()).getByLabelText("Nome da categoria"), "Lazer");
    await userEvent.click(within(dialog()).getByRole("button", { name: "Cancelar" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(signatures(calls).filter((s) => s.startsWith("POST"))).toHaveLength(0);
  });

  it("fecha o modal de criação pelo X", async () => {
    seedDb({ categories: [makeCategoryWithCount({ name: "Moradia" })] });
    renderPage();
    await screen.findByText("Moradia");

    await userEvent.click(screen.getByRole("button", { name: /Nova categoria/ }));
    await userEvent.click(within(dialog()).getByRole("button", { name: "Fechar" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("fecha o modal de edição sem enviar alteração", async () => {
    const calls = recordRequests();
    seedDb({ categories: [makeCategoryWithCount({ name: "Moradia" })] });
    renderPage();
    await screen.findByText("Moradia");

    await userEvent.click(screen.getByRole("button", { name: "Editar categoria" }));
    await userEvent.clear(within(dialog()).getByLabelText("Nome da categoria"));
    await userEvent.type(within(dialog()).getByLabelText("Nome da categoria"), "Outro nome");
    await userEvent.click(within(dialog()).getByRole("button", { name: "Cancelar" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(signatures(calls).filter((s) => s.startsWith("PUT"))).toHaveLength(0);
    expect(screen.getByText("Moradia")).toBeInTheDocument();
  });

  it("não vaza o item editado para o modal de criação aberto em seguida", async () => {
    seedDb({ categories: [makeCategoryWithCount({ name: "Moradia" })] });
    renderPage();
    await screen.findByText("Moradia");

    await userEvent.click(screen.getByRole("button", { name: "Editar categoria" }));
    expect(within(dialog()).getByLabelText("Nome da categoria")).toHaveValue("Moradia");
    await userEvent.click(within(dialog()).getByRole("button", { name: "Cancelar" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());

    await userEvent.click(screen.getByRole("button", { name: /Nova categoria/ }));

    expect(within(dialog()).getByText("Nova categoria")).toBeInTheDocument();
    expect(within(dialog()).getByLabelText("Nome da categoria")).toHaveValue("");
  });

  it("reabre a edição com o item correto após cancelar outro", async () => {
    seedDb({
      categories: [
        makeCategoryWithCount({ name: "Moradia" }),
        makeCategoryWithCount({ name: "Alimentação" }),
      ],
    });
    renderPage();
    await screen.findByText("Moradia");

    const [editMoradia, editAlimentacao] = screen.getAllByRole("button", {
      name: "Editar categoria",
    });

    await userEvent.click(editMoradia);
    await userEvent.click(within(dialog()).getByRole("button", { name: "Cancelar" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());

    await userEvent.click(editAlimentacao);

    expect(within(dialog()).getByLabelText("Nome da categoria")).toHaveValue("Alimentação");
  });

  it("fecha o ConfirmDialog de exclusão pelo Cancelar, sem excluir", async () => {
    const calls = recordRequests();
    seedDb({ categories: [makeCategoryWithCount({ name: "Moradia" })] });
    renderPage();
    await screen.findByText("Moradia");

    await userEvent.click(screen.getByRole("button", { name: "Excluir categoria" }));
    await userEvent.click(within(dialog()).getByRole("button", { name: "Cancelar" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(signatures(calls).filter((s) => s.startsWith("DELETE"))).toHaveLength(0);
    expect(screen.getByText("Moradia")).toBeInTheDocument();
  });

  it("fecha o aviso de categoria com vínculos pelo Entendido", async () => {
    seedDb({
      categories: [makeCategoryWithCount({ name: "Moradia", linkedExpensesCount: 2 })],
    });
    renderPage();
    await screen.findByText("Moradia");

    await userEvent.click(screen.getByRole("button", { name: "Excluir categoria" }));
    expect(within(dialog()).getByText("Não é possível excluir")).toBeInTheDocument();

    await userEvent.click(within(dialog()).getByRole("button", { name: "Entendido" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });
});
