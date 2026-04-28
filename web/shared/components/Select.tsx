import { SelectHTMLAttributes, forwardRef } from "react";
import { cn } from "../lib/utils";

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: SelectOption[];
  placeholder?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, error, options, placeholder = "Selecione...", ...props }, ref) => {
    return (
      <div className="w-full">
        {label && <label className="mb-1.5 block text-sm font-medium text-text">{label}</label>}
        <select
          ref={ref}
          className={cn(
            "flex h-10 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red focus-visible:ring-offset-0",
            "disabled:cursor-not-allowed disabled:opacity-50",
            error && "border-red",
            className,
          )}
          {...props}
        >
          {placeholder && <option value="">{placeholder}</option>}
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        {error && <p className="mt-1.5 text-sm text-red">{error}</p>}
      </div>
    );
  },
);

Select.displayName = "Select";
