"use client";

import { useState } from "react";
import { useDataImport } from "./useDataImport";
import type { ImportPreview, ImportResult } from "../types";

export interface ImportFlow {
  file: File | null;
  preview: ImportPreview | null;
  result: ImportResult | null;
  isPreviewing: boolean;
  isImporting: boolean;
  selectFile: (file: File) => Promise<void>;
  confirm: () => void;
  reset: () => void;
}

/**
 * As três etapas da importação — escolher, conferir, gravar — e a leitura do arquivo, que é API de
 * browser e por isso não pode morar no componente. O conteúdo lido fica guardado para que o que é
 * gravado seja exatamente o que foi conferido, e não um segundo `File.text()` de um arquivo que o
 * usuário pode ter trocado em disco no meio do caminho.
 */
export function useImportFlow(): ImportFlow {
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

  const selectFile = async (selected: File): Promise<void> => {
    const text = await selected.text();
    setFile(selected);
    setContent(text);
    setResult(null);
    previewMutation.mutate(text, { onSuccess: setPreview });
  };

  const confirm = (): void => {
    run.mutate(content, { onSuccess: setResult });
  };

  return {
    file,
    preview,
    result,
    isPreviewing: previewMutation.isPending,
    isImporting: run.isPending,
    selectFile,
    confirm,
    reset,
  };
}
