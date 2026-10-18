/**
 * Sessão do usuário no navegador.
 *
 * A fonte da verdade é **o servidor**: o refresh token vive só no cookie `httpOnly`
 * `smaug_refresh`, que nenhum script da página lê. Aqui ficam apenas:
 *
 * - o **access token**, numa variável de módulo — nunca em cookie, `localStorage` ou
 *   `sessionStorage`. Recarregar a página o perde, e a sessão é retomada por uma renovação;
 * - o **indicador** `smaug_session=1`, um cookie sem segredo que serve só para o `proxy.ts`
 *   decidir entre `/login` e `/dashboard`. Ele pode divergir do estado real (refresh expirado com
 *   indicador presente) sem recriar o laço `/login` ↔ `/dashboard`, porque o único caminho que
 *   encerra a sessão — renovação recusada com 401 — chama `clearSession()` **antes** de redirecionar.
 *
 * O cookie `userId` da versão anterior não vale nada: é apagado no primeiro carregamento do módulo.
 */

const HINT_COOKIE = "smaug_session";
const LEGACY_COOKIE = "userId";
/**
 * Vida do indicador: a vida máxima da sessão (30 dias, PRD RN-07). Um cookie de sessão do navegador
 * sumiria ao fechar o browser e mandaria para `/login` quem ainda tem refresh válido.
 */
const HINT_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;

let accessToken: string | null = null;

function writeCookie(name: string, value: string, maxAge: number): void {
  document.cookie = `${name}=${value};path=/;max-age=${maxAge};SameSite=Lax`;
}

if (typeof document !== "undefined") writeCookie(LEGACY_COOKIE, "", 0);

/** Access token da aba, ou `null` quando ainda não houve login/renovação. */
export function getAccessToken(): string | null {
  return accessToken;
}

/** Guarda o access token em memória e escreve o indicador de sessão. */
export function setSession(token: string): void {
  accessToken = token;
  if (typeof document === "undefined") return;
  writeCookie(HINT_COOKIE, "1", HINT_MAX_AGE_SECONDS);
}

/** Esquece o access token e apaga o indicador de sessão. */
export function clearSession(): void {
  accessToken = null;
  if (typeof document === "undefined") return;
  writeCookie(HINT_COOKIE, "", 0);
}

/** Indica se o navegador tem o indicador de sessão — usado para decidir se vale renovar. */
export function hasSessionHint(): boolean {
  if (typeof document === "undefined") return false;
  return document.cookie.split("; ").includes(`${HINT_COOKIE}=1`);
}
