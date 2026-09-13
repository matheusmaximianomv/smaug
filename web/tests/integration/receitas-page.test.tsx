import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ReceitasPage from "@/app/(app)/receitas/page";
import { renderWithProviders } from "../render";
import { db, mockPending, seedDb } from "../msw";
import { makeFixedRevenue, makeFixedRevenueVersion, makeOneTimeRevenue } from "../fixtures";
import { freezeDateOnly, unfreezeTime } from "../time";

beforeEach(() => {
  freezeDateOnly(new Date("2026-09-13T00:00:00Z"));
});

afterEach(() => {
  unfreezeTime();
});

function renderPage() {
  return renderWithProviders(<ReceitasPage />, { pathname: "/receitas" });
}

const tab = (name: RegExp | string) => screen.getByRole("tab", { name });

describe("página de receitas: abas", () => {
  it('abre em "Avulsas" com o botão de criação correspondente', async () => {
    renderPage();

    await waitFor(() => expect(tab(/Avulsas/)).toHaveAttribute("aria-selected", "true"));
    expect(screen.getByRole("button", { name: /Nova receita avulsa/ })).toBeInTheDocument();
  });

  it("mostra a contagem de cada aba nos badges", async () => {
    seedDb({
      oneTimeRevenues: [makeOneTimeRevenue(), makeOneTimeRevenue()],
      fixedRevenues: [makeFixedRevenue()],
    });
    renderPage();

    await waitFor(() => expect(within(tab(/Avulsas/)).getByText("2")).toBeInTheDocument());
    expect(within(tab(/Fixas/)).getByText("1")).toBeInTheDocument();
  });

  it("trocar de aba muda o conteúdo e o rótulo do botão", async () => {
    seedDb({ fixedRevenues: [makeFixedRevenue()] });
    renderPage();
    await screen.findByText("Nenhuma receita avulsa cadastrada.");

    await userEvent.click(tab(/Fixas/));

    expect(screen.getByRole("button", { name: /Nova receita fixa/ })).toBeInTheDocument();
    expect(screen.getByTestId("fixed-revenue-card")).toBeInTheDocument();
    expect(screen.queryByText("Nenhuma receita avulsa cadastrada.")).not.toBeInTheDocument();
  });
});

describe("página de receitas: avulsas", () => {
  it("mostra o estado vazio da tabela", async () => {
    renderPage();

    expect(await screen.findByText("Nenhuma receita avulsa cadastrada.")).toBeInTheDocument();
  });

  it("ordena as avulsas em ordem decrescente de competência", async () => {
    seedDb({
      oneTimeRevenues: [
        makeOneTimeRevenue({ description: "Antiga", competenceYear: 2026, competenceMonth: 2 }),
        makeOneTimeRevenue({ description: "Recente", competenceYear: 2026, competenceMonth: 11 }),
        makeOneTimeRevenue({ description: "Meio", competenceYear: 2026, competenceMonth: 7 }),
        makeOneTimeRevenue({
          description: "Ano anterior",
          competenceYear: 2025,
          competenceMonth: 12,
        }),
      ],
    });
    renderPage();
    await screen.findByText("Recente");

    const descriptions = screen
      .getAllByRole("row")
      .slice(1)
      .map((row) => row.querySelector("td")?.textContent);
    expect(descriptions).toEqual(["Recente", "Meio", "Antiga", "Ano anterior"]);
  });

  it("exclui uma avulsa pelo ConfirmDialog", async () => {
    seedDb({ oneTimeRevenues: [makeOneTimeRevenue({ description: "Freelance" })] });
    renderPage();
    await screen.findByText("Freelance");

    await userEvent.click(screen.getByRole("button", { name: "Excluir" }));
    expect(
      screen.getByText('Tem certeza que deseja excluir a receita "Freelance"?'),
    ).toBeInTheDocument();
    await userEvent.click(
      within(screen.getByRole("dialog")).getByRole("button", { name: "Excluir" }),
    );

    await waitFor(() => expect(db.oneTimeRevenues).toHaveLength(0));
  });
});

