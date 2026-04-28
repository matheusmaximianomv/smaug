"use client";

import { useState } from "react";
import { Input } from "@/shared/components/Input";
import { Button } from "@/shared/components/Button";
import { MonthYearSelect } from "@/features/receitas/components/MonthYearSelect";
import type { CategoryWithCount } from "@/features/categorias/types";

interface RecurringExpenseFormProps {
  categories: CategoryWithCount[];
  onSave: (data: {
    description: string;
    amount: number;
    categoryId: string;
    startYear: number;
    startMonth: number;
    endYear?: number | null;
    endMonth?: number | null;
  }) => void;
  onClose: () => void;
  isLoading?: boolean;
}

function getNow() {
  const d = new Date();
  return { month: d.getMonth() + 1, year: d.getFullYear() };
}

export function RecurringExpenseForm({
  categories,
  onSave,
  onClose,
  isLoading,
}: RecurringExpenseFormProps) {
  const now = getNow();
  const [desc, setDesc] = useState("");
  const [amount, setAmount] = useState("");
  const [catId, setCatId] = useState("");
  const [startMonth, setStartMonth] = useState(now.month);
  const [startYear, setStartYear] = useState(now.year);
  const [hasEnd, setHasEnd] = useState(false);
  const [endMonth, setEndMonth] = useState(now.month);
  const [endYear, setEndYear] = useState(now.year);
  const [errors, setErrors] = useState<Record<string, string>>({});

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const v: Record<string, string> = {};
    if (!desc.trim()) v.desc = "Descrição obrigatória.";
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
      startYear,
      startMonth,
      endYear: hasEnd ? endYear : null,
      endMonth: hasEnd ? endMonth : null,
    });
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <Input
        label="Descrição"
        value={desc}
        onChange={(e) => setDesc(e.target.value)}
        placeholder="Ex: Aluguel, plano de saúde..."
        error={errors.desc}
        autoFocus
      />
      <div className="grid grid-cols-2 gap-3">
        <Input
          label="Valor mensal (R$)"
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
      </div>
      <MonthYearSelect
        label="Início da vigência"
        month={startMonth}
        year={startYear}
        onMonthChange={setStartMonth}
        onYearChange={setStartYear}
        required
      />
      <div>
        <label className="flex items-center gap-2 text-sm text-text">
          <input
            type="checkbox"
            checked={hasEnd}
            onChange={(e) => setHasEnd(e.target.checked)}
            className="rounded"
          />
          Definir data de término
        </label>
      </div>
      {hasEnd && (
        <MonthYearSelect
          label="Término"
          month={endMonth}
          year={endYear}
          onMonthChange={setEndMonth}
          onYearChange={setEndYear}
        />
      )}
      <div className="flex justify-end gap-2 border-t border-border pt-4">
        <Button variant="ghost" type="button" onClick={onClose}>
          Cancelar
        </Button>
        <Button type="submit" isLoading={isLoading}>
          Criar despesa recorrente
        </Button>
      </div>
    </form>
  );
}
