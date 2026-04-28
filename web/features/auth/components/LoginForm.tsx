"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/shared/components/Button";
import { Input } from "@/shared/components/Input";
import { useAuth } from "../hooks/useAuth";
import { loginSchema, type LoginFormData } from "../types/schemas";

export function LoginForm() {
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
      await login(data.userId);
    } catch (err) {
      setError("Usuário não encontrado. Verifique o ID e tente novamente.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <Input
        label="ID do Usuário"
        placeholder="Cole seu ID de usuário aqui"
        error={errors.userId?.message}
        {...register("userId")}
      />
      {error && (
        <div className="rounded-lg border border-red bg-red-light p-3 text-sm text-red">
          {error}
        </div>
      )}
      <Button type="submit" className="w-full" isLoading={isLoading}>
        Entrar
      </Button>
    </form>
  );
}