describe("página de receitas: fixas", () => {
  it("mostra o estado vazio com a ação de criar a primeira", async () => {
    renderPage();
    await screen.findByText("Nenhuma receita avulsa cadastrada.");

    await userEvent.click(tab(/Fixas/));

    expect(screen.getByText("Nenhuma receita fixa cadastrada.")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "+ Criar primeira receita fixa" }),
    ).toBeInTheDocument();
  });

  it('"Nova versão" aparece numa ALTERABLE e abre o formulário de versão', async () => {
    const version = makeFixedRevenueVersion({ description: "Salário" });
    seedDb({
      fixedRevenues: [
        makeFixedRevenue({ modality: "ALTERABLE", currentVersion: version, versions: [version] }),
      ],
    });
    renderPage();
    await userEvent.click(tab(/Fixas/));

    await userEvent.click(await screen.findByRole("button", { name: /Nova versão/ }));

    expect(screen.getByText("Nova versão da receita fixa")).toBeInTheDocument();
    expect(screen.getByLabelText("Nova descrição")).toBeInTheDocument();
  });

  it('"Nova versão" NÃO aparece numa UNALTERABLE', async () => {
    seedDb({ fixedRevenues: [makeFixedRevenue({ modality: "UNALTERABLE" })] });
    renderPage();
    await userEvent.click(tab(/Fixas/));

    await screen.findByTestId("fixed-revenue-card");
    expect(screen.queryByRole("button", { name: /Nova versão/ })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Encerrar/ })).toBeInTheDocument();
  });

  it("encerra a receita fixa pela competência escolhida", async () => {
    seedDb({ fixedRevenues: [makeFixedRevenue()] });
    renderPage();
    await userEvent.click(tab(/Fixas/));

    await userEvent.click(await screen.findByRole("button", { name: /Encerrar/ }));
    expect(
      screen.getByText("A receita fixa será encerrada ao final do mês selecionado."),
    ).toBeInTheDocument();
    await userEvent.selectOptions(screen.getByLabelText("Mês de encerramento — mês"), "12");
    await userEvent.click(screen.getByRole("button", { name: "Encerrar receita" }));

    await waitFor(() => expect(db.fixedRevenues[0].endMonth).toBe(12));
    expect(db.fixedRevenues[0].endYear).toBe(2026);
  });

  it('"Ver histórico" lista as versões em ordem decrescente', async () => {
    const older = makeFixedRevenueVersion({
      description: "Salário",
      effectiveYear: 2026,
      effectiveMonth: 1,
    });
    const newer = makeFixedRevenueVersion({
      description: "Salário reajustado",
      effectiveYear: 2026,
      effectiveMonth: 10,
    });
    seedDb({
      fixedRevenues: [makeFixedRevenue({ currentVersion: newer, versions: [older, newer] })],
    });
    renderPage();
    await userEvent.click(tab(/Fixas/));

    await userEvent.click(await screen.findByRole("button", { name: /Ver histórico/ }));

    const labels = screen.getAllByText(/A partir de/).map((el) => el.textContent);
    expect(labels).toEqual(["A partir de Out/26", "A partir de Jan/26"]);
  });

  it("exclui a receita fixa com a mensagem própria de confirmação", async () => {
    seedDb({ fixedRevenues: [makeFixedRevenue()] });
    renderPage();
    await userEvent.click(tab(/Fixas/));
    await screen.findByTestId("fixed-revenue-card");

    const actions = screen.getAllByRole("button");
    await userEvent.click(actions[actions.length - 1]);

    expect(
      screen.getByText("Tem certeza que deseja excluir permanentemente esta receita fixa?"),
    ).toBeInTheDocument();

    await userEvent.click(
      within(screen.getByRole("dialog")).getByRole("button", { name: "Excluir" }),
    );

    await waitFor(() => expect(db.fixedRevenues).toHaveLength(0));
  });
});

