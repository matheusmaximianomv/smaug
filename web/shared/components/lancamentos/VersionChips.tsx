export interface VersionChip {
  key: string;
  /** "desde Jan/26". */
  since: string;
  amount: string;
  color: string;
  isCurrent: boolean;
}

/** Versões em ordem cronológica, com a pílula "Vigente" na versão em vigor no mês corrente. */
export function VersionChips({ versions }: { versions: VersionChip[] }) {
  return (
    <ul aria-label="Versões" className="mt-[18px] flex flex-wrap gap-2">
      {versions.map((version) => (
        <li
          key={version.key}
          className="flex items-center gap-2 rounded-lg border border-border px-2.5 py-1.5 text-xs text-text-muted"
        >
          <i className="h-3 w-3 rounded-[3px]" style={{ backgroundColor: version.color }} />
          {version.since}
          <b className="tabular-nums text-text">{version.amount}</b>
          {version.isCurrent && (
            <span className="rounded-full bg-red px-2 py-px text-[10.5px] font-bold text-white">
              Vigente
            </span>
          )}
        </li>
      ))}
    </ul>
  );
}
