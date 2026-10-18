"use client";

import { useMutation } from "@tanstack/react-query";
import type { AxiosError } from "axios";
import { useRouter } from "@/infra/router-adapter";
import { setSession } from "@/infra/session";
import { AuthService } from "../services/AuthService";
import type { RegisterInput } from "../types";

/**
 * Cadastro que já abre a sessão: com sucesso, guarda o access token e leva ao dashboard, sem etapa
 * de login. Sem toast nem invalidação — o formulário mostra o erro no próprio corpo.
 */
export function useRegister() {
  const router = useRouter();
  const mutation = useMutation({
    mutationFn: (data: RegisterInput) => AuthService.register(data),
    onSuccess: (session) => {
      setSession(session.accessToken);
      router.push("/dashboard");
    },
  });

  const errorCode = (mutation.error as AxiosError<{ error?: string }> | null)?.response?.data
    ?.error;

  return {
    ...mutation,
    /** O e-mail já tem conta: o formulário oferece o caminho para "Entrar". */
    isEmailTaken: errorCode === "EMAIL_ALREADY_EXISTS",
  };
}
