"use client";

import { useState } from "react";
import { Input } from "@/shared/components/Input";
import { Button } from "@/shared/components/Button";
import { MonthYearSelect } from "./MonthYearSelect";
import { getCurrentCompetence, isEligible } from "@/shared/lib/competence";
import { parseAmount } from "@/shared/lib/parseAmount";

export interface FixedRevenueVersionPayload {
  description: string;
  amount: number;
  effectiveYear: number;
  effectiveMonth: number;
}

interface FixedRevenueVersionFormProps {
  onSave: (data: FixedRevenueVersionPayload) => void;
  onClose: () => void;
  isLoading?: boolean;
}

export function FixedRevenueVersionForm({
  onSave,
  onClose,
  isLoading,
}: FixedRevenueVersionFormProps) {
  const now = getCurrentCompetence();
  const [desc, setDesc] = useState("");
  const [amount, setAmount] = useState("");
  const [month, setMonth] = useState(now.month);
  const [year, setYear] = useState(now.year);
  const [errors, setErrors] = useState<Record<string, string>>({});

  function submit(e: React.FormEvent) {
    e.preventDefault();

    const v: Record<string, string> = {};
    if (!desc.trim() || desc.length > 255) v.desc = "Descrição obrigatória (máx. 255 caracteres).";
    const parsed = parseAmount(amount);
    if (isNaN(parsed) || parsed <= 0) v.amount = "Valor inválido. Use número positivo.";
    if (!isEligible({ year, month })) v.effective = "A vigência não pode começar em mês passado.";

    if (Object.keys(v).length) {
      setErrors(v);
      return;
    }

    onSave({
      description: desc.trim(),
      amount: parsed,
      effectiveYear: year,
      effectiveMonth: month,
    });
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <p className="rounded-lg border border-border bg-bg px-3 py-2 text-xs text-text-subtle">
        A nova versão será aplicada a partir do mês selecionado. Meses anteriores preservam o valor
        antigo.
      </p>
      <Input
        label="Nova descrição"
        value={desc}
        onChange={(e) => setDesc(e.target.value)}
        error={errors.desc}
        autoFocus
      />
      <Input
        label="Novo valor (R$)"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        placeholder="0,00"
        error={errors.amount}
      />
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
