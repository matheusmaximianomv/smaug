import { describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "../../../tests/render";
import { mockApiError, mockNetworkError, seedDb } from "../../../tests/msw";
import { makeUser } from "../../../tests/fixtures";
import { routerAdapterMock } from "../../../tests/router";
import { LoginForm } from "./LoginForm";

/** `useAuth` fica REAL: o assunto aqui é a conversa do formulário com ele. */
vi.mock("@/infra/router-adapter", async () => {
  const { routerAdapterMock: router } = await import("../../../tests/router");
  return { useRouter: () => router };
});

const USER = makeUser();

async function fillAndSubmit(userId: string) {
  await userEvent.type(screen.getByLabelText("ID do Usuário"), userId);
  await userEvent.click(screen.getByRole("button", { name: "Entrar" }));
}

describe("LoginForm: validação de formato", () => {
  it("rejeita um id que não é UUID e não chama a API", async () => {
    renderWithProviders(<LoginForm />);

    await fillAndSubmit("nao-e-uuid");

    expect(await screen.findByText("ID de usuário inválido")).toBeInTheDocument();
    expect(routerAdapterMock.push).not.toHaveBeenCalled();
  });

  it("rejeita o campo vazio", async () => {
    renderWithProviders(<LoginForm />);

    await userEvent.click(screen.getByRole("button", { name: "Entrar" }));

    expect(await screen.findByText("ID de usuário inválido")).toBeInTheDocument();
  });
});

describe("LoginForm: respostas da API", () => {
  it("entra com um id válido e navega para o dashboard", async () => {
    seedDb({ users: [USER] });
    renderWithProviders(<LoginForm />);

    await fillAndSubmit(USER.id);

    await waitFor(() => expect(routerAdapterMock.push).toHaveBeenCalledWith("/dashboard"));
  });

  it("mostra a mensagem de usuário não encontrado no 404", async () => {
    renderWithProviders(<LoginForm />);

    await fillAndSubmit("00000000-0000-4000-8000-000000000099");

    expect(
      await screen.findByText("Usuário não encontrado. Verifique o ID e tente novamente."),
    ).toBeInTheDocument();
    expect(routerAdapterMock.push).not.toHaveBeenCalled();
  });

  it("usa a mensagem genérica no 500", async () => {
    mockApiError("get", `/users/${USER.id}`, 500, {});
    renderWithProviders(<LoginForm />);

    await fillAndSubmit(USER.id);

    expect(
      await screen.findByText("Não foi possível entrar. Tente novamente."),
    ).toBeInTheDocument();
  });

  it("usa a mensagem de conexão numa falha de rede", async () => {
    mockNetworkError("get", `/users/${USER.id}`);
    renderWithProviders(<LoginForm />);

    await fillAndSubmit(USER.id);

    expect(
      await screen.findByText("Não foi possível falar com o servidor. Verifique sua conexão."),
    ).toBeInTheDocument();
  });

  it("limpa a mensagem de erro numa nova tentativa bem-sucedida", async () => {
    seedDb({ users: [USER] });
    renderWithProviders(<LoginForm />);

    await fillAndSubmit("00000000-0000-4000-8000-000000000099");
    await screen.findByText("Usuário não encontrado. Verifique o ID e tente novamente.");

    await userEvent.clear(screen.getByLabelText("ID do Usuário"));
    await fillAndSubmit(USER.id);

    await waitFor(() =>
      expect(
        screen.queryByText("Usuário não encontrado. Verifique o ID e tente novamente."),
      ).not.toBeInTheDocument(),
    );
  });

  it("reabilita o botão depois do erro", async () => {
    renderWithProviders(<LoginForm />);

    await fillAndSubmit("00000000-0000-4000-8000-000000000099");
    await screen.findByText("Usuário não encontrado. Verifique o ID e tente novamente.");

    expect(screen.getByRole("button", { name: "Entrar" })).toBeEnabled();
  });
});
