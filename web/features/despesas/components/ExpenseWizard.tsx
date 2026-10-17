"use client";

import { useExpenseWizard, DETAILS_STEP, TYPE_STEP } from "../hooks/useExpenseWizard";
import { WizardShell } from "@/shared/components/lancamentos/WizardShell";
import { ChoiceCardGroup, type ChoiceOption } from "@/shared/components/lancamentos/ChoiceCard";
import { MiniGrid } from "@/shared/components/lancamentos/MiniGrid";
import { MoneyField } from "@/shared/components/lancamentos/MoneyField";
import { Stepper } from "@/shared/components/lancamentos/Stepper";
import { CompetenceSelect } from "@/shared/components/lancamentos/CompetenceSelect";
import { AffectedMonths } from "@/shared/components/lancamentos/AffectedMonths";
import { TypeBadge } from "@/shared/components/TypeBadge";
import { Input } from "@/shared/components/Input";
import { Select } from "@/shared/components/Select";
import { ENTRY_KIND } from "@/shared/lib/entry-types";
import { formatCurrency } from "@/shared/lib/formatCurrency";
import {
  formatCompetenceLong,
  formatCompetenceShort,
  type Competence,
} from "@/shared/lib/competence";
import type { Category } from "@/features/categorias/types";
import type { OneTimeExpenseMonthItem } from "../types";
import type { ExpenseKind } from "../types/schemas";

interface ExpenseWizardProps {
  categories: Category[];
  initialCompetence: Competence;
  reference: Competence;
  edit?: OneTimeExpenseMonthItem;
  onClose: () => void;
}

const C = {
  avulsa: ENTRY_KIND.avulsa.color,
  parcelada: ENTRY_KIND.parcelada.color,
  recorrente: ENTRY_KIND.recorrente.color,
};

const TYPE_OPTIONS: ChoiceOption<ExpenseKind>[] = [
  {
    value: "avulsa",
    title: "Avulsa",
    description: "Acontece uma única vez.",
    example: "farmácia, conserto, presente",
    illustration: <MiniGrid cells={[null, null, C.avulsa, null, null, null]} />,
  },
  {
    value: "parcelada",
    title: "Parcelada",
    description: "Um valor total dividido em parcelas.",
    example: "eletrodoméstico, curso, viagem",
    illustration: (
      <MiniGrid cells={[C.parcelada, C.parcelada, C.parcelada, C.parcelada, null, null]} />
    ),
  },
  {
    value: "recorrente",
    title: "Recorrente",
    description: "Repete todo mês até ser encerrada.",
    example: "aluguel, academia, plano",
    illustration: <MiniGrid cells={Array(6).fill(C.recorrente)} />,
  },
];

const AMOUNT_LABEL: Record<ExpenseKind, string> = {
  avulsa: "Valor",
  parcelada: "Valor total",
  recorrente: "Valor mensal",
};

const START_LABEL: Record<ExpenseKind, string> = {
  avulsa: "Competência",
  parcelada: "1ª parcela em",
  recorrente: "Começa em",
};

