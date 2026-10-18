/**
 * Navegação "dura" (troca de documento), isolada do resto do app.
 *
 * Existe como costura por dois motivos:
 * 1. `window.location` e `location.href` são **não-configuráveis** no jsdom, então
 *    um teste não consegue espionar a atribuição direta — o destino do redirect de
 *    sessão expirada ficaria sem cobertura.
 * 2. A mesma lógica estava duplicada no interceptor 401 do `api-client` e no
 *    `RegisterForm`.
 */

/** Manda o usuário para o login, a menos que ele já esteja lá. */
export function redirectToLogin(): void {
  if (typeof window === "undefined") return;
  if (window.location.pathname === "/login") return;
  // A troca de documento é proposital: descarta o cache do React Query da sessão encerrada.
  // eslint-disable-next-line @next/next/no-location-assign-relative-destination
  window.location.href = "/login";
}
