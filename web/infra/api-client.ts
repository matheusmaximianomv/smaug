import axios, { AxiosError } from "axios";
import { clearUserId, getUserId } from "./session";

const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000",
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
});

apiClient.interceptors.request.use((config) => {
  const userId = getUserId();
  if (userId && config.headers) {
    config.headers["X-User-Id"] = userId;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    // Só 401 encerra a sessão. Falha de rede ou 5xx são transitórios e não devem
    // derrubar o login — quem chamou trata o erro.
    if (error.response?.status === 401) {
      clearUserId();
      if (typeof window !== "undefined" && window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  },
);

export { apiClient };
