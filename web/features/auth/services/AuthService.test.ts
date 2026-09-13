import { describe, expect, it, vi } from "vitest";
import { db, mockApiError, mockNetworkError, seedDb } from "../../../tests/msw";
import { makeUser } from "../../../tests/fixtures";
import { bodyOf, recordRequests, signatures } from "../../../tests/requests";
import { AuthService } from "./AuthService";

// O interceptor de 401 do api-client chama `redirectToLogin` de verdade; sem o
// duplo, o jsdom imprime "Not implemented: navigation" a cada teste de 401.
vi.mock("@/infra/navigation", () => ({ redirectToLogin: vi.fn() }));

describe("AuthService.register", () => {
  it("faz POST em /users", async () => {
    const calls = recordRequests();

    await AuthService.register({ name: "Maria Souza", email: "maria@example.com" });

    expect(signatures(calls)).toEqual(["POST /users"]);
  });

  it("envia nome e e-mail no corpo", async () => {
    const calls = recordRequests();

    await AuthService.register({ name: "Maria Souza", email: "maria@example.com" });

    expect(await bodyOf(calls[0])).toEqual({ name: "Maria Souza", email: "maria@example.com" });
  });

  it("devolve o usuário criado", async () => {
    const user = await AuthService.register({ name: "Maria Souza", email: "maria@example.com" });

    expect(user).toMatchObject({ name: "Maria Souza", email: "maria@example.com" });
    expect(user.id).toBeTruthy();
    expect(db.users).toHaveLength(1);
  });

  it("propaga o 409 de e-mail já cadastrado", async () => {
    seedDb({ users: [makeUser({ email: "maria@example.com" })] });

    await expect(
      AuthService.register({ name: "Outra Maria", email: "maria@example.com" }),
    ).rejects.toMatchObject({
      response: { status: 409, data: { error: "EMAIL_ALREADY_EXISTS" } },
    });
  });

  it("propaga falha de rede", async () => {
    mockNetworkError("post", "/users");

    await expect(
      AuthService.register({ name: "Maria", email: "maria@example.com" }),
    ).rejects.toThrowError();
  });
});

describe("AuthService.getUserById", () => {
  it("faz GET em /users/:id", async () => {
    const user = makeUser();
    seedDb({ users: [user] });
    const calls = recordRequests();

    await AuthService.getUserById(user.id);

    expect(signatures(calls)).toEqual([`GET /users/${user.id}`]);
  });

  it("devolve o usuário encontrado", async () => {
    const user = makeUser({ name: "João Silva" });
    seedDb({ users: [user] });

    await expect(AuthService.getUserById(user.id)).resolves.toEqual(user);
  });

  it("propaga o 404 de usuário inexistente", async () => {
    await expect(
      AuthService.getUserById("00000000-0000-4000-8000-000000000099"),
    ).rejects.toMatchObject({ response: { status: 404, data: { error: "USER_NOT_FOUND" } } });
  });

  it("propaga o 401 de sessão inválida", async () => {
    const user = makeUser();
    seedDb({ users: [user] });
    mockApiError("get", `/users/${user.id}`, 401, { error: "UNAUTHORIZED" });

    await expect(AuthService.getUserById(user.id)).rejects.toMatchObject({
      response: { status: 401 },
    });
  });
});
