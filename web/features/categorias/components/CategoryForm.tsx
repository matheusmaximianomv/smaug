"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input } from "@/shared/components/Input";
import { Button } from "@/shared/components/Button";
import { categorySchema, type CategoryFormData } from "../types/schemas";

interface CategoryFormProps {
  initial?: { name: string };
  onSave: (data: CategoryFormData) => void;
  onClose: () => void;
  isLoading?: boolean;
}

export function CategoryForm({ initial, onSave, onClose, isLoading }: CategoryFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CategoryFormData>({
    resolver: zodResolver(categorySchema),
    defaultValues: { name: initial?.name ?? "" },
  });

  return (
    <form onSubmit={handleSubmit(onSave)} className="space-y-4">
      <Input
        label="Nome da categoria"
        placeholder="Ex: Moradia, Alimentação..."
        error={errors.name?.message}
        autoFocus
        {...register("name")}
      />
      <div className="flex justify-end gap-2 border-t border-border pt-4">
        <Button variant="ghost" type="button" onClick={onClose}>
          Cancelar
        </Button>
        <Button type="submit" isLoading={isLoading}>
          {initial ? "Salvar" : "Criar categoria"}
        </Button>
      </div>
    </form>
  );
}
