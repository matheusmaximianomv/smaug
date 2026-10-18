import type { User } from "@/features/auth/types";
import { clearSession, setSession } from "@/infra/session";
import { db } from "./msw/db";
import { openSession } from "./msw/handlers/auth";
import { makeUser } from "./fixtures";

/**
 * Loga o usuário como o login real deixaria a aba: access token em memória e indicador
 * `smaug_session` (pelo `infra/session.ts` de verdade, sem mock, para o interceptor do api-client
 * ler o token real) e, no servidor simulado, o refresh token válido — então um 401 renova e refaz.
 * O usuário entra em `db.users` se ainda não estiver lá, para `/users/me` e `/auth/refresh`.
 */
export function loginAs(user: User = makeUser()): User {
  if (!db.users.some((u) => u.id === user.id)) db.users.push(user);
  setSession(openSession(user).accessToken);
  return user;
}

/** Encerra a sessão dos dois lados: a aba esquece o token e o servidor, o refresh. */
export function logout(): void {
  clearSession();
  db.session = null;
}