describe("página de receitas: criação e edição", () => {
  it("cria uma receita avulsa e fecha o modal", async () => {
    renderPage();
    await screen.findByText("Nenhuma receita avulsa cadastrada.");

    await userEvent.click(screen.getByRole("button", { name: /Nova receita avulsa/ }));
    await userEvent.type(screen.getByLabelText("Descrição"), "Freelance");
    await userEvent.type(screen.getByLabelText("Valor (R$)"), "1500");
    await userEvent.click(screen.getByRole("button", { name: "Adicionar receita" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(await screen.findByText("Freelance")).toBeInTheDocument();
    expect(db.oneTimeRevenues).toHaveLength(1);
  });

  it("edita uma receita avulsa existente", async () => {
    seedDb({ oneTimeRevenues: [makeOneTimeRevenue({ description: "Freelance", amount: 1500 })] });
    renderPage();
    await screen.findByText("Freelance");

    await userEvent.click(screen.getByRole("button", { name: "Editar" }));
    expect(
      within(screen.getByRole("dialog")).getByText("Editar receita avulsa"),
    ).toBeInTheDocument();
    await userEvent.clear(screen.getByLabelText("Descrição"));
    await userEvent.type(screen.getByLabelText("Descrição"), "Consultoria");
    await userEvent.click(screen.getByRole("button", { name: "Salvar alterações" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(await screen.findByText("Consultoria")).toBeInTheDocument();
  });

  it("cria uma receita fixa pela aba Fixas", async () => {
    renderPage();
    await screen.findByText("Nenhuma receita avulsa cadastrada.");
    await userEvent.click(tab(/Fixas/));

    await userEvent.click(screen.getByRole("button", { name: /Nova receita fixa/ }));
    await userEvent.type(screen.getByLabelText("Descrição"), "Salário");
    await userEvent.type(screen.getByLabelText("Valor mensal (R$)"), "8000");
    await userEvent.click(screen.getByRole("button", { name: "Criar receita fixa" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(await screen.findByTestId("fixed-revenue-card")).toHaveTextContent("Salário");
  });

  it("cria uma nova versão da receita fixa", async () => {
    const version = makeFixedRevenueVersion({ description: "Salário", effectiveMonth: 9 });
    seedDb({
      fixedRevenues: [makeFixedRevenue({ currentVersion: version, versions: [version] })],
    });
    renderPage();
    await userEvent.click(tab(/Fixas/));
    await userEvent.click(await screen.findByRole("button", { name: /Nova versão/ }));

    await userEvent.type(screen.getByLabelText("Nova descrição"), "Salário reajustado");
    await userEvent.type(screen.getByLabelText("Novo valor (R$)"), "9000");
    await userEvent.selectOptions(screen.getByLabelText("Vigência a partir de — mês"), "10");
    await userEvent.click(screen.getByRole("button", { name: "Criar nova versão" }));

    await waitFor(() => expect(db.fixedRevenues[0].versions).toHaveLength(2));
    expect(db.fixedRevenues[0].currentVersion.amount).toBe(9000);
  });
});

/**
 * Cancelar não estava coberto nem aqui nem no E2E. O risco real não é o modal
 * deixar de fechar — é estado da PÁGINA sobrevivendo ao fechamento e vazando
 * para a próxima abertura, que foi exatamente o caso de `endMonth`/`endYear`.
 */
describe("página de receitas: cancelar", () => {
  it("fecha a criação de avulsa sem enviar nada", async () => {
    renderPage();
    await userEvent.click(await screen.findByRole("button", { name: /Nova receita avulsa/ }));
    await userEvent.click(screen.getByRole("button", { name: "Cancelar" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(db.oneTimeRevenues).toHaveLength(0);
  });

  it("fecha a criação de avulsa pelo X", async () => {
    renderPage();
    await userEvent.click(await screen.findByRole("button", { name: /Nova receita avulsa/ }));
    await userEvent.click(screen.getByRole("button", { name: "Fechar" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("fecha a edição de avulsa sem alterar", async () => {
    seedDb({ oneTimeRevenues: [makeOneTimeRevenue({ description: "Freelance" })] });
    renderPage();
    await screen.findByText("Freelance");

    await userEvent.click(screen.getByRole("button", { name: "Editar" }));
    await userEvent.click(screen.getByRole("button", { name: "Cancelar" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(db.oneTimeRevenues[0].description).toBe("Freelance");
  });

  it("não vaza a avulsa editada para a criação aberta em seguida", async () => {
    seedDb({ oneTimeRevenues: [makeOneTimeRevenue({ description: "Freelance" })] });
    renderPage();
    await screen.findByText("Freelance");

    await userEvent.click(screen.getByRole("button", { name: "Editar" }));
    await userEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());

    await userEvent.click(screen.getByRole("button", { name: /Nova receita avulsa/ }));

    expect(screen.getByPlaceholderText("Ex: Freelance, bônus...")).toHaveValue("");
  });

  it("fecha o ConfirmDialog de exclusão de avulsa sem excluir", async () => {
    seedDb({ oneTimeRevenues: [makeOneTimeRevenue({ description: "Freelance" })] });
    renderPage();
    await screen.findByText("Freelance");

    await userEvent.click(screen.getByRole("button", { name: "Excluir" }));
    await userEvent.click(screen.getByRole("button", { name: "Cancelar" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(db.oneTimeRevenues).toHaveLength(1);
  });

  it("fecha a criação de fixa sem enviar nada", async () => {
    renderPage();
    await userEvent.click(tab(/Fixas/));
    await userEvent.click(await screen.findByRole("button", { name: /Nova receita fixa/ }));
    await userEvent.click(screen.getByRole("button", { name: "Cancelar" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(db.fixedRevenues).toHaveLength(0);
  });

  it("fecha a criação de nova versão sem enviar nada", async () => {
    const version = makeFixedRevenueVersion();
    seedDb({
      fixedRevenues: [
        makeFixedRevenue({ modality: "ALTERABLE", currentVersion: version, versions: [version] }),
      ],
    });
    renderPage();
    await userEvent.click(tab(/Fixas/));

    await userEvent.click(await screen.findByRole("button", { name: /Nova versão/ }));
    await userEvent.click(screen.getByRole("button", { name: "Cancelar" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(db.fixedRevenues[0].versions ?? []).toHaveLength(1);
  });

  it("fecha o encerramento sem encerrar", async () => {
    seedDb({ fixedRevenues: [makeFixedRevenue()] });
    renderPage();
    await userEvent.click(tab(/Fixas/));

    await userEvent.click(await screen.findByRole("button", { name: /Encerrar/ }));
    await userEvent.click(screen.getByRole("button", { name: "Cancelar" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(db.fixedRevenues[0].endMonth).toBeNull();
  });

  /** Regressão: `endMonth`/`endYear` são estado da página e vazavam entre aberturas. */
  it("descarta o mês de encerramento escolhido ao cancelar", async () => {
    seedDb({ fixedRevenues: [makeFixedRevenue()] });
    renderPage();
    await userEvent.click(tab(/Fixas/));

    await userEvent.click(await screen.findByRole("button", { name: /Encerrar/ }));
    await userEvent.selectOptions(screen.getByLabelText("Mês de encerramento — mês"), "12");
    await userEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());

    await userEvent.click(screen.getByRole("button", { name: /Encerrar/ }));

    expect(screen.getByLabelText("Mês de encerramento — mês")).toHaveValue("9");
  });

  it("fecha o histórico de versões pelo Fechar", async () => {
    const version = makeFixedRevenueVersion({ description: "Salário" });
    seedDb({
      fixedRevenues: [makeFixedRevenue({ currentVersion: version, versions: [version] })],
    });
    renderPage();
    await userEvent.click(tab(/Fixas/));

    await userEvent.click(await screen.findByRole("button", { name: /Ver histórico/ }));
    await userEvent.click(screen.getByRole("button", { name: "Fechar" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("fecha o ConfirmDialog de exclusão de fixa sem excluir", async () => {
    seedDb({ fixedRevenues: [makeFixedRevenue()] });
    renderPage();
    await userEvent.click(tab(/Fixas/));

    await userEvent.click(await screen.findByRole("button", { name: /Excluir/ }));
    await userEvent.click(screen.getByRole("button", { name: "Cancelar" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(db.fixedRevenues).toHaveLength(1);
  });
});

/**
 * O `onClose` do <Modal> (X, Escape, overlay) é uma função distinta do
 * "Cancelar" do formulário, que chama o `onClose` passado ao form. Os dois
 * caminhos fecham o modal, mas por callbacks diferentes.
 */
describe("página de receitas: fechar pelo X e CTAs de estado vazio", () => {
  it('o CTA "+ Criar primeira receita fixa" abre o formulário', async () => {
    renderPage();
    await userEvent.click(tab(/Fixas/));

    await userEvent.click(
      await screen.findByRole("button", { name: "+ Criar primeira receita fixa" }),
    );

    expect(within(screen.getByRole("dialog")).getByText("Nova receita fixa")).toBeInTheDocument();
  });

  it("fecha a edição de avulsa pelo X", async () => {
    seedDb({ oneTimeRevenues: [makeOneTimeRevenue({ description: "Freelance" })] });
    renderPage();
    await screen.findByText("Freelance");

    await userEvent.click(screen.getByRole("button", { name: "Editar" }));
    await userEvent.click(screen.getByRole("button", { name: "Fechar" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("fecha a criação de fixa pelo X", async () => {
    renderPage();
    await userEvent.click(tab(/Fixas/));

    await userEvent.click(await screen.findByRole("button", { name: /Nova receita fixa/ }));
    await userEvent.click(screen.getByRole("button", { name: "Fechar" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("fecha a nova versão pelo X", async () => {
    const version = makeFixedRevenueVersion();
    seedDb({
      fixedRevenues: [
        makeFixedRevenue({ modality: "ALTERABLE", currentVersion: version, versions: [version] }),
      ],
    });
    renderPage();
    await userEvent.click(tab(/Fixas/));

    await userEvent.click(await screen.findByRole("button", { name: /Nova versão/ }));
    await userEvent.click(screen.getByRole("button", { name: "Fechar" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("fecha o encerramento pelo X", async () => {
    seedDb({ fixedRevenues: [makeFixedRevenue()] });
    renderPage();
    await userEvent.click(tab(/Fixas/));

    await userEvent.click(await screen.findByRole("button", { name: /Encerrar/ }));
    await userEvent.click(screen.getByRole("button", { name: "Fechar" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(db.fixedRevenues[0].endMonth).toBeNull();
  });
});

describe("página de receitas: ramo de carregamento", () => {
  it("mostra esqueletos na aba Fixas enquanto a consulta não responde", async () => {
    mockPending("get", "/revenues/fixed");
    const { container } = renderPage();

    await userEvent.click(tab(/Fixas/));

    await waitFor(() =>
      expect(container.querySelectorAll(".animate-pulse").length).toBeGreaterThan(0),
    );
  });
});
