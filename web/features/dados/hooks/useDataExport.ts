"use client";

import { useQuery, useMutation } from "@tanstack/react-query";
import { DadosService } from "../services/DadosService";
import { toast } from "@/shared/hooks/useToast";
import { getApiErrorMessage } from "@/infra/api-error";
import { downloadBlob } from "@/infra/file-download";
import type { ExportParams } from "../types";

const QUERY_KEY = ["data", "export-summary"];

/**
 * `enabled` desliga a prévia enquanto o período escolhido é inválido: a API recusaria com 400 e
 * o toast de erro apareceria a cada tecla no seletor.
 */
export function useDataExport(params: ExportParams, enabled = true) {
  const query = useQuery({
    queryKey: [...QUERY_KEY, params],
    queryFn: () => DadosService.getExportSummary(params),
    staleTime: 30_000,
    enabled,
  });

  const download = useMutation({
    mutationFn: (exportParams: ExportParams) => DadosService.downloadExport(exportParams),
    onSuccess: ({ filename, blob }) => {
      downloadBlob(filename, blob);
      toast.success("Arquivo gerado com sucesso!");
    },
    onError: (error, variables) =>
      toast.error(getApiErrorMessage(error, "Erro ao exportar os dados."), {
        action: { label: "Tentar novamente", onClick: () => download.mutate(variables) },
      }),
  });

  return { ...query, download };
}
