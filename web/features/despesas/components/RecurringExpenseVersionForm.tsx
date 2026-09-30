"use client";

import { useState } from "react";
import { Input } from "@/shared/components/Input";
import { Select } from "@/shared/components/Select";
import { Button } from "@/shared/components/Button";
import { MonthYearSelect } from "@/shared/components/MonthYearSelect";
import { getCurrentCompetence, isEligible } from "@/shared/lib/competence";
import type { CategoryWithCount } from "@/features/categorias/types";
import { parseAmount } from "@/shared/lib/parseAmount";

export interface RecurringExpenseVersionPayload {
  description: string;
  amount: number;
  categoryId: string;
  effectiveYear: number;
  effectiveMonth: number;
}

interface RecurringExpenseVersionFormProps {
  categories: CategoryWithCount[];
  onSave: (data: RecurringExpenseVersionPayload) => void;
  onClose: () => void;
  isLoading?: boolean;
}

export function RecurringExpenseVersionForm({
  categories,
  onSave,
  onClose,
  isLoading,
}: RecurringExpenseVersionFormProps) {
  const now = getCurrentCompetence();
  const [desc, setDesc] = useState("");
  const [amount, setAmount] = useState("");
  const [catId, setCatId] = useState("");
  const [month, setMonth] = useState(now.month);
  const [year, setYear] = useState(now.year);
  const [errors, setErrors] = useState<Record<string, string>>({});

  function submit(e: React.FormEvent) {
    e.preventDefault();

    const v: Record<string, string> = {};
    if (!desc.trim() || desc.length > 255) v.desc = "Descrição obrigatória (máx. 255 caracteres).";
    const parsed = parseAmount(amount);
    if (isNaN(parsed) || parsed <= 0) v.amount = "Valor inválido. Use número positivo.";
    if (!catId) v.cat = "Selecione uma categoria.";
    if (!isEligible({ year, month })) v.effective = "A vigência não pode começar em mês passado.";

    if (Object.keys(v).length) {
      setErrors(v);
      return;
    }

    onSave({
      description: desc.trim(),
      amount: parsed,
      categoryId: catId,
      effectiveYear: year,
      effectiveMonth: month,
    });
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <p className="rounded-lg border border-border bg-bg px-3 py-2 text-xs text-text-subtle">
        A alteração valerá a partir do mês selecionado. O histórico anterior é preservado.
      </p>
      <Input
        label="Nova descrição"
        value={desc}
        onChange={(e) => setDesc(e.target.value)}
        error={errors.desc}
        autoFocus
      />
      <div className="grid grid-cols-2 gap-3">
        <Input
          label="Novo valor (R$)"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0,00"
          error={errors.amount}
        />
        <Select
          label="Categoria"
          value={catId}
          onChange={(e) => setCatId(e.target.value)}
          error={errors.cat}
          options={categories.map((c) => ({ value: c.id, label: c.name }))}
        />
      </div>
      <MonthYearSelect
        label="Vigência a partir de"
        month={month}
        year={year}
        onMonthChange={setMonth}
        onYearChange={setYear}
        required
        error={errors.effective}
      />
      <div className="flex justify-end gap-2 border-t border-border pt-4">
        <Button variant="ghost" type="button" onClick={onClose}>
          Cancelar
        </Button>
        <Button type="submit" isLoading={isLoading}>
          Criar nova versão
        </Button>
      </div>
    </form>
  );
}
