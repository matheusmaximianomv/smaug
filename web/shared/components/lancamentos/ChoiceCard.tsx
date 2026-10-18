"use client";

import { useRef } from "react";
import { cn } from "../../lib/utils";

export interface ChoiceOption<T extends string> {
  value: T;
  title: string;
  description?: string;
  example?: string;
  /** Mini-grade (tipo) ou ilustração (modalidade) acima do título. */
  illustration?: React.ReactNode;
}

interface ChoiceCardGroupProps<T extends string> {
  label: string;
  value: T;
  onChange: (value: T) => void;
  options: ChoiceOption<T>[];
  /** `accent` usa o vermelho da marca; `revenue`, o verde (modalidade da fixa). */
  tone?: "accent" | "revenue";
  className?: string;
}

const SELECTED = {
  accent: "border-red shadow-[0_0_0_3px] shadow-red-light",
  revenue: "border-green text-green shadow-[0_0_0_3px] shadow-green-light",
};

/**
 * Cartões selecionáveis com a semântica de um grupo de rádio: só o selecionado
 * entra no Tab, e as setas trocam a seleção e movem o foco — o comportamento que
 * um `<input type="radio">` nativo teria, sem abrir mão do layout de cartão.
 */
export function ChoiceCardGroup<T extends string>({
  label,
  value,
  onChange,
  options,
  tone = "accent",
  className,
}: ChoiceCardGroupProps<T>) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  const move = (from: number, delta: number) => {
    const next = (from + delta + options.length) % options.length;
    onChange(options[next].value);
    refs.current[next]?.focus();
  };

  const onKeyDown = (index: number) => (event: React.KeyboardEvent) => {
    if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      event.preventDefault();
      move(index, 1);
    } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      event.preventDefault();
      move(index, -1);
    }
  };

  return (
    <div role="radiogroup" aria-label={label} className={cn("grid gap-3", className)}>
      {options.map((option, index) => {
        const checked = option.value === value;
        return (
          <button
            key={option.value}
            ref={(el) => {
              refs.current[index] = el;
            }}
            type="button"
            role="radio"
            aria-checked={checked}
            tabIndex={checked ? 0 : -1}
            onClick={() => onChange(option.value)}
            onKeyDown={onKeyDown(index)}
            className={cn(
              "flex flex-col gap-[5px] rounded-xl border-[1.5px] border-border bg-surface px-4 py-[18px] text-left text-text",
              "hover:border-red-mid focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-red",
              checked && SELECTED[tone],
            )}
          >
            {option.illustration}
            <b className={cn("text-[15px]", option.illustration ? "mt-2.5" : undefined)}>
              {option.title}
            </b>
            {option.description && (
              <span className="text-[12.5px] text-text-muted">{option.description}</span>
            )}
            {option.example && (
              <em className="text-[11.5px] not-italic text-text-subtle">{option.example}</em>
            )}
          </button>
        );
      })}
    </div>
  );
}
