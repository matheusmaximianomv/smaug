import { describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import CadastroPage from "@/app/(auth)/cadastro/page";
import { getAccessToken, hasSessionHint } from "@/infra/session";
import { renderWithProviders } from "../render";
import { db, mockApiError, seedDb } from "../msw";
import { makeUser } from "../fixtures";
import { recordRequests } from "../requests";
import { routerAdapterMock } from "../router";

vi.mock("@/infra/router-adapter", async () => {
  const { routerAdapterMock: router } = await import("../router");
  return { useRouter: () => router };
});

const PASSWORD = "senha muito segura";

function renderPage() {
  return renderWithProviders(<CadastroPage />, { pathname: "/cadastro" });
}

async function submit({ email = "maria@example.com", confirmation = PASSWORD } = {}) {
  await userEvent.type(screen.getByLabelText("Nome"), "Maria Souza");
  await userEvent.type(screen.getByLabelText("E-mail"), email);
  await userEvent.type(screen.getByLabelText("Senha"), PASSWORD);
  await userEvent.type(screen.getByLabelText("Confirmar senha"), confirmation);
  await userEvent.click(screen.getByRole("button", { name: "Criar Conta" }));
}

describe("página de cadastro", () => {
  it("apresenta a chamada da página e o caminho para o login", () => {
    renderPage();

    expect(screen.getByRole("heading", { name: "Criar conta" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Fazer login" })).toHaveAttribute("href", "/login");
  });

  it("cria a conta já logado e cai no dashboard, sem mostrar o ID", async () => {
    renderPage();

    await submit();

    await waitFor(() => expect(routerAdapterMock.push).toHaveBeenCalledWith("/dashboard"));
    expect(db.users).toHaveLength(1);
    expect(getAccessToken()).toMatch(/^access-/);
    expect(hasSessionHint()).toBe(true);
    expect(screen.queryByText(db.users[0].id)).not.toBeInTheDocument();
  });

  it("com a confirmação divergente mostra o erro no campo e não envia nada", async () => {
    const calls = recordRequests();
    renderPage();

    await submit({ confirmation: "outra senha qualquer" });

    expect(await screen.findByText("As senhas não coincidem")).toBeInTheDocument();
    expect(calls).toHaveLength(0);
  });

  it("no EMAIL_ALREADY_EXISTS mostra a mensagem e o link para Entrar", async () => {
    seedDb({ users: [makeUser({ email: "maria@example.com" })] });
    renderPage();

    await submit();

    expect(await screen.findByText("Já existe uma conta com este e-mail.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Entrar" })).toHaveAttribute("href", "/login");
    expect(getAccessToken()).toBeNull();
    expect(routerAdapterMock.push).not.toHaveBeenCalled();
  });

  it("no TOO_MANY_REQUESTS mostra a mensagem de limite", async () => {
    mockApiError("post", "/auth/register", 429, { error: "TOO_MANY_REQUESTS" });
    renderPage();

    await submit();

    expect(
      await screen.findByText("Muitas tentativas. Aguarde alguns minutos e tente novamente."),
    ).toBeInTheDocument();
  });

  it("no 500 mostra a mensagem genérica e mantém o formulário", async () => {
    mockApiError("post", "/auth/register", 500, {});
    renderPage();

    await submit();

    expect(await screen.findByText("Erro ao criar conta. Tente novamente.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Criar Conta" })).toBeEnabled();
  });
});
