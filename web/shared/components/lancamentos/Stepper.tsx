"use client";

import { useId } from "react";

interface StepperProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  hint?: string;
  error?: string;
}

/** − valor + com limites; digitação fora do intervalo é presa aos extremos. */
export function Stepper({ label, value, onChange, min = 1, max = 72, hint, error }: StepperProps) {
  const id = useId();
  const clamp = (n: number) => Math.min(max, Math.max(min, n));
  const describedBy = `${id}-desc`;

  return (
    <div className="flex flex-col gap-[5px]">
      <label
        htmlFor={id}
        className="text-[12.5px] font-semibold uppercase tracking-[0.04em] text-text-muted"
      >
        {label}
        <span className="text-red"> *</span>
      </label>
      <div className="flex h-[39px] w-[124px] overflow-hidden rounded-md border border-border bg-surface">
        <button
          type="button"
          aria-label="Diminuir"
          disabled={value <= min}
          onClick={() => onChange(clamp(value - 1))}
          className="w-[34px] bg-bg text-base text-text-muted disabled:opacity-40"
        >
          −
        </button>
        <input
          id={id}
          inputMode="numeric"
          value={value}
          aria-invalid={error ? true : undefined}
          aria-describedby={hint || error ? describedBy : undefined}
          onChange={(event) => onChange(clamp(parseInt(event.target.value, 10) || min))}
          className="w-14 text-center text-sm font-bold outline-none"
        />
        <button
          type="button"
          aria-label="Aumentar"
          disabled={value >= max}
          onClick={() => onChange(clamp(value + 1))}
          className="w-[34px] bg-bg text-base text-text-muted disabled:opacity-40"
        >
          +
        </button>
      </div>
      {error ? (
        <p id={describedBy} className="text-sm text-red">
          {error}
        </p>
      ) : (
        hint && (
          <p id={describedBy} className="text-[11.5px] text-text-subtle">
            {hint}
          </p>
        )
      )}
    </div>
  );
}
