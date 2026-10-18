import { InputHTMLAttributes, forwardRef, useId } from "react";
import { cn } from "../../lib/utils";
import { TONE_TEXT, type Tone } from "../../lib/entry-types";

export interface MoneyFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  label: string;
  tone: Tone;
  error?: string;
}

/** Valor com prefixo R$, grande e na cor da natureza; `forwardRef` para o `register` do RHF. */
export const MoneyField = forwardRef<HTMLInputElement, MoneyFieldProps>(
  ({ label, tone, error, id, className, ...props }, ref) => {
    const generatedId = useId();
    const inputId = id ?? generatedId;
    const errorId = `${inputId}-error`;

    return (
      <div className={cn("flex min-w-0 flex-col gap-[5px]", className)}>
        <label
          htmlFor={inputId}
          className="text-[12.5px] font-semibold uppercase tracking-[0.04em] text-text-muted"
        >
          {label}
          <span className="text-red"> *</span>
        </label>
        <div
          className={cn(
            "flex items-baseline gap-2 rounded-md border border-border bg-surface px-[11px] py-1.5",
            "focus-within:border-red focus-within:shadow-[0_0_0_3px_rgba(192,41,42,0.08)]",
            error && "border-red",
          )}
        >
          <span className="text-[13px] font-semibold text-text-subtle">R$</span>
          <input
            ref={ref}
            id={inputId}
            inputMode="decimal"
            placeholder="0,00"
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? errorId : undefined}
            className={cn(
              "w-full bg-transparent text-lg font-bold tabular-nums outline-hidden placeholder:text-text-subtle",
              TONE_TEXT[tone],
            )}
            {...props}
          />
        </div>
        {error && (
          <p id={errorId} className="text-sm text-red">
            {error}
          </p>
        )}
      </div>
    );
  },
);

MoneyField.displayName = "MoneyField";
