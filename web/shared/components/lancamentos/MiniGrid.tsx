interface MiniGridProps {
  /** Seis células; cor da célula ou `null` para vazia. */
  cells: (string | null)[];
}

/** Ilustração do padrão do tipo nos cartões da etapa Tipo. */
export function MiniGrid({ cells }: MiniGridProps) {
  return (
    <div className="grid grid-cols-6 gap-[3px]" aria-hidden>
      {cells.map((color, i) => (
        <span
          key={i}
          className="h-4 rounded-[3px] border border-border bg-bg"
          style={color ? { backgroundColor: color, borderColor: color } : undefined}
        />
      ))}
    </div>
  );
}
