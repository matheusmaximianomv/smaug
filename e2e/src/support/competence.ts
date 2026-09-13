export interface Competence {
  year: number;
  month: number;
}

/**
 * UTC em toda parte, para bater com `MonthlyCompetence.isPastMonth()` do domínio
 * (que usa getUTC*). O front usa getMonth() local, então numa TZ negativa os dois
 * discordariam numa janela da virada do mês — o Playwright roda com
 * `timezoneId: "UTC"` justamente para fechar essa brecha.
 */
function nowUtc(): Competence {
  const d = new Date();
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1 };
}

/**
 * A competência base é congelada UMA vez no globalSetup e propagada por env.
 * Os workers são forkados depois e herdam, então todos concordam mesmo que a
 * execução cruze a virada do mês.
 */
export function baseCompetence(): Competence {
  const frozen = process.env.E2E_BASE_COMPETENCE;
  return frozen ? (JSON.parse(frozen) as Competence) : nowUtc();
}

export function addMonths({ year, month }: Competence, n: number): Competence {
  const d = new Date(Date.UTC(year, month - 1 + n, 1));
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1 };
}

export interface CompetenceKit {
  current: Competence;
  next: Competence;
  in2: Competence;
  /** Só para navegação e validação client-side — a API rejeita criar no passado. */
  prev: Competence;
  plus: (n: number) => Competence;
  api: (c: Competence) => { competenceYear: number; competenceMonth: number };
}

export function competenceKit(): CompetenceKit {
  const current = baseCompetence();
  return {
    current,
    next: addMonths(current, 1),
    in2: addMonths(current, 2),
    prev: addMonths(current, -1),
    plus: (n: number) => addMonths(current, n),
    api: (c: Competence) => ({ competenceYear: c.year, competenceMonth: c.month }),
  };
}
