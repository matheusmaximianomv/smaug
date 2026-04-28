"use client";

import { useState } from "react";
import { Input } from "@/shared/components/Input";
import { Button } from "@/shared/components/Button";
import { MonthYearSelect } from "@/features/receitas/components/MonthYearSelect";
import type { CategoryWithCount } from "@/features/categorias/types";
import type { OneTimeExpense } from "../types";

interface OneTimeExpenseFormProps {
  initial?: OneTimeExpense;
  categories: CategoryWithCount[];
  onSave: (data: {
    description: string;
    amount: number;
    categoryId: string;
    competenceYear: number;
    competenceMonth: number;
  }) => void;
  onClose: () => void;
  isLoading?: boolean;
}

function getNow() {
  const d = new Date();
  return { month: d.getMonth() + 1, year: d.getFullYear() };
}

export function OneTimeExpenseForm({
  initial,
  categories,
  onSave,
  onClose,
  isLoading,
}: OneTimeExpenseFormProps) {
  const now = getNow();
  const [desc, setDesc] = useState(initial?.description ?? "");
  const [amount, setAmount] = useState(initial?.amount?.toString() ?? "");
  const [catId, setCatId] = useState(initial?.categoryId ?? "");
  const [month, setMonth] = useState(initial?.competenceMonth ?? now.month);
  const [year, setYear] = useState(initial?.competenceYear ?? now.year);
  const [errors, setErrors] = useState<Record<string, string>>({});

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const v: Record<string, string> = {};
    if (!desc.trim() || desc.length > 255) v.desc = "Descrição obrigatória (máx. 255 caracteres).";
    const n = parseFloat(amount.replace(",", "."));
    if (isNaN(n) || n <= 0) v.amount = "Valor inválido.";
    if (!catId) v.cat = "Selecione uma categoria.";
    if (Object.keys(v).length) {
      setErrors(v);
      return;
    }
    onSave({
      description: desc.trim(),
      amount: n,
      categoryId: catId,
      competenceYear: year,
      competenceMonth: month,
    });
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <Input
        label="Descrição"
        value={desc}
        onChange={(e) => setDesc(e.target.value)}
        placeholder="Ex: Supermercado, consulta médica..."
        error={errors.desc}
        autoFocus
      />
      <Input
        label="Valor (R$)"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        placeholder="0,00"
        error={errors.amount}
      />
      <div>
        <label className="mb-1.5 block text-sm font-medium text-text">Categoria</label>
        <select
          value={catId}
          onChange={(e) => setCatId(e.target.value)}
          className="flex h-10 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red"
        >
          <option value="">Selecione...</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        {errors.cat && <p className="mt-1.5 text-sm text-red">{errors.cat}</p>}
      </div>
      <MonthYearSelect
        label="Competência"
        month={month}
        year={year}
        onMonthChange={setMonth}
        onYearChange={setYear}
        required
      />
      <div className="flex justify-end gap-2 border-t border-border pt-4">
        <Button variant="ghost" type="button" onClick={onClose}>
          Cancelar
        </Button>
        <Button type="submit" isLoading={isLoading}>
          {initial ? "Salvar" : "Adicionar despesa"}
        </Button>
      </div>
    </form>
  );
}
