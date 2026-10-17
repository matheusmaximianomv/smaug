import { Check } from "lucide-react";
import { cn } from "../../lib/utils";

interface StepIndicatorProps {
  steps: string[];
  /** Índice da etapa atual (0-based). */
  current: number;
}

/** "1 Tipo · 2 Detalhes · 3 Revisão"; até 768 px só os números ficam visíveis. */
export function StepIndicator({ steps, current }: StepIndicatorProps) {
  return (
    <ol
      aria-label="Etapas"
      className="flex justify-center gap-[18px] pt-[3px] text-[12.5px] font-semibold text-text-subtle"
    >
      {steps.map((step, index) => {
        const done = index < current;
        const active = index === current;
        return (
          <li
            key={step}
            aria-current={active ? "step" : undefined}
            className={cn("flex items-center gap-1.5", active && "text-text")}
          >
            <i
              className={cn(
                "flex h-5 w-5 items-center justify-center rounded-full border-[1.5px] border-border text-[11px] not-italic",
                active && "border-red bg-red text-white",
                done && "border-green text-green",
              )}
            >
              {done ? <Check size={11} aria-label="concluída" /> : index + 1}
            </i>
            <span className="max-md:sr-only">{step}</span>
          </li>
        );
      })}
    </ol>
  );
}
