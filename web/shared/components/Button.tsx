import { ButtonHTMLAttributes, forwardRef } from "react";
import { cn } from "../lib/utils";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "outline" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { className, variant = "default", size = "md", isLoading, disabled, children, ...props },
    ref,
  ) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center rounded-lg font-medium transition-colors",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
          "disabled:pointer-events-none disabled:opacity-50",
          {
            "bg-red text-white hover:bg-red/90 focus-visible:ring-red": variant === "default",
            "border border-border bg-surface hover:bg-bg": variant === "outline",
            "hover:bg-bg": variant === "ghost",
            "bg-red text-white hover:bg-red/90": variant === "danger",
          },
          {
            "h-8 px-3 text-sm": size === "sm",
            "h-10 px-4 text-base": size === "md",
            "h-12 px-6 text-lg": size === "lg",
          },
          className,
        )}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading ? (
          <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
        ) : null}
        {children}
      </button>
    );
  },
);

Button.displayName = "Button";
