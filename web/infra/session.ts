/**
 * Sessão do usuário, com o cookie como **fonte única de verdade**.
 *
 * O middleware (`web/middleware.ts`) lê esse mesmo cookie no servidor para liberar
 * as rotas de `(app)`. Manter uma segunda cópia em `localStorage` permitia que as
 * duas divergissem — cookie presente e `localStorage` vazio deixava o app em um
 * laço infinito entre `/login` e `/dashboard`.
 */

const COOKIE_NAME = "userId";
const MAX_AGE_SECONDS = 365 * 24 * 60 * 60;

export function getUserId(): string | null {
  if (typeof document === "undefined") return null;

  const entry = document.cookie.split("; ").find((row) => row.startsWith(`${COOKIE_NAME}=`));

  if (!entry) return null;

  const value = decodeURIComponent(entry.slice(COOKIE_NAME.length + 1));
  return value || null;
}

export function setUserId(userId: string): void {
  if (typeof document === "undefined") return;
  document.cookie = `${COOKIE_NAME}=${encodeURIComponent(userId)};path=/;max-age=${MAX_AGE_SECONDS};SameSite=Lax`;
}

export function clearUserId(): void {
  if (typeof document === "undefined") return;
  document.cookie = `${COOKIE_NAME}=;path=/;max-age=0;SameSite=Lax`;
}
