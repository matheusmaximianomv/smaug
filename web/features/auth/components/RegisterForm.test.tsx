import { afterEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "../../../tests/render";
import { mockApiError, seedDb } from "../../../tests/msw";
import { makeUser } from "../../../tests/fixtures";
import { RegisterForm } from "./RegisterForm";

vi.mock("@/infra/navigation", () => ({ redirectToLogin: vi.fn() }));

const { redirectToLogin } = await import("@/infra/navigation");

const writeText = vi.fn().mockResolvedValue(undefined);
Object.defineProperty(navigator, "clipboard", {
  configurable: true,
  value: { writeText },
});

afterEach(() => {
  vi.useRealTimers();
});

async function submitValid(user = userEvent) {
  await user.type(screen.getByLabelText("Nome"), "Maria Souza");
  await user.type(screen.getByLabelText("Email"), "maria@example.com");
  await user.click(screen.getByRole("button", { name: "Criar Conta" }));
}

describe("RegisterForm: validação", () => {
  it("exige o nome", async () => {
    renderWithProviders(<RegisterForm />);

    await userEvent.type(screen.getByLabelText("Email"), "maria@example.com");
    await userEvent.click(screen.getByRole("button", { name: "Criar Conta" }));

    expect(await screen.findByText("Nome é obrigatório")).toBeInTheDocument();
  });

  it("exige um e-mail válido", async () => {
    renderWithProviders(<RegisterForm />);

    await userEvent.type(screen.getByLabelText("Nome"), "Maria Souza");
    // O input é type="email": jsdom aplica validação nativa e barraria o submit
    // de um valor sem "@". Este passa no HTML5 e falha no schema (não tem TLD).
    await userEvent.type(screen.getByLabelText("Email"), "nao-e-email");
    await userEvent.click(screen.getByRole("button", { name: "Criar Conta" }));

    expect(await screen.findByText("Email inválido")).toBeInTheDocument();
  });

  it("rejeita nome acima de 255 caracteres", async () => {
    renderWithProviders(<RegisterForm />);

    // paste() em vez de type(): digitar 256 caracteres dispara 256 eventos e
    // estoura o timeout de 5 s sob instrumentação de cobertura.
    await userEvent.click(screen.getByLabelText("Nome"));
    await userEvent.paste("x".repeat(256));
    await userEvent.type(screen.getByLabelText("Email"), "maria@example.com");
    await userEvent.click(screen.getByRole("button", { name: "Criar Conta" }));

    expect(await screen.findByText("Nome muito longo")).toBeInTheDocument();
  });
});

describe("RegisterForm: sucesso", () => {
  it("troca para a tela de confirmação com o id em campo readOnly", async () => {
    renderWithProviders(<RegisterForm />);

    await submitValid();

    expect(await screen.findByText("Cadastro realizado com sucesso!")).toBeInTheDocument();
    const idField = screen.getByRole("textbox");
    expect(idField).toHaveAttribute("readOnly");
    expect((idField as HTMLInputElement).value).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Criar Conta" })).not.toBeInTheDocument();
  });

  it('"Ir para Login" chama redirectToLogin', async () => {
    renderWithProviders(<RegisterForm />);

    await submitValid();
    await screen.findByText("Cadastro realizado com sucesso!");
    await userEvent.click(screen.getByRole("button", { name: "Ir para Login" }));

    expect(redirectToLogin).toHaveBeenCalledTimes(1);
  });
});

describe("RegisterForm: cópia do id", () => {
  it("copia o id para a área de transferência e devolve o ícone após 2 s", async () => {
    renderWithProviders(<RegisterForm />);

    // O cadastro roda com timers reais: o MSW + axios dependem deles.
    await submitValid();
    await screen.findByText("Cadastro realizado com sucesso!");

    // `userEvent` trava com os fake timers do Vitest neste stack (verificado):
    // o clique daqui em diante vai por `fireEvent`, que o RTL já embrulha em act.
    vi.useFakeTimers();

    const idField = screen.getByRole("textbox") as HTMLInputElement;
    // O botão de copiar é o único sem nome acessível na tela de confirmação.
    const copyButton = screen
      .getAllByRole("button")
      .find((b) => b.textContent === "")! as HTMLButtonElement;

    const iconBefore = copyButton.innerHTML;
    fireEvent.click(copyButton);

    expect(writeText).toHaveBeenCalledWith(idField.value);
    // Sem `waitFor` aqui: com timers falsos ele não sabe avançar o relógio do
    // Vitest e ficaria pendurado até o timeout do teste.
    expect(copyButton.innerHTML).not.toBe(iconBefore);

    act(() => {
      vi.advanceTimersByTime(2000);
    });

    expect(copyButton.innerHTML).toBe(iconBefore);
  });
});

describe("RegisterForm: erro", () => {
  it("mostra a mensagem de e-mail já cadastrado", async () => {
    seedDb({ users: [makeUser({ email: "maria@example.com" })] });
    renderWithProviders(<RegisterForm />);

    await submitValid();

    expect(await screen.findByText("Já existe uma conta com este e-mail.")).toBeInTheDocument();
    expect(screen.queryByText("Cadastro realizado com sucesso!")).not.toBeInTheDocument();
  });

  it("usa a mensagem genérica em erro sem código mapeado", async () => {
    mockApiError("post", "/users", 500, {});
    renderWithProviders(<RegisterForm />);

    await submitValid();

    expect(await screen.findByText("Erro ao criar conta. Tente novamente.")).toBeInTheDocument();
  });
});
