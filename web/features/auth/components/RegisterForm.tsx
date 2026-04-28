"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/shared/components/Button";
import { Input } from "@/shared/components/Input";
import { useRegister } from "../hooks/useRegister";
import { registerSchema, type RegisterFormData } from "../types/schemas";
import { Copy, Check } from "lucide-react";

export function RegisterForm() {
  const [registeredUserId, setRegisteredUserId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const { mutate, isPending, error } = useRegister();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = (data: RegisterFormData) => {
    mutate(data, {
      onSuccess: (user) => {
        setRegisteredUserId(user.id);
      },
    });
  };

  const copyUserId = () => {
    if (registeredUserId) {
      navigator.clipboard.writeText(registeredUserId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (registeredUserId) {
    return (
      <div className="space-y-6">
        <div className="rounded-lg border border-green bg-green-light p-6">
          <h3 className="mb-2 text-lg font-semibold text-green">Cadastro realizado com sucesso!</h3>
          <p className="mb-4 text-sm text-text-muted">
            Copie seu ID de usuário abaixo. Você precisará dele para fazer login.
          </p>
          <div className="flex gap-2">
            <Input value={registeredUserId} readOnly className="font-mono text-sm" />
            <Button onClick={copyUserId} variant="outline" className="shrink-0">
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
        </div>
        <Button onClick={() => (window.location.href = "/login")} className="w-full">
          Ir para Login
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <Input
        label="Nome"
        placeholder="Seu nome completo"
        error={errors.name?.message}
        {...register("name")}
      />
      <Input
        label="Email"
        type="email"
        placeholder="seu@email.com"
        error={errors.email?.message}
        {...register("email")}
      />
      {error && (
        <div className="rounded-lg border border-red bg-red-light p-3 text-sm text-red">
          Erro ao criar conta. Tente novamente.
        </div>
      )}
      <Button type="submit" className="w-full" isLoading={isPending}>
        Criar Conta
      </Button>
    </form>
  );
}
