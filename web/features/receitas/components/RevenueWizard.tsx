"use client";

import { useRevenueWizard, DETAILS_STEP, TYPE_STEP } from "../hooks/useRevenueWizard";
import { MODALITY_LABEL } from "../hooks/useRevenueMonth";
import { WizardShell } from "@/shared/components/lancamentos/WizardShell";
import { ChoiceCardGroup, type ChoiceOption } from "@/shared/components/lancamentos/ChoiceCard";
import { MiniGrid } from "@/shared/components/lancamentos/MiniGrid";
import { MoneyField } from "@/shared/components/lancamentos/MoneyField";
import { CompetenceSelect } from "@/shared/components/lancamentos/CompetenceSelect";
import { AffectedMonths } from "@/shared/components/lancamentos/AffectedMonths";
import { TypeBadge } from "@/shared/components/TypeBadge";
import { Input } from "@/shared/components/Input";
import { ENTRY_KIND } from "@/shared/lib/entry-types";
import { formatCurrency } from "@/shared/lib/formatCurrency";
import {
  formatCompetenceLong,
  formatCompetenceShort,
  type Competence,
} from "@/shared/lib/competence";
import type { OneTimeRevenue, RevenueModality } from "../types";
import type { RevenueKind } from "../types/schemas";

interface RevenueWizardProps {
  initialCompetence: Competence;
  reference: Competence;
  edit?: OneTimeRevenue;
  onClose: () => void;
}

const TYPE_OPTIONS: ChoiceOption<RevenueKind>[] = [
  {
    value: "avulsa",
    title: "Avulsa",
    description: "Entra uma única vez.",
    example: "freelance, bônus, venda",
    illustration: <MiniGrid cells={[null, null, ENTRY_KIND.avulsa.color, null, null, null]} />,
  },
  {
    value: "fixa",
    title: "Fixa (com vigência)",
    description: "Entra todo mês durante a vigência.",
    example: "salário, aluguel recebido",
    illustration: <MiniGrid cells={Array(6).fill(ENTRY_KIND.fixa.color)} />,
  },
];

