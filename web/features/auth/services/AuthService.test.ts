import { describe, expect, it, vi } from "vitest";
import { getAccessToken } from "@/infra/session";
import { db, mockApiError, mockNetworkError, seedDb } from "../../../tests/msw";
import { makeUser } from "../../../tests/fixtures";
import { loginAs } from "../../../tests/session";
import { bodyOf, recordRequests, signatures } from "../../../tests/requests";
import { AuthService } from "./AuthService";

// O interceptor de 401 do api-client chama `redirectToLogin` de verdade; sem o
// duplo, o jsdom imprime "Not implemented: navigation" a cada teste de 401.
vi.mock("@/infra/navigation", () => ({ redirectToLogin: vi.fn() }));

const REGISTER = {
  name: "Maria Souza",
  email: "maria@example.com",
  password: "senha muito segura",
};
const CREDENTIALS = { email: "maria@example.com", password: "senha muito segura" };

describe("AuthService.register", () => {
  it("faz POST em /auth/register com nome, e-mail e senha no corpo", async () => {
    const calls = recordRequests();

    await AuthService.register(REGISTER);

    expect(signatures(calls)).toEqual(["POST /auth/register"]);
    expect(await bodyOf(calls[0])).toEqual(REGISTER);
  });

  it("devolve a sessão aberta com o perfil, sem guardar o token por conta própria", async () => {
    const session = await AuthService.register(REGISTER);

    expect(session).toMatchObject({
      tokenType: "Bearer",
      user: { name: "Maria Souza", email: "maria@example.com" },
    });
    expect(session.accessToken).toBeTruthy();
    expect(db.users).toHaveLength(1);
    expect(getAccessToken()).toBeNull();
  });

  it("propaga o 409 de e-mail já cadastrado", async () => {
    seedDb({ users: [makeUser({ email: "maria@example.com" })] });

    await expect(AuthService.register(REGISTER)).rejects.toMatchObject({
      response: { status: 409, data: { error: "EMAIL_ALREADY_EXISTS" } },
    });
  });

  it("propaga falha de rede", async () => {
    mockNetworkError("post", "/auth/register");

    await expect(AuthService.register(REGISTER)).rejects.toThrowError();
  });
});

describe("AuthService.login", () => {
  it("faz POST em /auth/login com e-mail e senha no corpo", async () => {
    const user = makeUser();
    seedDb({ users: [user], passwords: { [user.id]: CREDENTIALS.password } });
    const calls = recordRequests();

    await AuthService.login(CREDENTIALS);

    expect(signatures(calls)).toEqual(["POST /auth/login"]);
    expect(await bodyOf(calls[0])).toEqual(CREDENTIALS);
  });

  it("devolve a sessão com o perfil do usuário", async () => {
    const user = makeUser();
    seedDb({ users: [user], passwords: { [user.id]: CREDENTIALS.password } });

    await expect(AuthService.login(CREDENTIALS)).resolves.toMatchObject({ user });
  });

  it("propaga o 401 de credenciais inválidas sem tentar renovar a sessão", async () => {
    const calls = recordRequests();

    await expect(AuthService.login(CREDENTIALS)).rejects.toMatchObject({
      response: { status: 401, data: { error: "INVALID_CREDENTIALS" } },
    });
    expect(signatures(calls)).toEqual(["POST /auth/login"]);
  });
});

describe("AuthService.logout", () => {
  it("faz POST em /auth/logout e encerra a sessão no servidor", async () => {
    loginAs();
    const calls = recordRequests();

    await AuthService.logout();

    expect(signatures(calls)).toEqual(["POST /auth/logout"]);
    expect(db.session).toBeNull();
  });
});

describe("AuthService.logoutAll", () => {
  it("faz POST em /auth/logout-all com o Bearer da aba", async () => {
    loginAs();
    const calls = recordRequests();

    await AuthService.logoutAll();

    expect(signatures(calls)).toEqual(["POST /auth/logout-all"]);
    expect(calls[0].headers.get("authorization")).toBe(`Bearer ${getAccessToken()}`);
    expect(db.session).toBeNull();
  });

  it("propaga o 401 sem renovar (rota de /auth/*)", async () => {
    mockApiError("post", "/auth/logout-all", 401, { error: "UNAUTHORIZED" });
    const calls = recordRequests();

    await expect(AuthService.logoutAll()).rejects.toMatchObject({ response: { status: 401 } });
    expect(signatures(calls)).toEqual(["POST /auth/logout-all"]);
  });
});

describe("AuthService.getMe", () => {
  it("faz GET em /users/me e devolve o perfil do dono do token", async () => {
    const user = loginAs(makeUser({ name: "João Silva" }));
    const calls = recordRequests();

    await expect(AuthService.getMe()).resolves.toEqual(user);
    expect(signatures(calls)).toEqual(["GET /users/me"]);
  });
});
