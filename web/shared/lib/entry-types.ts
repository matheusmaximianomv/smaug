import { ChartNoAxesColumnDecreasing, Circle, Minus, Repeat, type LucideIcon } from "lucide-react";

export type EntryKind = "avulsa" | "parcelada" | "recorrente" | "fixa";

interface EntryKindStyle {
  label: string;
  /** Hex usado onde a classe Tailwind não alcança: `style` inline e `color-mix`. */
  color: string;
  /** Classe do ponto da linha e da legenda. */
  dotCls: string;
  /** Classe do selo (fundo claro + texto na cor do tipo). */
  badgeCls: string;
  icon: LucideIcon;
}

/**
 * Fonte única de cor, rótulo e ícone por tipo. As classes são literais completos
 * (e não `bg-tipo-${kind}`) porque o Tailwind só gera o que encontra escrito por
 * inteiro no código-fonte.
 */
export const ENTRY_KIND: Record<EntryKind, EntryKindStyle> = {
  avulsa: {
    label: "Avulsa",
    color: "#3b5bdb",
    dotCls: "bg-tipo-avulsa",
    badgeCls: "bg-tipo-avulsa-light text-tipo-avulsa",
    icon: Circle,
  },
  parcelada: {
    label: "Parcelada",
    color: "#c2660a",
    dotCls: "bg-tipo-parcelada",
    badgeCls: "bg-tipo-parcelada-light text-tipo-parcelada",
    icon: ChartNoAxesColumnDecreasing,
  },
  recorrente: {
    label: "Recorrente",
    color: "#6841c7",
    dotCls: "bg-tipo-recorrente",
    badgeCls: "bg-tipo-recorrente-light text-tipo-recorrente",
    icon: Repeat,
  },
  fixa: {
    label: "Fixa",
    color: "#2d7a4a",
    dotCls: "bg-tipo-fixa",
    badgeCls: "bg-tipo-fixa-light text-tipo-fixa",
    icon: Minus,
  },
};

/**
 * Tom da cor do tipo para a versão `index` (0 = mais antiga) de uma série com
 * `total` versões: de 35% a 100% da cor misturada ao branco, para que a versão
 * mais recente seja sempre a mais forte.
 */
export function versionTint(kind: EntryKind, index: number, total: number): string {
  const percent = Math.round(35 + (65 * (index + 1)) / total);
  return `color-mix(in oklab, ${ENTRY_KIND[kind].color} ${percent}%, white)`;
}

/** Natureza do lançamento: decide a cor do valor (vermelho em despesas, verde em receitas). */
export type Tone = "expense" | "revenue";

export const TONE_TEXT: Record<Tone, string> = {
  expense: "text-red",
  revenue: "text-green",
};
