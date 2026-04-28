"use client";

import { useEffect, useState } from "react";
import { useRouter } from "@/infra/router-adapter";
import { StorageAdapter } from "@/infra/storage-adapter";
import { AuthService } from "../services/AuthService";
import type { User, AuthState } from "../types";

export function useAuth() {
  const router = useRouter();
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    userId: null,
    isAuthenticated: false,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const userId = StorageAdapter.get("userId");
    if (userId) {
      AuthService.getUserById(userId)
        .then((user) => {
          setAuthState({
            user,
            userId,
            isAuthenticated: true,
          });
        })
        .catch(() => {
          StorageAdapter.remove("userId");
          setAuthState({
            user: null,
            userId: null,
            isAuthenticated: false,
          });
        })
        .finally(() => {
          setIsLoading(false);
        });
    } else {
      setIsLoading(false);
    }
  }, []);

  const login = async (userId: string) => {
    try {
      const user = await AuthService.getUserById(userId);
      StorageAdapter.set("userId", userId);
      setAuthState({
        user,
        userId,
        isAuthenticated: true,
      });
      router.push("/dashboard");
    } catch (error) {
      throw new Error("Usuário não encontrado");
    }
  };

  const logout = () => {
    StorageAdapter.remove("userId");
    setAuthState({
      user: null,
      userId: null,
      isAuthenticated: false,
    });
    router.push("/login");
  };

  return {
    ...authState,
    isLoading,
    login,
    logout,
  };
}
