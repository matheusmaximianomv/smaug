import axios, { AxiosError } from "axios";
import { clearSession, setSession } from "./session";
import { redirectToLogin } from "./navigation";

/** Perfil devolvido junto com cada sessão aberta ou renovada. */
export interface SessionUser {
  id: string;
  name: string;
  email: string;
  createdAt: string;
}

/** Corpo de `POST /auth/register`, `/auth/login` e `/auth/refresh`. */
export interface AuthSession {
  accessToken: string;
  tokenType: "Bearer";
  expiresIn: number;
  user: SessionUser;
}

/** Caminho da renovação visto pelo navegador: o repasse `/api` do web, na mesma origem. */
export const REFRESH_URL = "/api/auth/refresh";

/**
 * Espera antes de repetir uma renovação que voltou 409 `REFRESH_TOKEN_CONFLICT`: dá tempo para
 * o `Set-Cookie` da renovação concorrente (outra aba) chegar ao navegador.
 */
const CONFLICT_RETRY_DELAY_MS = 250;

let inFlight: Promise<AuthSession> | null = null;

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Chama a renovação sem o `apiClient`: o interceptor dele depende deste módulo, e a renovação não
 * leva Bearer nem pode disparar outra renovação. O cookie `smaug_refresh` vai sozinho (mesma
 * origem, sem `withCredentials`).
 */
async function postRefresh(): Promise<AuthSession> {
  const { data } = await axios.post<AuthSession>(REFRESH_URL, undefined, { timeout: 10000 });
  return data;
}

async function renew(): Promise<AuthSession> {
  try {
    let session: AuthSession;
    try {
      session = await postRefresh();
    } catch (error) {
      if ((error as AxiosError).response?.status !== 409) throw error;
      await wait(CONFLICT_RETRY_DELAY_MS);
      session = await postRefresh();
    }
    setSession(session.accessToken);
    return session;
  } catch (error) {
    // Só a renovação recusada com 401 encerra a sessão. O indicador sai ANTES do redirect, senão o
    // proxy devolveria o usuário a `/dashboard` e recriaria o laço com `/login`.
    if ((error as AxiosError).response?.status === 401) {
      clearSession();
      redirectToLogin();
    }
    throw error;
  }
}

/**
 * Renova a sessão com o cookie `httpOnly`, uma vez por aba: chamadas simultâneas recebem a mesma
 * promessa. Sucesso guarda o access token novo e devolve a sessão (com o perfil, para a retomada
 * ao abrir o app). 409 é repetido uma vez; 401 encerra a sessão e manda para `/login`; rede e 5xx
 * só rejeitam, sem encerrar nada.
 */
export function refreshSession(): Promise<AuthSession> {
  inFlight ??= renew().finally(() => {
    inFlight = null;
  });
  return inFlight;
}

/**
 * Espera a renovação em andamento nesta aba, se houver, sem propagar a falha dela: quem espera só
 * quer sair com o token mais novo. Sem renovação em voo, resolve na hora.
 */
export async function settleRefresh(): Promise<void> {
  await inFlight?.catch(() => undefined);
}
