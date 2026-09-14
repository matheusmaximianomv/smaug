"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import { Button } from "@/shared/components/Button";
import { MonthYearSelect } from "@/shared/components/MonthYearSelect";
import { getCurrentCompetence, compareCompetences } from "@/shared/lib/competence";
import { formatMonthYear } from "@/shared/lib/dateUtils";
import { useDataExport } from "../hooks/useDataExport";
import { CodeChip } from "./CodeChip";
import { PreviewCard } from "./PreviewCard";
import { SegmentedControl } from "./SegmentedControl";
import type { ExportMode, ExportParams } from "../types";

const MAX_MONTHS = 12;

function spanInMonths(
  start: { year: number; month: number },
  end: { year: number; month: number },
): number {
  return (end.year - start.year) * 12 + (end.month - start.month) + 1;
}

function formatCompetenceLabel(competence: string | null): string {
  if (!competence) return "—";
  const [year, month] = competence.split("-");
  return formatMonthYear(Number(year), Number(month));
}

export function ExportPanel() {
  const current = getCurrentCompetence();
  const [mode, setMode] = useState<ExportMode>("period");
  const [start, setStart] = useState(current);
  const [end, setEnd] = useState(current);

  const span = spanInMonths(start, end);
  const inverted = compareCompetences(end, start) < 0;
  const tooLong = span > MAX_MONTHS;
  const periodError = inverted
    ? "O mês final é anterior ao inicial."
    : tooLong
      ? `O período tem ${span} meses. O máximo é 12.`
      : undefined;

  const params: ExportParams =
    mode === "full"
      ? { mode: "full" }
      : {
          mode: "period",
          startYear: start.year,
          startMonth: start.month,
          endYear: end.year,
          endMonth: end.month,
        };

  const { data, isLoading, download } = useDataExport(params, mode === "full" || !periodError);

  const total = data?.total ?? 0;
  const periodLabel =
    mode === "full"
      ? `${formatCompetenceLabel(data?.periodStart ?? null)} – ${formatCompetenceLabel(data?.periodEnd ?? null)}`
      : `${formatMonthYear(start.year, start.month)} – ${formatMonthYear(end.year, end.month)}`;

  return (
    <div className="mt-5">
      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[1fr_280px]">
        <div className="space-y-4">
          <SegmentedControl
            label="Recorte"
            value={mode}
            onChange={setMode}
            options={[
              { value: "period", label: "Período" },
              { value: "full", label: "Base completa" },
            ]}
          />

          {mode === "period" ? (
            <>
              <MonthYearSelect
                label="De"
                month={start.month}
                year={start.year}
                onMonthChange={(month) => setStart((prev) => ({ ...prev, month }))}
                onYearChange={(year) => setStart((prev) => ({ ...prev, year }))}
              />
              <MonthYearSelect
                label="Até"
                month={end.month}
                year={end.year}
                onMonthChange={(month) => setEnd((prev) => ({ ...prev, month }))}
                onYearChange={(year) => setEnd((prev) => ({ ...prev, year }))}
                error={periodError}
              />
              <p className="text-[12.5px] text-text-muted">
                De 1 a 12 meses. O Smaug registra competência mensal, não dia.
              </p>
            </>
          ) : (
            <p className="text-[12.5px] text-text-muted">
              Exporta tudo que existe, sem filtro. Recorrentes em aberto são materializadas até o
              mês vigente.
            </p>
          )}
        </div>

        <PreviewCard
          title="Prévia"
          count={total}
          countLabel={total === 1 ? "lançamento" : "lançamentos"}
          meta={[
            { label: "Período", value: periodLabel },
            { label: "Receitas", value: data?.revenues ?? 0 },
            { label: "Despesas", value: data?.expenses ?? 0 },
          ]}
          footer={
            <>
              UTF-8 · separador <CodeChip>;</CodeChip> · decimal com vírgula
            </>
          }
        >
          <Button
            onClick={() => download.mutate(params)}
            disabled={total === 0 || isLoading || Boolean(periodError)}
            isLoading={download.isPending}
            className="mt-3.5 w-full justify-center"
          >
            <Download size={14} className="mr-1.5" />
            Baixar CSV
          </Button>
        </PreviewCard>
      </div>

      <details className="mt-6 border-t border-border pt-4">
        <summary className="cursor-pointer text-[13px] font-semibold text-text-muted hover:text-text">
          Formato do arquivo
        </summary>
        <p className="mt-2.5 text-[12px] leading-[1.55] text-text-subtle">
          Uma linha por lançamento. Totais e saldos não são exportados — são deriváveis por soma. As
          colunas <CodeChip>parcela</CodeChip>, <CodeChip>total_parcelas</CodeChip> e{" "}
          <CodeChip>serie_id</CodeChip> mantêm as parcelas de uma mesma compra reconhecíveis entre
          si.
        </p>
        <pre className="mt-2.5 overflow-x-auto rounded-md border border-border bg-bg px-3.5 py-3 text-[11.5px] leading-[1.7] text-text-muted">
          {
            "competencia;natureza;categoria;descricao;valor;tipo;parcela;total_parcelas;serie_id;observacao\n2026-04;receita;;Salário;9200,00;fixa;;;fix-0001;\n2026-04;despesa;Educação;Notebook Pro;400,00;parcelada;3;12;ser-0031;"
          }
        </pre>
      </details>
    </div>
  );
}