const MODALITY_OPTIONS: ChoiceOption<RevenueModality>[] = [
  {
    value: "ALTERABLE",
    title: "pode mudar",
    description: "Alterável — reajustes viram novas versões, a partir do mês escolhido.",
    illustration: (
      <svg viewBox="0 0 120 36" className="mb-1 h-[30px] w-full" aria-hidden>
        <path
          d="M4 28h36v-8h40v-10h36"
          stroke="currentColor"
          strokeWidth="2.5"
          fill="none"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    value: "UNALTERABLE",
    title: "fica fixo",
    description: "Inalterável — mesmo valor até o encerramento.",
    illustration: (
      <svg viewBox="0 0 120 36" className="mb-1 h-[30px] w-full" aria-hidden>
        <path d="M4 18h112" stroke="currentColor" strokeWidth="2.5" fill="none" />
      </svg>
    ),
  },
];

const MODALITY_NOTE: Record<RevenueModality, string> = {
  ALTERABLE:
    "Reajustes futuros serão registrados como nova versão — os meses anteriores mantêm o valor original.",
  UNALTERABLE: "Valor travado. Para mudar, encerre esta receita e crie outra.",
};

export function RevenueWizard({ initialCompetence, reference, edit, onClose }: RevenueWizardProps) {
  const wizard = useRevenueWizard({ initialCompetence, reference, edit, onDone: onClose });
  const { values, errors, form } = wizard;
  const isFixed = values.kind === "fixa";

  return (
    <WizardShell
      title={wizard.isEdit ? "Editar receita" : "Nova receita"}
      step={wizard.step}
      firstStep={wizard.firstStep}
      confirmLabel={wizard.isEdit ? "Salvar alterações" : "Confirmar receita"}
      isPending={wizard.isPending}
      onClose={onClose}
      onBack={wizard.back}
      onContinue={wizard.next}
      onConfirm={wizard.submit}
    >
      {wizard.step === TYPE_STEP && (
        <>
          <p className="mb-[18px] text-lg font-bold">
            Essa receita entra uma vez ou durante um período?
          </p>
          <ChoiceCardGroup
            label="Tipo de receita"
            value={values.kind}
            onChange={wizard.setKind}
            options={TYPE_OPTIONS}
            className="grid-cols-[repeat(auto-fit,minmax(160px,1fr))]"
          />
        </>
      )}

      {wizard.step === DETAILS_STEP && (
        <div className="flex flex-col gap-3.5">
          <div className="flex items-center gap-2">
            <TypeBadge type={values.kind} />
            {wizard.isEdit ? (
              <span className="text-[12.5px] text-text-subtle">
                O tipo não muda depois do cadastro.
              </span>
            ) : (
              <button
                type="button"
                onClick={wizard.goToType}
                className="text-[12.5px] font-semibold text-red hover:underline"
              >
                trocar
              </button>
            )}
          </div>
          <Input
            label="Descrição"
            placeholder="Ex: Salário"
            autoFocus
            error={errors.description?.message}
            {...form.register("description")}
          />
          <div className="flex flex-wrap items-start gap-3 *:min-w-[200px] *:flex-1">
            <MoneyField
              label={isFixed ? "Valor mensal" : "Valor"}
              tone="revenue"
              error={errors.amount?.message}
              {...form.register("amount")}
            />
            <CompetenceSelect
              label={isFixed ? "Início da vigência" : "Competência"}
              value={values.start}
              from={wizard.minCompetence}
              onChange={(c) => form.setValue("start", c)}
              error={errors.start?.message}
            />
            {isFixed &&
              (values.hasEnd ? (
                <CompetenceSelect
                  label="Fim da vigência"
                  required={false}
                  value={values.end}
                  from={values.start}
                  onChange={(c) => form.setValue("end", c)}
                  error={errors.end?.message}
                />
              ) : (
                <Input label="Fim da vigência" value="Sem término" disabled readOnly />
              ))}
          </div>
          {isFixed && (
            <>
              <label className="flex cursor-pointer items-center gap-2 text-[12.5px] text-text-muted">
                <input
                  type="checkbox"
                  className="accent-red"
                  checked={!values.hasEnd}
                  onChange={(e) => form.setValue("hasEnd", !e.target.checked)}
                />
                Sem data de término
              </label>
              <p className="text-[13.5px] font-bold">Durante a vigência, o valor…</p>
              <ChoiceCardGroup
                label="Modalidade"
                value={values.modality}
                onChange={(m) => form.setValue("modality", m)}
                options={MODALITY_OPTIONS}
                tone="revenue"
                className="grid-cols-2"
              />
            </>
          )}
        </div>
      )}

      {wizard.step === 2 && (
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <TypeBadge type={values.kind} />
            <span className="text-base font-bold">{values.description.trim()}</span>
            {isFixed && (
              <span className="text-[12.5px] text-text-subtle">
                {MODALITY_LABEL[values.modality]}
              </span>
            )}
          </div>
          <p className="mt-2 text-[30px] font-bold tabular-nums text-green">
            {formatCurrency(wizard.amount)}
            <small className="text-sm font-semibold text-text-muted">
              {isFixed
                ? `/mês · ${
                    values.hasEnd
                      ? `${formatCompetenceShort(values.start)} a ${formatCompetenceShort(values.end)}`
                      : `desde ${formatCompetenceShort(values.start)}, sem término`
                  }`
                : ` em ${formatCompetenceLong(values.start).toLowerCase()}`}
            </small>
          </p>
          <p className="mb-2 mt-[18px] text-[11px] font-bold uppercase tracking-[0.06em] text-text-subtle">
            Meses afetados
          </p>
          <AffectedMonths
            kind={values.kind}
            months={wizard.affected.months}
            open={wizard.affected.open}
          />
          {isFixed && (
            <p className="mt-4 text-[12.5px] text-text-muted">{MODALITY_NOTE[values.modality]}</p>
          )}
        </div>
      )}
    </WizardShell>
  );
}
