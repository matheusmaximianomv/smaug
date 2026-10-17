import { cn } from "../../lib/utils";
import { TONE_TEXT, type EntryKind, type Tone } from "../../lib/entry-types";
import { TypeBadge } from "../TypeBadge";

interface EntryDetailHeaderProps {
  kind: EntryKind;
  /** Trilha do modo de ação: "Nova versão" ou "Encerrar". */
  crumb?: string;
  title: string;
  subtitle: string[];
  value: string;
  valueCaption: string;
  tone: Tone;
}

/** Cabeçalho da Ficha; até 768 px o valor desce para baixo do título. */
export function EntryDetailHeader({
  kind,
  crumb,
  title,
  subtitle,
  value,
  valueCaption,
  tone,
}: EntryDetailHeaderProps) {
  return (
    <div className="flex items-start gap-4 max-md:flex-col">
      <div className="flex min-w-0 flex-1 flex-col gap-[5px]">
        <div className="flex items-center gap-1.5">
          <TypeBadge type={kind} />
          {crumb && <span className="text-xs font-bold text-text-muted">› {crumb}</span>}
        </div>
        <p className="text-xl font-bold">{title}</p>
        {subtitle.length > 0 && (
          <div className="flex flex-wrap items-center gap-3 text-[12.5px] text-text-muted">
            {subtitle.map((part) => (
              <span key={part}>{part}</span>
            ))}
          </div>
        )}
      </div>
      <div className="pt-4 text-right max-md:pt-0 max-md:text-left">
        <b className={cn("block text-2xl font-bold leading-tight tabular-nums", TONE_TEXT[tone])}>
          {value}
        </b>
        <span className="text-xs text-text-muted">{valueCaption}</span>
      </div>
    </div>
  );
}
