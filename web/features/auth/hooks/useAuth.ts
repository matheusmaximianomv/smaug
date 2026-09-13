"use client";

import { useEffect, useState } from "react";
import { useRouter } from "@/infra/router-adapter";
import { clearUserId, getUserId, setUserId } from "@/infra/session";
import { isInvalidSessionError } from "@/infra/api-error";
import { AuthService } from "../services/AuthService";
import type { AuthState } from "../types";

export function useAuth() {
  const router = useRouter();
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    userId: null,
    isAuthenticated: false,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const userId = getUserId();

    if (!userId) {
      setIsLoading(false);
      return;
    }

    AuthService.getUserById(userId)
      .then((user) => {
        setAuthState({ user, userId, isAuthenticated: true });
        setError(null);
      })
      .catch((err) => {
        if (isInvalidSessionError(err)) {
          clearUserId();
          setAuthState({ user: null, userId: null, isAuthenticated: false });
          return;
        }
        // Falha transitória (rede fora, 5xx): a sessão continua válida — perdemos
        // apenas os dados do perfil, que voltam no próximo carregamento.
        setAuthState({ user: null, userId, isAuthenticated: true });
        setError("Não foi possível carregar seu perfil. Tente novamente em instantes.");
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  const login = async (userId: string) => {
    const user = await AuthService.getUserById(userId);
    setUserId(userId);
    setAuthState({ user, userId, isAuthenticated: true });
    router.push("/dashboard");
  };

  const logout = () => {
    clearUserId();
    setAuthState({ user: null, userId: null, isAuthenticated: false });
    router.push("/login");
  };

  return {
    ...authState,
    isLoading,
    error,
    login,
    logout,
  };
}
