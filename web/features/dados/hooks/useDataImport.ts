"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { DadosService } from "../services/DadosService";
import { toast } from "@/shared/hooks/useToast";
import { getApiErrorMessage } from "@/infra/api-error";

/**
 * Uma importação pode criar registros em qualquer área do app, então o cache inteiro é
 * invalidado — invalidar chave por chave deixaria alguma tela desatualizada.
 */
export function useDataImport() {
  const qc = useQueryClient();

  const preview = useMutation({
    mutationFn: (content: string) => DadosService.previewImport(content),
    onError: (error, variables) =>
      toast.error(getApiErrorMessage(error, "Erro ao ler o arquivo."), {
        action: { label: "Tentar novamente", onClick: () => preview.mutate(variables) },
      }),
  });

  const run = useMutation({
    mutationFn: (content: string) => DadosService.runImport(content),
    onSuccess: (result) => {
      qc.invalidateQueries();
      toast.success(
        `${result.total} ${result.total === 1 ? "registro criado" : "registros criados"} com sucesso!`,
      );
    },
    onError: (error, variables) =>
      toast.error(getApiErrorMessage(error, "Erro ao importar os dados."), {
        action: { label: "Tentar novamente", onClick: () => run.mutate(variables) },
      }),
  });

  return { preview, run };
}
