"use client";

import { ChevronLeft, CircleStop, Plus, Trash2 } from "lucide-react";
import { Modal } from "../Modal";
import { Button } from "../Button";
import { Tabs } from "../Tabs";
import { ConfirmDialog } from "../ConfirmDialog";
import { ENTRY_KIND, versionTint, type Tone } from "../../lib/entry-types";
import { formatCurrency } from "../../lib/formatCurrency";
import type { SeriesActions, SeriesTab } from "../../hooks/useSeriesActions";
import { EntryDetailHeader } from "./EntryDetailHeader";
import { MonthCells } from "./MonthCells";
import { VersionChips } from "./VersionChips";
import { VersionHistoryList } from "./VersionHistoryList";
import { Legend } from "./Legend";
import { CompetenceSelect } from "./CompetenceSelect";

interface SeriesFichaProps {
  kind: "recorrente" | "fixa";
  tone: Tone;
  title: string;
  subtitle: string[];
  actions: SeriesActions;
  /** Notas do modo visualização (inalterável, encerrada). */
  notes: string[];
  hints: { version: string; end: string };
  /** Campos da Nova versão, que variam por natureza (categoria só em despesa). */
  versionFields: React.ReactNode;
  endLabel: string;
  confirm: { title: string; message: string };
  isPending: boolean;
  onClose: () => void;
  onCreateVersion: () => void;
  onEnd: () => void;
  onRemove: () => void;
}

const SECTION = "text-[11px] font-bold uppercase tracking-[0.06em] text-text-subtle";
const HINT =
  "mb-4 rounded-lg border border-red-mid bg-red-light px-3 py-2.5 text-[12.5px] text-text";

/**
 * Ficha de recorrente/receita fixa: abas Linha do tempo e Histórico, e os modos
 * Nova versão e Encerrar com prévia ao vivo. A feature entrega o estado
 * (`useSeriesActions`), os campos da versão e as mutations.
 */
export function SeriesFicha({
  kind,
  tone,
  title,
  subtitle,
  actions,
  notes,
  hints,
  versionFields,
  endLabel,
  confirm,
  isPending,
  onClose,
  onCreateVersion,
  onEnd,
  onRemove,
}: SeriesFichaProps) {
  const { mode, current } = actions;
  const crumb = mode === "version" ? "Nova versão" : mode === "end" ? "Encerrar" : undefined;
  const viewing = mode === "view" || mode === "confirm";
  const color = ENTRY_KIND[kind].color;

  const footer =
    mode === "version" || mode === "end" ? (
      <>
        <Button variant="ghost" onClick={actions.back}>
          <ChevronLeft size={16} className="mr-1" aria-hidden />
          Voltar
        </Button>
        <span className="flex-1" />
        <Button onClick={mode === "version" ? onCreateVersion : onEnd} isLoading={isPending}>
          {mode === "version" ? "Criar nova versão" : endLabel}
        </Button>
      </>
    ) : (
      <>
        <Button
          variant="ghost"
          className="text-red hover:bg-red-light"
          onClick={actions.openConfirm}
        >
          <Trash2 size={14} className="mr-1.5" aria-hidden />
          Remover
        </Button>
        <span className="flex-1" />
        {actions.can.end && (
          <Button variant="outline" onClick={actions.openEnd}>
            <CircleStop size={14} className="mr-1.5" aria-hidden />
            Encerrar
          </Button>
        )}
        {actions.can.version && (
          <Button onClick={actions.openVersion}>
            <Plus size={14} className="mr-1.5" aria-hidden />
            Nova versão
          </Button>
        )}
        {!actions.can.end && !actions.can.version && (
          <Button variant="ghost" onClick={onClose}>
            Fechar
          </Button>
        )}
      </>
    );

  return (
    <>
      <Modal
        isOpen
        onClose={onClose}
        title={title}
        width="2xl"
        header={
          <EntryDetailHeader
            kind={kind}
            crumb={crumb}
            title={title}
            subtitle={subtitle}
            value={formatCurrency(current.amount)}
            valueCaption="por mês · valor vigente"
            tone={tone}
          />
        }
        footer={footer}
      >
        {viewing && (
          <>
            <Tabs
              className="-mx-5 -mt-5 mb-5 px-5"
              value={actions.tab}
              onValueChange={(tab) => actions.setTab(tab as SeriesTab)}
              tabs={[
                { id: "timeline", label: "Linha do tempo" },
                { id: "history", label: `Histórico (${actions.history.length})` },
              ]}
            />
            {actions.tab === "timeline" ? (
              <>
                <MonthCells
                  label="Linha do tempo"
                  cells={actions.timeline.cells}
                  trailing={actions.timeline.trailing}
                />
                <VersionChips versions={actions.chips} />
                {notes.map((note) => (
                  <p key={note} className="mt-4 text-[12.5px] text-text-muted">
                    {note}
                  </p>
                ))}
              </>
            ) : (
              <VersionHistoryList rows={actions.history} tone={tone} />
            )}
          </>
        )}

        {mode === "version" && (
          <>
            <p className={HINT}>{hints.version}</p>
            <div className="mb-1.5 grid grid-cols-2 gap-x-3.5 gap-y-3 max-md:grid-cols-1">
              {versionFields}
            </div>
            <div className="mb-2.5 mt-4 flex items-center justify-between">
              <span className={SECTION}>Prévia</span>
              <Legend
                items={[
                  { label: "valor atual", swatch: "solid", color: versionTint(kind, 0, 2) },
                  { label: "nova versão", swatch: "new", color },
                ]}
              />
            </div>
            <MonthCells label="Prévia" cells={actions.timeline.cells} />
          </>
        )}

        {mode === "end" && (
          <>
            <p className={HINT}>{hints.end}</p>
            <div className="mb-1.5 grid grid-cols-2 gap-x-3.5 max-md:grid-cols-1">
              <CompetenceSelect
                label="Mês de encerramento"
                value={actions.end.last}
                from={actions.minCompetence}
                onChange={actions.end.setLast}
                error={actions.errors.last}
              />
            </div>
            <div className="mb-2.5 mt-4 flex items-center justify-between">
              <span className={SECTION}>Prévia</span>
              <Legend
                items={[
                  { label: "continua lançado", swatch: "solid", color },
                  { label: "deixa de existir", swatch: "cut" },
                ]}
              />
            </div>
            <MonthCells label="Prévia" cells={actions.timeline.cells} />
          </>
        )}
      </Modal>
      <ConfirmDialog
        isOpen={mode === "confirm"}
        onClose={actions.back}
        onConfirm={onRemove}
        title={confirm.title}
        message={confirm.message}
        confirmLabel="Remover"
        isDanger
        isLoading={isPending}
      />
    </>
  );
}
