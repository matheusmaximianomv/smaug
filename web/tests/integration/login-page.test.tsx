import { describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import LoginPage from "@/app/(auth)/login/page";
import { getUserId } from "@/infra/session";
import { renderWithProviders } from "../render";
import { mockApiError, seedDb } from "../msw";
import { makeUser } from "../fixtures";
import { routerAdapterMock } from "../router";

vi.mock("@/infra/router-adapter", async () => {
  const { routerAdapterMock: router } = await import("../router");
  return { useRouter: () => router };
});

const USER = makeUser();

function renderPage() {
  return renderWithProviders(<LoginPage />, { pathname: "/login" });
}

async function submit(userId: string) {
  await userEvent.type(screen.getByLabelText("ID do Usuário"), userId);
  await userEvent.click(screen.getByRole("button", { name: "Entrar" }));
}

describe("página de login", () => {
  it("apresenta a marca e o caminho para o cadastro", () => {
    renderPage();

    expect(screen.getByRole("heading", { name: "SMAUG" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Criar conta" })).toHaveAttribute("href", "/cadastro");
  });

  it("entra de ponta a ponta: grava o cookie e navega para o dashboard", async () => {
    seedDb({ users: [USER] });
    renderPage();

    await submit(USER.id);

    await waitFor(() => expect(routerAdapterMock.push).toHaveBeenCalledWith("/dashboard"));
    expect(getUserId()).toBe(USER.id);
  });

  it("no 404 mostra a mensagem e NÃO grava o cookie", async () => {
    renderPage();

    await submit("00000000-0000-4000-8000-000000000099");

    expect(
      await screen.findByText("Usuário não encontrado. Verifique o ID e tente novamente."),
    ).toBeInTheDocument();
    expect(getUserId()).toBeNull();
    expect(routerAdapterMock.push).not.toHaveBeenCalled();
  });

  it("no 500 mostra a mensagem genérica e NÃO grava o cookie", async () => {
    mockApiError("get", `/users/${USER.id}`, 500, {});
    renderPage();

    await submit(USER.id);

    expect(
      await screen.findByText("Não foi possível entrar. Tente novamente."),
    ).toBeInTheDocument();
    expect(getUserId()).toBeNull();
  });

  it("com id fora do formato UUID nem chega à API", async () => {
    renderPage();

    await submit("abc");

    expect(await screen.findByText("ID de usuário inválido")).toBeInTheDocument();
    expect(getUserId()).toBeNull();
    expect(routerAdapterMock.push).not.toHaveBeenCalled();
  });
});
