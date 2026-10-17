import { ChevronLeft, ChevronRight } from "lucide-react";
import { Modal } from "../Modal";
import { Button } from "../Button";
import { StepIndicator } from "./StepIndicator";

const STEPS = ["Tipo", "Detalhes", "Revisão"];
const REVIEW = STEPS.length - 1;

interface WizardShellProps {
  title: string;
  /** 0 Tipo · 1 Detalhes · 2 Revisão. */
  step: number;
  /** Primeira etapa alcançável: 1 na edição, que não passa pela etapa Tipo. */
  firstStep?: number;
  confirmLabel: string;
  isPending?: boolean;
  onClose: () => void;
  onBack: () => void;
  onContinue: () => void;
  onConfirm: () => void;
  children: React.ReactNode;
}

/** Moldura do assistente Tipo → Detalhes → Revisão, comum a Receitas e Despesas. */
export function WizardShell({
  title,
  step,
  firstStep = 0,
  confirmLabel,
  isPending = false,
  onClose,
  onBack,
  onContinue,
  onConfirm,
  children,
}: WizardShellProps) {
  return (
    <Modal
      isOpen
      onClose={onClose}
      title={title}
      width="xl"
      header={
        <div className="flex items-start gap-4">
          <span className="pt-0.5 text-base font-bold">{title}</span>
          <div className="flex-1">
            <StepIndicator steps={STEPS} current={step} />
          </div>
        </div>
      }
      footer={
        <>
          {step > firstStep ? (
            <Button variant="ghost" onClick={onBack}>
              <ChevronLeft size={16} className="mr-1" aria-hidden />
              Voltar
            </Button>
          ) : (
            <Button variant="ghost" onClick={onClose}>
              Cancelar
            </Button>
          )}
          <span className="flex-1" />
          {step < REVIEW ? (
            <Button onClick={onContinue}>
              Continuar
              <ChevronRight size={16} className="ml-1" aria-hidden />
            </Button>
          ) : (
            <Button onClick={onConfirm} isLoading={isPending}>
              {confirmLabel}
            </Button>
          )}
        </>
      }
    >
      <div className="min-h-[300px]">{children}</div>
    </Modal>
  );
}