export function ExpenseWizard({
  categories,
  initialCompetence,
  reference,
  edit,
  onClose,
}: ExpenseWizardProps) {
  const wizard = useExpenseWizard({ initialCompetence, reference, edit, onDone: onClose });
  const { values, errors, form } = wizard;
  const word = wizard.isEdit ? "Editar despesa" : "Nova despesa";
  const sortedCategories = [...categories].sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
  const categoryName = categories.find((c) => c.id === values.categoryId)?.name ?? "—";

  return (
    <WizardShell
      title={word}
      step={wizard.step}
      firstStep={wizard.firstStep}
      confirmLabel={wizard.isEdit ? "Salvar alterações" : "Confirmar despesa"}
      isPending={wizard.isPending}
      onClose={onClose}
      onBack={wizard.back}
      onContinue={wizard.next}
      onConfirm={wizard.submit}
    >
      {wizard.step === TYPE_STEP && (
        <>
          <p className="mb-[18px] text-lg font-bold">
            Como essa despesa se comporta ao longo do tempo?
          </p>
          <ChoiceCardGroup
            label="Tipo de despesa"
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
            placeholder="Ex: Supermercado"
            autoFocus
            error={errors.description?.message}
            {...form.register("description")}
          />
          <div className="flex flex-wrap items-start gap-3 [&>*]:min-w-[200px] [&>*]:flex-1">
            <MoneyField
              label={AMOUNT_LABEL[values.kind]}
              tone="expense"
              error={errors.amount?.message}
              {...form.register("amount")}
            />
            <Select
              label="Categoria"
              options={sortedCategories.map((c) => ({ value: c.id, label: c.name }))}
              error={errors.categoryId?.message}
              {...form.register("categoryId")}
            />
          </div>
          <div className="flex flex-wrap items-start gap-3">
            {values.kind === "parcelada" && (
              <Stepper
                label="Nº de parcelas"
                hint="1 a 72"
                value={values.count}
                onChange={(n) => form.setValue("count", n)}
                error={errors.count?.message}
              />
            )}
            <div className="min-w-[200px] flex-1">
              <CompetenceSelect
                label={START_LABEL[values.kind]}
                value={values.start}
                from={wizard.minCompetence}
                onChange={(c) => form.setValue("start", c)}
                error={errors.start?.message}
              />
            </div>
            {values.kind === "recorrente" && (
              <div className="min-w-[200px] flex-1">
                {values.hasEnd ? (
                  <CompetenceSelect
                    label="Termina em"
                    required={false}
                    value={values.end}
                    from={values.start}
                    onChange={(c) => form.setValue("end", c)}
                    error={errors.end?.message}
                  />
                ) : (
                  <Input label="Termina em" value="Sem término" disabled readOnly />
                )}
              </div>
            )}
          </div>
          {values.kind === "recorrente" && (
            <label className="flex cursor-pointer items-center gap-2 text-[12.5px] text-text-muted">
              <input
                type="checkbox"
                className="accent-red"
                checked={!values.hasEnd}
                onChange={(e) => form.setValue("hasEnd", !e.target.checked)}
              />
              Sem data de término (encerre quando quiser)
            </label>
          )}
        </div>
      )}

      {wizard.step === 2 && (
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <TypeBadge type={values.kind} />
            <span className="text-base font-bold">{values.description.trim()}</span>
            <span className="text-[12.5px] text-text-subtle">{categoryName}</span>
          </div>
          <p className="mt-2 text-[30px] font-bold tabular-nums text-red">
            <ReviewHighlight
              kind={values.kind}
              amount={wizard.amount}
              months={wizard.affected.months}
              start={values.start}
              end={values.hasEnd ? values.end : null}
            />
          </p>
          <p className="mb-2 mt-[18px] text-[11px] font-bold uppercase tracking-[0.06em] text-text-subtle">
            Meses afetados
          </p>
          <AffectedMonths
            kind={values.kind}
            months={wizard.affected.months}
            open={wizard.affected.open}
          />
          {values.kind === "parcelada" &&
            wizard.affected.months[0].amount !== wizard.affected.months.at(-1)?.amount && (
              <p className="mt-4 text-[12.5px] text-text-muted">
                Os centavos que sobram da divisão entram na 1ª parcela (
                {formatCurrency(wizard.affected.months[0].amount)}).
              </p>
            )}
        </div>
      )}
    </WizardShell>
  );
}

interface ReviewHighlightProps {
  kind: ExpenseKind;
  amount: number;
  months: { amount: number }[];
  start: Competence;
  end: Competence | null;
}

function ReviewHighlight({ kind, amount, months, start, end }: ReviewHighlightProps) {
  const small = "text-sm font-semibold text-text-muted";
  if (kind === "avulsa") {
    return (
      <>
        {formatCurrency(amount)}{" "}
        <small className={small}>em {formatCompetenceLong(start).toLowerCase()}</small>
      </>
    );
  }
  if (kind === "parcelada") {
    return (
      <>
        {months.length}× {formatCurrency(months[months.length - 1].amount)}{" "}
        <small className={small}>· total {formatCurrency(amount)}</small>
      </>
    );
  }
  return (
    <>
      {formatCurrency(amount)}
      <small className={small}>
        /mês ·{" "}
        {end
          ? `${formatCompetenceShort(start)} a ${formatCompetenceShort(end)}`
          : `desde ${formatCompetenceShort(start)}, sem término`}
      </small>
    </>
  );
}
