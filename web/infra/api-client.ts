import axios, { AxiosError, type InternalAxiosRequestConfig } from "axios";
import { getAccessToken } from "./session";
import { refreshSession, settleRefresh } from "./auth-refresh";

/**
 * A única instância axios do app. Fala só com a origem do web (`/api`), que o route handler
 * `app/api/[...path]/route.ts` repassa para a API: o navegador nunca chama o domínio da API, e o
 * cookie `smaug_refresh` vai sozinho, sem `withCredentials` nem preflight de CORS.
 */
const apiClient = axios.create({
  baseURL: "/api",
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
});

interface RetriableConfig extends InternalAxiosRequestConfig {
  /** Marca a requisição que já foi refeita, para não renovar em laço. */
  _retried?: boolean;
  /** Access token com que a requisição saiu (`null` sem sessão em memória). */
  _sentToken?: string | null;
}

// Requisição que sai durante uma renovação (ex.: consultas da página enquanto a retomada da sessão
// renova) espera o token novo, em vez de sair sem ele e voltar 401.
apiClient.interceptors.request.use(async (config: RetriableConfig) => {
  await settleRefresh();
  const token = getAccessToken();
  config._sentToken = token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as RetriableConfig | undefined;
    // 401 em `/auth/*` (login errado, renovação recusada) não é "token expirado": só rejeita.
    const isAuthRoute = original?.url?.startsWith("/auth/") ?? false;
    if (error.response?.status !== 401 || !original || isAuthRoute || original._retried) {
      return Promise.reject(error);
    }

    // Single-flight por aba: só renova quem saiu com o token atual. Uma requisição que saiu sem
    // token ou com um já trocado chega depois de uma renovação que já aconteceu, e renovar de novo
    // giraria o refresh token à toa — o que dá 409 na outra aba. Ela só é refeita com o atual.
    // Só uma renovação recusada com 401 encerra a sessão (`refreshSession` cuida disso). Rede ou
    // 5xx são transitórios: o erro da renovação chega a quem chamou e a sessão continua.
    const current = getAccessToken();
    if (current === null || current === original._sentToken) {
      await refreshSession();
    }
    original._retried = true;
    return apiClient(original);
  },
);

export { apiClient };
