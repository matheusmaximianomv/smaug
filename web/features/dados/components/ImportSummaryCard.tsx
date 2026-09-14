"use client";

import { Check } from "lucide-react";
import { Button } from "@/shared/components/Button";
import type { ImportResult } from "../types";

interface ImportSummaryCardProps {
  result: ImportResult;
  onRestart: () => void;
}

export function ImportSummaryCard({ result, onRestart }: ImportSummaryCardProps) {
  const rows: Array<[string, number]> = [
    ["Receitas avulsas", result.created.oneTimeRevenues],
    ["Receitas fixas", result.created.fixedRevenues],
    ["Despesas avulsas", result.created.oneTimeExpenses],
    ["Parcelamentos", result.created.installmentExpenses],
    ["Despesas recorrentes", result.created.recurringExpenses],
    ["Categorias criadas", result.categoriesCreated],
  ];

  return (
    <div className="mx-auto mt-5 max-w-[400px] rounded-lg border border-border bg-surface px-7 py-9 text-center">
      <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-green-light text-green">
        <Check size={22} strokeWidth={2.5} />
      </div>
      <h3 className="mt-3.5 text-[17px] font-bold">
        {result.total} {result.total === 1 ? "registro criado" : "registros criados"}
      </h3>

      <dl className="mt-4 space-y-1.5 text-left">
        {rows
          .filter(([, value]) => value > 0)
          .map(([label, value]) => (
            <div key={label} className="flex items-center justify-between gap-3 text-[13px]">
              <dt className="text-text-muted">{label}</dt>
              <dd className="font-semibold">{value}</dd>
            </div>
          ))}
      </dl>

      <Button variant="ghost" onClick={onRestart} className="mt-4">
        Importar outro arquivo
      </Button>
    </div>
  );
}
