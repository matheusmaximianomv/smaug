"use client";

import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/shared/components/Button";
import { Input } from "@/shared/components/Input";
import { useRegister } from "../hooks/useRegister";
import { getApiErrorMessage } from "@/infra/api-error";
import { registerSchema, type RegisterFormData } from "../types/schemas";

export function RegisterForm() {
  const { mutate, isPending, error, isEmailTaken } = useRegister();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  });

  // A confirmação é só do formulário (PRD §5.1): não vai para a API.
  const onSubmit = ({ name, email, password }: RegisterFormData) => {
    mutate({ name, email, password });
  };

  // noValidate: o campo é type="email" e a validação nativa do browser barraria o
  // submit antes do React, tornando as mensagens do Zod inalcançáveis. O schema é
  // a fonte única de validação.
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      <Input
        label="Nome"
        autoComplete="name"
        placeholder="Seu nome completo"
        error={errors.name?.message}
        {...register("name")}
      />
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
        autoComplete="new-password"
        placeholder="Pelo menos 12 caracteres"
        error={errors.password?.message}
        {...register("password")}
      />
      <Input
        label="Confirmar senha"
        type="password"
        autoComplete="new-password"
        placeholder="Repita a senha"
        error={errors.passwordConfirmation?.message}
        {...register("passwordConfirmation")}
      />
      {error && (
        <div
          role="alert"
          className="rounded-lg border border-red bg-red-light p-3 text-sm text-red"
        >
          <span>{getApiErrorMessage(error, "Erro ao criar conta. Tente novamente.")}</span>
          {isEmailTaken && (
            <>
              {" "}
              <Link href="/login" className="font-medium underline">
                Entrar
              </Link>
            </>
          )}
        </div>
      )}
      <Button type="submit" className="w-full" isLoading={isPending}>
        Criar Conta
      </Button>
    </form>
  );
}
