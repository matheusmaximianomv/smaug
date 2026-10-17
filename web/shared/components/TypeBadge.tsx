import { cn } from "../lib/utils";
import { ENTRY_KIND, type EntryKind } from "../lib/entry-types";

/**
 * Tipos de lançamento exibidos como pílula. As chaves em MAIÚSCULAS vêm da API;
 * as minúsculas são usadas pelos componentes que já conhecem o próprio tipo.
 */
export type EntryType = "ONE_TIME" | "FIXED" | "INSTALLMENT" | "RECURRING" | EntryKind;

const KIND_OF: Record<EntryType, EntryKind> = {
  ONE_TIME: "avulsa",
  FIXED: "fixa",
  INSTALLMENT: "parcelada",
  RECURRING: "recorrente",
  avulsa: "avulsa",
  fixa: "fixa",
  parcelada: "parcelada",
  recorrente: "recorrente",
};

interface TypeBadgeProps {
  type: EntryType;
  className?: string;
}

export function TypeBadge({ type, className }: TypeBadgeProps) {
  const kind = KIND_OF[type];
  if (!kind) return null;
  const { label, badgeCls, icon: Icon } = ENTRY_KIND[kind];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 whitespace-nowrap rounded-full py-0.5 pl-1.5 pr-2 text-[11px] font-semibold",
        badgeCls,
        className,
      )}
    >
      <Icon
        size={12}
        strokeWidth={2.5}
        aria-hidden
        className={kind === "avulsa" ? "fill-current" : undefined}
      />
      {label}
    </span>
  );
}
