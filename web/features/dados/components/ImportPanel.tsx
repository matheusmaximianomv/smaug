"use client";

import { useState } from "react";
import { FileText, X } from "lucide-react";
import { Button } from "@/shared/components/Button";
import { useDataImport } from "../hooks/useDataImport";
import { ImportDropzone } from "./ImportDropzone";
import { ImportErrorList } from "./ImportErrorList";
import { ImportSummaryCard } from "./ImportSummaryCard";
import { PreviewCard } from "./PreviewCard";
import type { ImportPreview, ImportResult } from "../types";

export function ImportPanel() {
  const [file, setFile] = useState<File | null>(null);
  const [content, setContent] = useState("");
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const { preview: previewMutation, run } = useDataImport();

  const reset = (): void => {
    setFile(null);
    setContent("");
    setPreview(null);
    setResult(null);
  };

  const handleFile = async (selected: File): Promise<void> => {
    const text = await selected.text();
    setFile(selected);
    setContent(text);
    setResult(null);
    previewMutation.mutate(text, { onSuccess: setPreview });
  };

  if (result) {
    return <ImportSummaryCard result={result} onRestart={reset} />;
  }

  if (!preview) {
    return (
      <div className="mt-5 space-y-4">
        <ImportDropzone onFileSelected={handleFile} disabled={previewMutation.isPending} />
        <p className="rounded-md border border-border bg-bg px-3 py-2 text-[12.5px] leading-[1.5] text-text-subtle">
          Toda importação <strong className="font-bold">cria registros novos</strong>. Nada é
          atualizado, nada se liga ao que já existe — importar o mesmo arquivo duas vezes gera tudo
          em dobro.
        </p>
      </div>
    );
  }

  const meta = [
    { label: "Avulsos", value: preview.counts.oneTime },
    { label: "Linhas de fixa", value: preview.counts.fixed },
    { label: "Linhas de parcela", value: preview.counts.installment },
    { label: "Linhas de recorrente", value: preview.counts.recurring },
    { label: "Séries agrupadas", value: preview.counts.series },
  ].filter((item) => item.value > 0);

  return (
    <div className="mt-5 grid grid-cols-1 items-start gap-6 lg:grid-cols-[1fr_280px]">
      <div className="space-y-4">
        <div className="flex items-center gap-2 rounded-md border border-border bg-surface px-3 py-2 text-[13px]">
          <FileText size={15} className="shrink-0 text-text-muted" />
          <span className="flex-1 overflow-hidden text-ellipsis whitespace-nowrap">
            {file?.name}
          </span>
          <button
            type="button"
            onClick={reset}
            title="Remover"
            aria-label="Remover arquivo"
            className="rounded p-1 text-text-subtle hover:text-red"
          >
            <X size={13} />
          </button>
        </div>

        <ImportErrorList errors={preview.errors} />

        {preview.validRows === 0 && preview.errors.length === 0 && (
          <p className="text-[13px] text-text-muted">O arquivo não contém lançamentos.</p>
        )}
      </div>

      <PreviewCard
        title="Vai entrar"
        count={preview.validRows}
        countLabel={preview.validRows === 1 ? "lançamento válido" : "lançamentos válidos"}
        meta={meta}
      >
        <Button
          onClick={() => run.mutate(content, { onSuccess: setResult })}
          disabled={preview.validRows === 0}
          isLoading={run.isPending}
          className="mt-3.5 w-full justify-center"
        >
          {`Importar ${preview.validRows} ${preview.validRows === 1 ? "lançamento" : "lançamentos"}`}
        </Button>
        <Button variant="ghost" onClick={reset} className="mt-1.5 w-full justify-center">
          Cancelar
        </Button>
      </PreviewCard>
    </div>
  );
}
