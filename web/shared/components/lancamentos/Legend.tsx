import { cn } from "../../lib/utils";

export type LegendSwatch = "paid" | "current" | "pending" | "solid" | "new" | "cut";

export interface LegendItem {
  label: string;
  swatch: LegendSwatch;
  /** Cor de fundo para `solid` e `new`. */
  color?: string;
}

const SWATCH: Record<LegendSwatch, string> = {
  paid: "bg-tipo-parcelada",
  current: "border-2 border-red bg-white",
  pending: "border border-dashed border-[#c9a888] bg-white",
  solid: "",
  new: "bg-stripes",
  cut: "bg-hatch border border-dashed border-[#cfc8c1]",
};

export function Legend({ items }: { items: LegendItem[] }) {
  return (
    <ul aria-label="Legenda" className="flex gap-3 text-[11.5px] text-text-muted">
      {items.map((item) => (
        <li key={item.label} className="flex items-center gap-[5px]">
          <i
            className={cn("inline-block h-2.5 w-2.5 rounded-[3px]", SWATCH[item.swatch])}
            style={item.color ? { backgroundColor: item.color } : undefined}
          />
          {item.label}
        </li>
      ))}
    </ul>
  );
}
