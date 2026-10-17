import { Button } from "../Button";

interface ErrorNoticeProps {
  message: string;
  onRetry: () => void;
}

/** Falha de leitura (consulta do mês, detalhe da Ficha) com a mensagem pt-BR já mapeada. */
export function ErrorNotice({ message, onRetry }: ErrorNoticeProps) {
  return (
    <div
      role="alert"
      className="flex flex-wrap items-center gap-3 rounded-lg border border-red bg-red-light p-3 text-sm text-red"
    >
      <span className="flex-1">{message}</span>
      <Button variant="outline" size="sm" onClick={onRetry}>
        Tentar novamente
      </Button>
    </div>
  );
}
