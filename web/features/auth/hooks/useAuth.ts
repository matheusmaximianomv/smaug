"use client";

import { useEffect, useState } from "react";
import { useRouter } from "@/infra/router-adapter";
import { clearSession, getAccessToken, hasSessionHint, setSession } from "@/infra/session";
import { refreshSession } from "@/infra/auth-refresh";
import { redirectToLogin } from "@/infra/navigation";
import { isInvalidSessionError } from "@/infra/api-error";
import { AuthService } from "../services/AuthService";
import type { AuthState, LoginInput, User } from "../types";

const DEFAULT_DESTINATION = "/dashboard";

/** Origem fictícia só para resolver `next` como URL; o que importa é se ela muda. */
const RESOLUTION_BASE = "http://smaug.invalid";

/** Caracteres de controle, espaço e `\`: o parser de URL descarta ou reinterpreta todos eles. */
const UNSAFE_CHARS = /[\s\\\u0000-\u001f\u007f]/;

/**
 * Destino depois do login (design D8): só um caminho interno do app. `//host` e `/\host` são
 * lidos pelo navegador como outro domínio, e o parser WHATWG apaga tab/CR/LF (`/\t/host` vira
 * `//host`) — aceitá-los seria um redirecionamento aberto. Por isso recusa esses caracteres em
 * qualquer posição e, além disso, resolve o valor como URL: se a origem mudar, não é interno.
 */
export function safeDestination(next: string | null): string {
  if (!next || !next.startsWith("/") || UNSAFE_CHARS.test(next)) return DEFAULT_DESTINATION;
  const url = new URL(next, RESOLUTION_BASE);
  if (url.origin !== RESOLUTION_BASE) return DEFAULT_DESTINATION;
  return `${url.pathname}${url.search}${url.hash}`;
}

/**
 * Perfil para retomar a sessão ao abrir o app. Com o access token em memória (navegação depois do
 * login), basta pedir o perfil; sem ele e com o indicador (recarga), a renovação silenciosa devolve
 * token e perfil de uma vez. Sem nenhum dos dois não há sessão a retomar.
 */
async function resumeSession(): Promise<User | null> {
  if (getAccessToken()) return AuthService.getMe();
  if (hasSessionHint()) return (await refreshSession()).user;
  return null;
}

export function useAuth() {
  const router = useRouter();
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    resumeSession()
      .then((user) => {
        setAuthState({ user, isAuthenticated: user !== null });
        setError(null);
      })
      .catch((err) => {
        // Renovação recusada (401): `refreshSession` já apagou o indicador e mandou para o login.
        if (isInvalidSessionError(err)) {
          setAuthState({ user: null, isAuthenticated: false });
          return;
        }
        // Falha transitória (rede fora, 5xx): a sessão continua válida — perdemos
        // apenas os dados do perfil, que voltam no próximo carregamento.
        setAuthState({ user: null, isAuthenticated: true });
        setError("Não foi possível carregar seu perfil. Tente novamente em instantes.");
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  /**
   * `next` é a rota que o `proxy.ts` registrou ao mandar para o login. Chega por parâmetro, e não
   * por `useSearchParams`, porque este hook também roda no layout de `(app)`: lá o hook de busca
   * exigiria um `<Suspense>` que tiraria o menu da renderização no servidor.
   */
  const login = async (input: LoginInput, next: string | null = null) => {
    const session = await AuthService.login(input);
    setSession(session.accessToken);
    setAuthState({ user: session.user, isAuthenticated: true });
    router.push(safeDestination(next));
  };

  /**
   * Encerra a sessão local mesmo que a API falhe ou esteja fora: a do servidor expira sozinha. A
   * troca de documento de `redirectToLogin` descarta o cache do React Query de quem saiu.
   */
  const endLocalSession = () => {
    clearSession();
    setAuthState({ user: null, isAuthenticated: false });
    redirectToLogin();
  };

  const logout = async () => {
    try {
      await AuthService.logout();
    } catch {
      // Sair nunca falha para o usuário (PRD §5.4).
    } finally {
      endLocalSession();
    }
  };

  const logoutAll = async () => {
    try {
      await AuthService.logoutAll().catch(async (err) => {
        // `/auth/*` não passa pela renovação do api-client; com o access token vencido, renova
        // aqui e tenta de novo, senão as sessões dos outros dispositivos continuariam valendo.
        if (!isInvalidSessionError(err)) throw err;
        await refreshSession();
        await AuthService.logoutAll();
      });
    } catch {
      // Sair nunca falha para o usuário (PRD §5.4).
    } finally {
      endLocalSession();
    }
  };

  return {
    ...authState,
    isLoading,
    error,
    login,
    logout,
    logoutAll,
  };
}
