import { http, HttpResponse } from "msw";
import type { AuthSession } from "@/infra/auth-refresh";
import type { User } from "@/features/auth/types";
import { url } from "../base";
import { db } from "../db";
import { makeUser } from "../../fixtures";

const ACCESS_PREFIX = "access-";

/**
 * Emite um access token novo para o usuário. O formato `access-<userId>-<n>` deixa o dono legível
 * em `GET /users/me` e torna cada renovação observável (`n` sobe a cada emissão).
 */
export function issueAccessToken(userId: string): string {
  db.issuedTokens += 1;
  return `${ACCESS_PREFIX}${userId}-${db.issuedTokens}`;
}

/** Abre a sessão do usuário no servidor simulado (o cookie `smaug_refresh`) e devolve o corpo. */
export function openSession(user: User): AuthSession {
  db.session = { userId: user.id };
  return {
    accessToken: issueAccessToken(user.id),
    tokenType: "Bearer",
    expiresIn: 600,
    user,
  };
}

/** Usuário dono do Bearer da requisição, ou `undefined` sem token válido. */
export function authenticatedUser(request: Request): User | undefined {
  const header = request.headers.get("authorization") ?? "";
  const token = header.startsWith(`Bearer ${ACCESS_PREFIX}`)
    ? header.slice(`Bearer ${ACCESS_PREFIX}`.length)
    : "";
  return db.users.find((user) => token.startsWith(`${user.id}-`));
}

const unauthorized = () =>
  HttpResponse.json({ error: "UNAUTHORIZED", message: "Authentication required" }, { status: 401 });

export const authHandlers = [
  http.post(url("/auth/register"), async ({ request }) => {
    const body = (await request.json()) as { name: string; email: string; password: string };
    if (db.users.some((u) => u.email === body.email)) {
      return HttpResponse.json({ error: "EMAIL_ALREADY_EXISTS" }, { status: 409 });
    }
    const created = makeUser({ name: body.name, email: body.email });
    db.users.push(created);
    db.passwords[created.id] = body.password;
    return HttpResponse.json(openSession(created), { status: 201 });
  }),

  http.post(url("/auth/login"), async ({ request }) => {
    const body = (await request.json()) as { email: string; password: string };
    const user = db.users.find((u) => u.email === body.email);
    if (!user || db.passwords[user.id] !== body.password) {
      return HttpResponse.json({ error: "INVALID_CREDENTIALS" }, { status: 401 });
    }
    return HttpResponse.json(openSession(user));
  }),

  http.post(url("/auth/refresh"), () => {
    const user = db.users.find((u) => u.id === db.session?.userId);
    if (!user) {
      db.session = null;
      return HttpResponse.json({ error: "INVALID_REFRESH_TOKEN" }, { status: 401 });
    }
    return HttpResponse.json(openSession(user));
  }),

  http.post(url("/auth/logout"), () => {
    db.session = null;
    return new HttpResponse(null, { status: 204 });
  }),

  http.post(url("/auth/logout-all"), ({ request }) => {
    if (!authenticatedUser(request)) return unauthorized();
    db.session = null;
    return new HttpResponse(null, { status: 204 });
  }),

  http.get(url("/users/me"), ({ request }) => {
    const user = authenticatedUser(request);
    return user ? HttpResponse.json(user) : unauthorized();
  }),
];
