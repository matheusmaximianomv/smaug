import { InputHTMLAttributes, forwardRef } from "react";
import { cn } from "../lib/utils";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && <label className="mb-1.5 block text-sm font-medium text-text">{label}</label>}
        <input
          ref={ref}
          className={cn(
            "flex h-10 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm",
            "placeholder:text-text-subtle",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red focus-visible:ring-offset-0",
            "disabled:cursor-not-allowed disabled:opacity-50",
            error && "border-red focus-visible:ring-red",
            className,
          )}
          {...props}
        />
        {error && <p className="mt-1.5 text-sm text-red">{error}</p>}
      </div>
    );
  },
);

Input.displayName = "Input";
