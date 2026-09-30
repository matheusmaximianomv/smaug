interface CodeChipProps {
  children: string;
}

/**
 * Nome de coluna ou caractere do formato CSV citado no meio de um parágrafo.
 * O protótipo trata `code` como uma pastilha (`.s-hint-sm code`, `.s-drop-sub code`,
 * `.s-preview-foot code` compartilham a mesma regra); sem a moldura o monoespaçado
 * some no meio do texto corrido.
 */
export function CodeChip({ children }: CodeChipProps) {
  return (
    <code className="rounded-[3px] border border-border bg-bg px-1 font-mono text-[11px]">
      {children}
    </code>
  );
}
