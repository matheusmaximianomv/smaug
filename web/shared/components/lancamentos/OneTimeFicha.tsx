"use client";

import { useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { Modal } from "../Modal";
import { Button } from "../Button";
import { ConfirmDialog } from "../ConfirmDialog";
import { ENTRY_KIND, type Tone } from "../../lib/entry-types";
import { formatCurrency } from "../../lib/formatCurrency";
import { formatCompetenceShort, type Competence } from "../../lib/competence";
import { EntryDetailHeader } from "./EntryDetailHeader";
import { FactGrid, type Fact } from "./FactGrid";
import { MonthCells } from "./MonthCells";

const MONTHS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

interface OneTimeFichaProps {
  tone: Tone;
  title: string;
  subtitle: string[];
  competence: Competence;
  amount: number;
  facts: Fact[];
  /** Competência passada: o servidor recusa editar e remover, então a Ficha só consulta. */
  isPast: boolean;
  confirm: { title: string; message: string };
  isPending: boolean;
  onClose: () => void;
  onEdit: () => void;
  onRemove: () => void;
}

/** Ficha de avulsa (despesa ou receita): fatos, o mês no ano e Editar/Remover fora do passado. */
export function OneTimeFicha({
  tone,
  title,
  subtitle,
  competence,
  amount,
  facts,
  isPast,
  confirm,
  isPending,
  onClose,
  onEdit,
  onRemove,
}: OneTimeFichaProps) {
  const [confirming, setConfirming] = useState(false);
  const cells = MONTHS.map((month, i) => {
    const isCompetence = i + 1 === competence.month;
    return {
      key: month,
      month,
      state: "normal" as const,
      color: isCompetence ? ENTRY_KIND.avulsa.color : undefined,
      value: isCompetence ? formatCurrency(amount).replace("R$", "").trim() : "",
      isReference: isCompetence,
    };
  });

  return (
    <>
      <Modal
        isOpen
        onClose={onClose}
        title={title}
        width="2xl"
        header={
          <EntryDetailHeader
            kind="avulsa"
            title={title}
            subtitle={subtitle}
            value={formatCurrency(amount)}
            valueCaption={`competência ${formatCompetenceShort(competence)}`}
            tone={tone}
          />
        }
        footer={
          isPast ? (
            <>
              <span className="text-[12.5px] text-text-subtle">
                Competências passadas não podem ser alteradas.
              </span>
              <span className="flex-1" />
              <Button variant="ghost" onClick={onClose}>
                Fechar
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="ghost"
                className="text-red hover:bg-red-light"
                onClick={() => setConfirming(true)}
              >
                <Trash2 size={14} className="mr-1.5" aria-hidden />
                Remover
              </Button>
              <span className="flex-1" />
              <Button onClick={onEdit}>
                <Pencil size={14} className="mr-1.5" aria-hidden />
                Editar
              </Button>
            </>
          )
        }
      >
        <FactGrid columns={3} facts={facts} />
        <p className="mb-2 mt-[18px] text-[11px] font-bold uppercase tracking-[0.06em] text-text-subtle">
          No ano de {competence.year}
        </p>
        <MonthCells label={`No ano de ${competence.year}`} cells={cells} />
        <p className="mt-4 text-[12.5px] text-text-muted">
          Avulsa: acontece uma única vez, só nesta competência.
        </p>
      </Modal>
      <ConfirmDialog
        isOpen={confirming}
        onClose={() => setConfirming(false)}
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
