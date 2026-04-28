"use client";

import { useState } from "react";
import { Input } from "@/shared/components/Input";
import { Button } from "@/shared/components/Button";
import { MonthYearSelect } from "./MonthYearSelect";

interface FixedRevenueFormProps {
  onSave: (data: {
    description: string;
    amount: number;
    modality: "ALTERABLE" | "UNALTERABLE";
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

export function FixedRevenueForm({ onSave, onClose, isLoading }: FixedRevenueFormProps) {
  const now = getNow();
  const [desc, setDesc] = useState("");
  const [amount, setAmount] = useState("");
  const [modality, setModality] = useState<"ALTERABLE" | "UNALTERABLE">("ALTERABLE");
  const [startMonth, setStartMonth] = useState(now.month);
  const [startYear, setStartYear] = useState(now.year);
  const [hasEnd, setHasEnd] = useState(false);
  const [endMonth, setEndMonth] = useState(now.month);
  const [endYear, setEndYear] = useState(now.year);
  const [errors, setErrors] = useState<Record<string, string>>({});

  function validate() {
    const e: Record<string, string> = {};
    if (!desc.trim() || desc.length > 255) e.desc = "Descrição obrigatória.";
    const n = parseFloat(amount.replace(",", "."));
    if (isNaN(n) || n <= 0) e.amount = "Valor inválido.";
    return e;
  }

  function submit(ev: React.FormEvent) {
    ev.preventDefault();
    const v = validate();
    if (Object.keys(v).length) {
      setErrors(v);
      return;
    }
    onSave({
      description: desc.trim(),
      amount: parseFloat(amount.replace(",", ".")),
      modality,
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
        placeholder="Ex: Salário, aluguel recebido..."
        error={errors.desc}
        autoFocus
      />
      <Input
        label="Valor mensal (R$)"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        placeholder="0,00"
        error={errors.amount}
      />
      <div>
        <label className="mb-1.5 block text-sm font-medium text-text">Modalidade</label>
        <select
          value={modality}
          onChange={(e) => setModality(e.target.value as "ALTERABLE" | "UNALTERABLE")}
          className="flex h-10 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red"
        >
          <option value="ALTERABLE">Alterável – pode ser reajustada com histórico</option>
          <option value="UNALTERABLE">Inalterável – somente encerramento</option>
        </select>
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
          label="Término da vigência"
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
          Criar receita fixa
        </Button>
      </div>
    </form>
  );
}
