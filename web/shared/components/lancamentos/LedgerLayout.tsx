import { Plus } from "lucide-react";
import { Button } from "../Button";
import { Skeleton } from "../Skeleton";
import { formatCompetenceLong, type Competence, type CompetenceStatus } from "../../lib/competence";
import { buildStripCells, type LedgerGroup } from "../../lib/ledger";
import type { Tone } from "../../lib/entry-types";
import { MonthHeader } from "./MonthHeader";
import { MonthStrip } from "./MonthStrip";
import { MonthSummary, type SummarySegment } from "./MonthSummary";
import { EntryGroup } from "./EntryGroup";
import { EntryRow } from "./EntryRow";
import { LedgerEmptyState } from "./LedgerEmptyState";
import { ErrorNotice } from "./ErrorNotice";

export interface LedgerView<T> {
  status: CompetenceStatus;
  groups: LedgerGroup<T>[];
  count: number;
  total: number;
  totalLabel: string;
  segments: SummarySegment[];
}

interface LedgerLayoutProps<T> {
  title: string;
  subtitle: string;
  /** "despesa" / "receita": compõe o botão, o estado vazio e a ação de adicionar. */
  noun: string;
  emptyHint: string;
  tone: Tone;
  navigation: {
    selected: Competence;
    current: Competence;
    isCurrent: boolean;
    navigate: (delta: number) => void;
    select: (c: Competence) => void;
    goToCurrent: () => void;
  };
  stripTotals: (number | null)[];
  ledger: LedgerView<T> | undefined;
  errorMessage: string | null;
  onRetry: () => void;
  onNew: () => void;
  onOpen: (item: T, status: CompetenceStatus) => void;
  /** Assistente e Ficha, controlados pela tela da feature. */
  children?: React.ReactNode;
}

/**
 * "Extrato do mês" comum a Receitas e Despesas: cabeçalho, navegação, faixa de
 * 12 meses, resumo, grupos e os estados de carregamento, erro e vazio. A feature
 * entrega os dados já em view-model e controla os modais.
 */
export function LedgerLayout<T>({
  title,
  subtitle,
  noun,
  emptyHint,
  tone,
  navigation: nav,
  stripTotals,
  ledger,
  errorMessage,
  onRetry,
  onNew,
  onOpen,
  children,
}: LedgerLayoutProps<T>) {
  return (
    <div className="max-w-[1100px] p-4 sm:p-7">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{title}</h1>
          <p className="text-sm text-text-muted">{subtitle}</p>
        </div>
        <Button onClick={onNew}>
          <Plus size={16} className="mr-1.5" aria-hidden />
          Nova {noun}
        </Button>
      </div>

      <div className="mb-4 flex flex-col gap-3">
        <MonthHeader
          competence={nav.selected}
          isCurrent={nav.isCurrent}
          onPrevious={() => nav.navigate(-1)}
          onNext={() => nav.navigate(1)}
          onGoToCurrent={nav.goToCurrent}
        />
        <MonthStrip
          cells={buildStripCells(nav.selected.year, stripTotals, nav.selected, nav.current)}
          onSelect={(month) => nav.select({ year: nav.selected.year, month })}
        />
      </div>

      {errorMessage ? (
        <ErrorNotice message={errorMessage} onRetry={onRetry} />
      ) : !ledger ? (
        <div className="space-y-3" aria-busy="true">
          <Skeleton className="h-24" />
          <Skeleton className="h-14" />
          <Skeleton className="h-14" />
        </div>
      ) : ledger.count === 0 ? (
        <LedgerEmptyState
          title={`Nenhuma ${noun} em ${formatCompetenceLong(nav.selected).toLowerCase()}`}
          isPast={ledger.status === "past"}
          hint={emptyHint}
          actionLabel={`Adicionar ${noun}`}
          onAction={onNew}
        />
      ) : (
        <>
          <MonthSummary
            label={ledger.totalLabel}
            total={ledger.total}
            count={ledger.count}
            tone={tone}
            segments={ledger.segments}
          />
          {ledger.groups.map((group) => (
            <EntryGroup
              key={group.kind}
              title={group.title}
              count={group.rows.length}
              subtotal={group.subtotal}
            >
              {group.rows.map((row) => (
                <EntryRow
                  key={row.key}
                  kind={row.kind}
                  title={row.title}
                  subtitle={row.subtitle}
                  amount={row.amount}
                  amountCaption={row.amountCaption}
                  previousAmount={row.previousAmount}
                  progress={row.progress}
                  tone={tone}
                  onClick={() => onOpen(row.item, ledger.status)}
                />
              ))}
            </EntryGroup>
          ))}
        </>
      )}

      {children}
    </div>
  );
}
