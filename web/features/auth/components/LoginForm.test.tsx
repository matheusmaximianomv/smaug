import { describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "../../../tests/render";
import { mockApiError, mockNetworkError, seedDb } from "../../../tests/msw";
import { makeUser } from "../../../tests/fixtures";
import { recordRequests } from "../../../tests/requests";
import { routerAdapterMock } from "../../../tests/router";
import { LoginForm } from "./LoginForm";

/** `useAuth` fica REAL: o assunto aqui é a conversa do formulário com ele. */
vi.mock("@/infra/router-adapter", async () => {
  const { routerAdapterMock: router } = await import("../../../tests/router");
  return { useRouter: () => router };
});

const USER = makeUser();
const PASSWORD = "senha muito segura";

function seedAccount() {
  seedDb({ users: [USER], passwords: { [USER.id]: PASSWORD } });
}

async function fillAndSubmit(email: string, password: string) {
  if (email) await userEvent.type(screen.getByLabelText("E-mail"), email);
  if (password) await userEvent.type(screen.getByLabelText("Senha"), password);
  await userEvent.click(screen.getByRole("button", { name: "Entrar" }));
}

describe("LoginForm: campos", () => {
  it("pede e-mail e senha, com a senha mascarada", () => {
    renderWithProviders(<LoginForm />);

    expect(screen.getByLabelText("E-mail")).toHaveAttribute("type", "email");
    expect(screen.getByLabelText("Senha")).toHaveAttribute("type", "password");
    expect(screen.getByLabelText("Senha")).toHaveAttribute("placeholder", "Sua senha");
    expect(screen.queryByLabelText("ID do Usuário")).not.toBeInTheDocument();
  });
});

describe("LoginForm: validação", () => {
  it("rejeita um e-mail fora do formato e não chama a API", async () => {
    const calls = recordRequests();
    renderWithProviders(<LoginForm />);

    await fillAndSubmit("nao-e-email", PASSWORD);

    expect(await screen.findByText("E-mail inválido")).toBeInTheDocument();
    expect(calls).toHaveLength(0);
  });

  it("exige os dois campos", async () => {
    renderWithProviders(<LoginForm />);

    await fillAndSubmit("", "");

    expect(await screen.findByText("Informe o e-mail")).toBeInTheDocument();
    expect(screen.getByText("Informe a senha")).toBeInTheDocument();
  });
});

describe("LoginForm: respostas da API", () => {
  it("entra com credenciais corretas e navega para o dashboard", async () => {
    seedAccount();
    renderWithProviders(<LoginForm />);

    await fillAndSubmit(USER.email, PASSWORD);

    await waitFor(() => expect(routerAdapterMock.push).toHaveBeenCalledWith("/dashboard"));
  });

  it("leva à rota pretendida recebida em next", async () => {
    seedAccount();
    renderWithProviders(<LoginForm next="/historico" />);

    await fillAndSubmit(USER.email, PASSWORD);

    await waitFor(() => expect(routerAdapterMock.push).toHaveBeenCalledWith("/historico"));
  });

  it("mostra a mensagem de credenciais inválidas no 401", async () => {
    seedAccount();
    renderWithProviders(<LoginForm />);

    await fillAndSubmit(USER.email, "senha errada qualquer");

    expect(await screen.findByRole("alert")).toHaveTextContent("E-mail ou senha incorretos.");
    expect(routerAdapterMock.push).not.toHaveBeenCalled();
  });

  it("mostra a mensagem de limite de tentativas no 429", async () => {
    mockApiError("post", "/auth/login", 429, { error: "TOO_MANY_REQUESTS" });
    renderWithProviders(<LoginForm />);

    await fillAndSubmit(USER.email, PASSWORD);

    expect(
      await screen.findByText("Muitas tentativas. Aguarde alguns minutos e tente novamente."),
    ).toBeInTheDocument();
  });

  it("usa a mensagem genérica no 500", async () => {
    mockApiError("post", "/auth/login", 500, {});
    renderWithProviders(<LoginForm />);

    await fillAndSubmit(USER.email, PASSWORD);

    expect(
      await screen.findByText("Não foi possível entrar. Tente novamente."),
    ).toBeInTheDocument();
  });

  it("usa a mensagem de conexão numa falha de rede", async () => {
    mockNetworkError("post", "/auth/login");
    renderWithProviders(<LoginForm />);

    await fillAndSubmit(USER.email, PASSWORD);

    expect(
      await screen.findByText("Não foi possível falar com o servidor. Verifique sua conexão."),
    ).toBeInTheDocument();
  });

  it("limpa a mensagem de erro numa nova tentativa bem-sucedida", async () => {
    seedAccount();
    renderWithProviders(<LoginForm />);

    await fillAndSubmit(USER.email, "senha errada qualquer");
    await screen.findByText("E-mail ou senha incorretos.");

    await userEvent.clear(screen.getByLabelText("Senha"));
    await userEvent.type(screen.getByLabelText("Senha"), PASSWORD);
    await userEvent.click(screen.getByRole("button", { name: "Entrar" }));

    await waitFor(() =>
      expect(screen.queryByText("E-mail ou senha incorretos.")).not.toBeInTheDocument(),
    );
    expect(routerAdapterMock.push).toHaveBeenCalledWith("/dashboard");
  });

  it("reabilita o botão depois do erro", async () => {
    renderWithProviders(<LoginForm />);

    await fillAndSubmit(USER.email, PASSWORD);
    await screen.findByText("E-mail ou senha incorretos.");

    expect(screen.getByRole("button", { name: "Entrar" })).toBeEnabled();
  });
});
