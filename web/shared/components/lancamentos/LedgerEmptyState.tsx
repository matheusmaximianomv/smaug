import { Plus } from "lucide-react";
import { Button } from "../Button";

interface LedgerEmptyStateProps {
  title: string;
  isPast: boolean;
  /** Explicação do mês corrente/futuro. */
  hint: string;
  actionLabel: string;
  onAction: () => void;
}

/** Mês sem lançamentos: em mês passado explica a regra e não oferece cadastro. */
export function LedgerEmptyState({
  title,
  isPast,
  hint,
  actionLabel,
  onAction,
}: LedgerEmptyStateProps) {
  return (
    <div className="mt-[18px] flex flex-col items-center gap-2 rounded-[10px] border border-dashed border-border bg-surface px-6 py-12 text-center">
      <p className="text-[15px] font-bold">{title}</p>
      {isPast ? (
        <p className="max-w-[380px] text-[13px] text-text-muted">
          Competências passadas não aceitam novos lançamentos. Use as setas para voltar ao período
          vigente.
        </p>
      ) : (
        <>
          <p className="mb-1.5 max-w-[380px] text-[13px] text-text-muted">{hint}</p>
          <Button variant="outline" size="sm" onClick={onAction}>
            <Plus size={14} className="mr-1.5" aria-hidden />
            {actionLabel}
          </Button>
        </>
      )}
    </div>
  );
}
