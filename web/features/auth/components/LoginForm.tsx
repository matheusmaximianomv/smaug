"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/shared/components/Button";
import { Input } from "@/shared/components/Input";
import { useAuth } from "../hooks/useAuth";
import { getApiErrorMessage } from "@/infra/api-error";
import { loginSchema, type LoginFormData } from "../types/schemas";

interface LoginFormProps {
  /** Rota protegida que levou ao login (`?next=`); validada pelo `useAuth` antes de navegar. */
  next?: string | null;
}

export function LoginForm({ next = null }: LoginFormProps) {
  const { login } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    setError(null);
    try {
      await login(data, next);
    } catch (err) {
      setError(getApiErrorMessage(err, "Não foi possível entrar. Tente novamente."));
    } finally {
      setIsLoading(false);
    }
  };

  // noValidate: a validação nativa do campo type="email" barraria o submit antes do React; o
  // schema é a fonte única de validação.
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      <Input
        label="E-mail"
        type="email"
        autoComplete="email"
        placeholder="seu@email.com"
        error={errors.email?.message}
        {...register("email")}
      />
      <Input
        label="Senha"
        type="password"
        autoComplete="current-password"
        placeholder="Sua senha"
        error={errors.password?.message}
        {...register("password")}
      />
      {error && (
        <div
          role="alert"
          className="rounded-lg border border-red bg-red-light p-3 text-sm text-red"
        >
          {error}
        </div>
      )}
      <Button type="submit" className="w-full" isLoading={isLoading}>
        Entrar
      </Button>
    </form>
  );
}
