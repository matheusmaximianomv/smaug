"use client";

import { useState } from "react";
import { Input } from "@/shared/components/Input";
import { Button } from "@/shared/components/Button";
import { MonthYearSelect } from "@/shared/components/MonthYearSelect";
import { isEligible } from "@/shared/lib/competence";
import type { OneTimeRevenue } from "../types";
import { parseAmount } from "@/shared/lib/parseAmount";

interface OneTimeRevenueFormProps {
  initial?: OneTimeRevenue;
  onSave: (data: {
    description: string;
    amount: number;
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

export function OneTimeRevenueForm({
  initial,
  onSave,
  onClose,
  isLoading,
}: OneTimeRevenueFormProps) {
  const now = getNow();
  const [desc, setDesc] = useState(initial?.description ?? "");
  const [amount, setAmount] = useState(initial?.amount?.toString() ?? "");
  const [month, setMonth] = useState(initial?.competenceMonth ?? now.month);
  const [year, setYear] = useState(initial?.competenceYear ?? now.year);
  const [errors, setErrors] = useState<Record<string, string>>({});

  function validate() {
    const e: Record<string, string> = {};
    if (!desc.trim() || desc.length > 255) e.desc = "Descrição obrigatória (máx. 255 caracteres).";
    const n = parseAmount(amount);
    if (isNaN(n) || n <= 0) e.amount = "Valor inválido. Use número positivo.";
    // Só na criação: a API permite editar lançamentos já existentes em meses passados.
    if (!initial && !isEligible({ year, month })) {
      e.competence = "Não é permitido criar receitas em competências passadas.";
    }
    return e;
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const v = validate();
    if (Object.keys(v).length) {
      setErrors(v);
      return;
    }
    onSave({
      description: desc.trim(),
      amount: parseAmount(amount),
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
        placeholder="Ex: Freelance, bônus..."
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
      <MonthYearSelect
        label="Competência"
        month={month}
        year={year}
        onMonthChange={setMonth}
        onYearChange={setYear}
        required
        error={errors.competence}
      />
      <div className="flex justify-end gap-2 border-t border-border pt-4">
        <Button variant="ghost" type="button" onClick={onClose}>
          Cancelar
        </Button>
        <Button type="submit" isLoading={isLoading}>
          {initial ? "Salvar alterações" : "Adicionar receita"}
        </Button>
      </div>
    </form>
  );
}
