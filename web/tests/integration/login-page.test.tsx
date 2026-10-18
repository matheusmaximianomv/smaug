import { describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import LoginPage from "@/app/(auth)/login/page";
import { getAccessToken, hasSessionHint } from "@/infra/session";
import { renderWithProviders } from "../render";
import { mockApiError, seedDb } from "../msw";
import { makeUser } from "../fixtures";
import { recordRequests, signatures } from "../requests";
import { routerAdapterMock } from "../router";

vi.mock("@/infra/router-adapter", async () => {
  const { routerAdapterMock: router } = await import("../router");
  return { useRouter: () => router };
});

// O 401 de uma renovação chamaria a navegação dura; aqui ela não deve acontecer.
vi.mock("@/infra/navigation", () => ({ redirectToLogin: vi.fn() }));

const USER = makeUser();
const PASSWORD = "senha muito segura";

/** A página é um Server Component assíncrono: resolve com o `?next=` e renderiza o resultado. */
async function renderPage(search: Record<string, string | string[]> = {}) {
  const page = await LoginPage({ searchParams: Promise.resolve(search) });
  return renderWithProviders(page, { pathname: "/login" });
}

async function submit(email: string, password: string) {
  await userEvent.type(screen.getByLabelText("E-mail"), email);
  await userEvent.type(screen.getByLabelText("Senha"), password);
  await userEvent.click(screen.getByRole("button", { name: "Entrar" }));
}

describe("página de login", () => {
  it("apresenta a marca e o caminho para o cadastro", async () => {
    await renderPage();

    expect(screen.getByRole("heading", { name: "SMAUG" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Criar conta" })).toHaveAttribute("href", "/cadastro");
  });

  it("entra de ponta a ponta: guarda o token, escreve o indicador e navega para o dashboard", async () => {
    seedDb({ users: [USER], passwords: { [USER.id]: PASSWORD } });
    await renderPage();

    await submit(USER.email, PASSWORD);

    await waitFor(() => expect(routerAdapterMock.push).toHaveBeenCalledWith("/dashboard"));
    expect(getAccessToken()).toMatch(/^access-/);
    expect(hasSessionHint()).toBe(true);
  });

  it("depois de entrar volta à rota protegida que o usuário tentou abrir", async () => {
    seedDb({ users: [USER], passwords: { [USER.id]: PASSWORD } });
    await renderPage({ next: "/receitas" });

    await submit(USER.email, PASSWORD);

    await waitFor(() => expect(routerAdapterMock.push).toHaveBeenCalledWith("/receitas"));
  });

  it("com ?next externo ou repetido vai para o dashboard", async () => {
    seedDb({ users: [USER], passwords: { [USER.id]: PASSWORD } });
    await renderPage({ next: ["/receitas", "/despesas"] });

    await submit(USER.email, PASSWORD);

    await waitFor(() => expect(routerAdapterMock.push).toHaveBeenCalledWith("/dashboard"));
  });

  it("com ?next que o navegador lê como outro domínio (tab apagado pelo parser) vai para o dashboard", async () => {
    seedDb({ users: [USER], passwords: { [USER.id]: PASSWORD } });
    await renderPage({ next: decodeURIComponent("/%09/malicioso.exemplo") });

    await submit(USER.email, PASSWORD);

    await waitFor(() => expect(routerAdapterMock.push).toHaveBeenCalledWith("/dashboard"));
  });

  it("no INVALID_CREDENTIALS mostra a mensagem, fica no login e não tenta renovar", async () => {
    seedDb({ users: [USER], passwords: { [USER.id]: PASSWORD } });
    const calls = recordRequests();
    await renderPage();

    await submit(USER.email, "senha errada qualquer");

    expect(await screen.findByText("E-mail ou senha incorretos.")).toBeInTheDocument();
    expect(signatures(calls)).toEqual(["POST /auth/login"]);
    expect(getAccessToken()).toBeNull();
    expect(hasSessionHint()).toBe(false);
    expect(routerAdapterMock.push).not.toHaveBeenCalled();
  });

  it("a mesma mensagem vale para um e-mail sem conta", async () => {
    await renderPage();

    await submit("ninguem@example.com", PASSWORD);

    expect(await screen.findByText("E-mail ou senha incorretos.")).toBeInTheDocument();
  });

  it("no TOO_MANY_REQUESTS mostra a mensagem de limite e não abre sessão", async () => {
    mockApiError("post", "/auth/login", 429, { error: "TOO_MANY_REQUESTS" });
    await renderPage();

    await submit(USER.email, PASSWORD);

    expect(
      await screen.findByText("Muitas tentativas. Aguarde alguns minutos e tente novamente."),
    ).toBeInTheDocument();
    expect(getAccessToken()).toBeNull();
  });

  it("no 500 mostra a mensagem genérica e não abre sessão", async () => {
    mockApiError("post", "/auth/login", 500, {});
    await renderPage();

    await submit(USER.email, PASSWORD);

    expect(
      await screen.findByText("Não foi possível entrar. Tente novamente."),
    ).toBeInTheDocument();
    expect(hasSessionHint()).toBe(false);
  });

  it("com e-mail fora do formato nem chega à API", async () => {
    const calls = recordRequests();
    await renderPage();

    await submit("abc", PASSWORD);

    expect(await screen.findByText("E-mail inválido")).toBeInTheDocument();
    expect(calls).toHaveLength(0);
    expect(routerAdapterMock.push).not.toHaveBeenCalled();
  });
});
