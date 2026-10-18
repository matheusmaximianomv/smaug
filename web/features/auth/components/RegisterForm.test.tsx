import { describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { getAccessToken } from "@/infra/session";
import { renderWithProviders } from "../../../tests/render";
import { db, mockApiError, seedDb } from "../../../tests/msw";
import { makeUser } from "../../../tests/fixtures";
import { bodyOf, recordRequests } from "../../../tests/requests";
import { routerAdapterMock } from "../../../tests/router";
import { RegisterForm } from "./RegisterForm";

vi.mock("@/infra/router-adapter", async () => {
  const { routerAdapterMock: router } = await import("../../../tests/router");
  return { useRouter: () => router };
});

const PASSWORD = "senha muito segura";

interface Fields {
  name?: string;
  email?: string;
  password?: string;
  confirmation?: string;
}

async function fillAndSubmit({
  name = "Maria Souza",
  email = "maria@example.com",
  password = PASSWORD,
  confirmation = password,
}: Fields = {}) {
  if (name) {
    // paste() em vez de type(): digitar centenas de caracteres estoura o timeout sob cobertura.
    await userEvent.click(screen.getByLabelText("Nome"));
    await userEvent.paste(name);
  }
  if (email) await userEvent.type(screen.getByLabelText("E-mail"), email);
  if (password) await userEvent.type(screen.getByLabelText("Senha"), password);
  if (confirmation) await userEvent.type(screen.getByLabelText("Confirmar senha"), confirmation);
  await userEvent.click(screen.getByRole("button", { name: "Criar Conta" }));
}

describe("RegisterForm: campos", () => {
  it("orienta a senha e a confirmação pelo placeholder", () => {
    renderWithProviders(<RegisterForm />);

    expect(screen.getByLabelText("Senha")).toHaveAttribute(
      "placeholder",
      "Pelo menos 12 caracteres",
    );
    expect(screen.getByLabelText("Confirmar senha")).toHaveAttribute(
      "placeholder",
      "Repita a senha",
    );
  });
});

describe("RegisterForm: validação", () => {
  it("exige o nome", async () => {
    renderWithProviders(<RegisterForm />);

    await fillAndSubmit({ name: "" });

    expect(await screen.findByText("Nome é obrigatório")).toBeInTheDocument();
  });

  it("exige um e-mail válido", async () => {
    renderWithProviders(<RegisterForm />);

    await fillAndSubmit({ email: "nao-e-email" });

    expect(await screen.findByText("E-mail inválido")).toBeInTheDocument();
  });

  it("rejeita nome acima de 255 caracteres", async () => {
    renderWithProviders(<RegisterForm />);

    await fillAndSubmit({ name: "x".repeat(256) });

    expect(await screen.findByText("Nome muito longo")).toBeInTheDocument();
  });

  it("mostra o erro de senha curta no campo de senha e não chama a API", async () => {
    const calls = recordRequests();
    renderWithProviders(<RegisterForm />);

    await fillAndSubmit({ password: "curta-11chr" });

    expect(
      await screen.findByText("A senha deve ter pelo menos 12 caracteres"),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Senha")).toHaveAttribute("aria-invalid", "true");
    expect(calls).toHaveLength(0);
  });

  it("mostra a confirmação divergente no campo de confirmação e não chama a API", async () => {
    const calls = recordRequests();
    renderWithProviders(<RegisterForm />);

    await fillAndSubmit({ confirmation: "outra senha qualquer" });

    expect(await screen.findByText("As senhas não coincidem")).toBeInTheDocument();
    expect(screen.getByLabelText("Confirmar senha")).toHaveAttribute("aria-invalid", "true");
    expect(calls).toHaveLength(0);
  });
});

describe("RegisterForm: sucesso", () => {
  it("cria a conta sem enviar a confirmação, abre a sessão e leva ao dashboard", async () => {
    const calls = recordRequests();
    renderWithProviders(<RegisterForm />);

    await fillAndSubmit();

    await waitFor(() => expect(routerAdapterMock.push).toHaveBeenCalledWith("/dashboard"));
    expect(await bodyOf(calls[0])).toEqual({
      name: "Maria Souza",
      email: "maria@example.com",
      password: PASSWORD,
    });
    expect(db.users).toHaveLength(1);
    expect(getAccessToken()).not.toBeNull();
  });

  it("não mostra o ID do usuário em nenhum momento", async () => {
    renderWithProviders(<RegisterForm />);

    await fillAndSubmit();
    await waitFor(() => expect(routerAdapterMock.push).toHaveBeenCalled());

    expect(screen.queryByText(db.users[0].id)).not.toBeInTheDocument();
    expect(screen.queryByText(/copie seu id/i)).not.toBeInTheDocument();
  });
});

describe("RegisterForm: erro", () => {
  it("no 409 mostra que o e-mail já tem conta e oferece o caminho para Entrar", async () => {
    seedDb({ users: [makeUser({ email: "maria@example.com" })] });
    renderWithProviders(<RegisterForm />);

    await fillAndSubmit();

    expect(await screen.findByText("Já existe uma conta com este e-mail.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Entrar" })).toHaveAttribute("href", "/login");
    expect(routerAdapterMock.push).not.toHaveBeenCalled();
  });

  it("no 429 mostra a mensagem de limite, sem o link para Entrar", async () => {
    mockApiError("post", "/auth/register", 429, { error: "TOO_MANY_REQUESTS" });
    renderWithProviders(<RegisterForm />);

    await fillAndSubmit();

    expect(
      await screen.findByText("Muitas tentativas. Aguarde alguns minutos e tente novamente."),
    ).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Entrar" })).not.toBeInTheDocument();
  });

  it("usa a mensagem genérica em erro sem código mapeado", async () => {
    mockApiError("post", "/auth/register", 500, {});
    renderWithProviders(<RegisterForm />);

    await fillAndSubmit();

    expect(await screen.findByText("Erro ao criar conta. Tente novamente.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Criar Conta" })).toBeEnabled();
  });
});
