import { cn } from "../lib/utils";

/**
 * Tipos de lançamento exibidos como pílula. As chaves em MAIÚSCULAS vêm da API;
 * as minúsculas são usadas pelos cards que já conhecem o próprio tipo.
 */
export type EntryType =
  | "ONE_TIME"
  | "FIXED"
  | "INSTALLMENT"
  | "RECURRING"
  | "avulsa"
  | "fixa"
  | "parcelada"
  | "recorrente";

const STYLES: Record<EntryType, { label: string; cls: string }> = {
  ONE_TIME: { label: "Avulsa", cls: "bg-bg border border-border text-text-muted" },
  avulsa: { label: "Avulsa", cls: "bg-bg border border-border text-text-muted" },
  FIXED: { label: "Fixa", cls: "bg-green-light text-green" },
  fixa: { label: "Fixa", cls: "bg-green-light text-green" },
  INSTALLMENT: { label: "Parcelada", cls: "bg-[#fff7ed] text-[#c2660a]" },
  parcelada: { label: "Parcelada", cls: "bg-[#fff7ed] text-[#c2660a]" },
  RECURRING: { label: "Recorrente", cls: "bg-[#f5f0ff] text-[#6841c7]" },
  recorrente: { label: "Recorrente", cls: "bg-[#f5f0ff] text-[#6841c7]" },
};

interface TypeBadgeProps {
  type: EntryType;
  className?: string;
}

export function TypeBadge({ type, className }: TypeBadgeProps) {
  const style = STYLES[type];
  if (!style) return null;

  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold",
        style.cls,
        className,
      )}
    >
      {style.label}
    </span>
  );
}
