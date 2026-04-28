"use client";

import { useState, useMemo } from "react";
import { Input } from "@/shared/components/Input";
import { Button } from "@/shared/components/Button";
import { MonthYearSelect } from "@/features/receitas/components/MonthYearSelect";
import { formatCurrency } from "@/shared/lib/formatCurrency";
import type { CategoryWithCount } from "@/features/categorias/types";

interface InstallmentFormProps {
  categories: CategoryWithCount[];
  onSave: (data: {
    description: string;
    totalAmount: number;
    installmentCount: number;
    categoryId: string;
    startYear: number;
    startMonth: number;
  }) => void;
  onClose: () => void;
  isLoading?: boolean;
}

function getNow() {
  const d = new Date();
  return { month: d.getMonth() + 1, year: d.getFullYear() };
}

export function InstallmentForm({ categories, onSave, onClose, isLoading }: InstallmentFormProps) {
  const now = getNow();
  const [desc, setDesc] = useState("");
  const [total, setTotal] = useState("");
  const [count, setCount] = useState("");
  const [catId, setCatId] = useState("");
  const [month, setMonth] = useState(now.month);
  const [year, setYear] = useState(now.year);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const installmentAmt = useMemo(() => {
    const t = Math.round(parseFloat(total.replace(",", ".")) * 100);
    const c = parseInt(count);
    if (!t || !c || c < 1 || c > 72) return null;
    return Math.floor(t / c) / 100;
  }, [total, count]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const v: Record<string, string> = {};
    if (!desc.trim()) v.desc = "Descrição obrigatória.";
    const t = parseFloat(total.replace(",", "."));
    if (isNaN(t) || t <= 0) v.total = "Valor total inválido.";
    const c = parseInt(count);
    if (isNaN(c) || c < 1 || c > 72) v.count = "Entre 1 e 72 parcelas.";
    if (!catId) v.cat = "Selecione uma categoria.";
    if (Object.keys(v).length) {
      setErrors(v);
      return;
    }
    onSave({
      description: desc.trim(),
      totalAmount: t,
      installmentCount: c,
      categoryId: catId,
      startYear: year,
      startMonth: month,
    });
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <Input
        label="Descrição"
        value={desc}
        onChange={(e) => setDesc(e.target.value)}
        placeholder="Ex: Notebook, TV, viagem..."
        error={errors.desc}
        autoFocus
      />
      <div className="grid grid-cols-2 gap-3">
        <Input
          label="Valor total (R$)"
          value={total}
          onChange={(e) => setTotal(e.target.value)}
          placeholder="0,00"
          error={errors.total}
        />
        <Input
          label="Nº de parcelas"
          value={count}
          onChange={(e) => setCount(e.target.value)}
          type="number"
          placeholder="1–72"
          error={errors.count}
        />
      </div>
      {installmentAmt && (
        <div className="rounded-lg border border-red-mid bg-red-light px-3 py-2 text-sm text-red">
          Cada parcela: <strong>{formatCurrency(installmentAmt)}</strong>
        </div>
      )}
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
        label="Primeira parcela em"
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
          Criar parcelamento
        </Button>
      </div>
    </form>
  );
}
