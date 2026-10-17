import { ChevronLeft, ChevronRight } from "lucide-react";
import { formatCompetenceLong, type Competence } from "../../lib/competence";

interface MonthHeaderProps {
  competence: Competence;
  isCurrent: boolean;
  onPrevious: () => void;
  onNext: () => void;
  onGoToCurrent: () => void;
}

const ARROW =
  "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border bg-surface text-text-muted hover:bg-bg hover:text-text";

export function MonthHeader({
  competence,
  isCurrent,
  onPrevious,
  onNext,
  onGoToCurrent,
}: MonthHeaderProps) {
  return (
    <div className="flex flex-wrap items-center gap-2.5">
      <button type="button" onClick={onPrevious} aria-label="Mês anterior" className={ARROW}>
        <ChevronLeft size={16} />
      </button>
      <h2 className="min-w-[210px] text-center text-[26px] font-bold tracking-tight max-md:min-w-0 max-md:flex-1 max-md:text-xl">
        {formatCompetenceLong(competence)}
      </h2>
      <button type="button" onClick={onNext} aria-label="Próximo mês" className={ARROW}>
        <ChevronRight size={16} />
      </button>
      {isCurrent ? (
        <span className="rounded-full bg-green-light px-2.5 py-0.5 text-xs font-semibold text-green">
          Mês atual
        </span>
      ) : (
        <button
          type="button"
          onClick={onGoToCurrent}
          className="rounded-lg px-2.5 py-1.5 text-sm font-semibold text-red hover:bg-red-light"
        >
          Voltar para o mês atual
        </button>
      )}
    </div>
  );
}
